from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import uvicorn
import os
import json
from typing import Optional
import asyncio
from src.core.embedder import EnhancedBookEmbedder
from src.core.monitoring import track_request, logger
from src.core.cache import user_cache, search_cache, chat_cache
import re

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="uLearn API",
    description="API for document processing and semantic search",
    version="1.0.0"
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS
origins = [
    "http://localhost:3000",  # For local development
    "https://ulearnserver.vercel.app"  # Your frontend domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure this based on your domain
)

# Add request tracking middleware
@app.middleware("http")
async def add_monitoring(request: Request, call_next):
    return await track_request(request, call_next)

# Initialize the embedder
embedder = None

@app.get("/")
async def root(request: Request):
    """Root endpoint providing API information"""
    return JSONResponse({
        "name": "uLearn API",
        "version": "1.0.0",
        "endpoints": {
            "/": "API information (this endpoint)",
            "/docs": "Interactive API documentation",
            "/upload": "Upload and process documents",
            "/search": "Perform semantic search",
            "/mcq": "Generate MCQs from documents"
        },
        "status": "running"
    })

@app.post("/upload")
@limiter.limit("10/minute")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    index_name: str = Form(...)
):
    global embedder
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = os.path.join(os.getcwd(), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save the uploaded file
        file_path = os.path.join(upload_dir, file.filename)
        content = await file.read()
        
        # Write file in chunks to handle large files
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Initialize embedder with the new index
        embedder = EnhancedBookEmbedder(index_name=index_name)
        
        # Process the file
        async def process_file():
            try:
                # Process the file and yield progress updates
                book_id = embedder.process_document(file_path)
                if book_id:
                    yield f"data: {json.dumps({'status': 'processing', 'book_id': book_id})}\n\n"
                else:
                    yield f"data: {json.dumps({'error': 'Failed to process document'})}\n\n"
                
                # Clean up the uploaded file
                try:
                    os.remove(file_path)
                except Exception as e:
                    logger.warning(f"Failed to remove temporary file: {e}")
                
                # Send completion message
                yield f"data: {json.dumps({'status': 'complete', 'book_id': book_id})}\n\n"
            except Exception as e:
                logger.error(f"Error processing file: {str(e)}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            process_file(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
        
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
@limiter.limit("30/minute")
async def search(
    request: Request,
    query: str = Form(...),
    index_name: Optional[str] = Form(None)
):
    global embedder
    try:
        # Format index name for Pinecone (lowercase, alphanumeric + hyphens)
        if index_name:
            index_name = re.sub(r'[^a-z0-9-]', '-', index_name.lower())
        
        # Check cache first
        cache_key = f"{query}:{index_name}"
        cached_result = search_cache.get(cache_key)
        if cached_result:
            return cached_result

        if not embedder and index_name:
            embedder = EnhancedBookEmbedder(index_name=index_name)
        elif not embedder:
            raise HTTPException(status_code=400, detail="No index selected")
        
        results = embedder.semantic_search(query)
        
        # Cache the results
        search_cache.set(cache_key, results)
        
        return results
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mcq")
@limiter.limit("20/minute")
async def generate_mcq(
    request: Request,
    query: str,
    index_name: Optional[str] = None
):
    global embedder
    try:
        # Check cache first
        cache_key = f"{query}:{index_name}"
        cached_result = search_cache.get(cache_key)
        if cached_result:
            return cached_result

        if not embedder and index_name:
            embedder = EnhancedBookEmbedder(index_name=index_name)
        elif not embedder:
            raise HTTPException(status_code=400, detail="No index selected")
        
        mcqs = embedder.search_mcqs(query)
        
        # Cache the results
        search_cache.set(cache_key, mcqs)
        
        return mcqs
    except Exception as e:
        logger.error(f"MCQ generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 