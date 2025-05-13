from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
import os
import json
from typing import Optional
import asyncio
from .embedder import EnhancedBookEmbedder

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize the embedder
embedder = None

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    index_name: str = Form(...)
):
    global embedder
    try:
        # Create uploads directory if it doesn't exist
        os.makedirs("uploads", exist_ok=True)
        
        # Save the uploaded file
        file_path = f"uploads/{file.filename}"
        with open(file_path, "wb") as buffer:
            content = await file.read()
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
                os.remove(file_path)
                
                # Send completion message
                yield f"data: {json.dumps({'status': 'complete', 'book_id': book_id})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return StreamingResponse(
            process_file(),
            media_type="text/event-stream"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def search(
    query: str,
    index_name: Optional[str] = None
):
    global embedder
    try:
        if not embedder and index_name:
            embedder = EnhancedBookEmbedder(index_name=index_name)
        elif not embedder:
            raise HTTPException(status_code=400, detail="No index selected")
        
        results = embedder.semantic_search(query)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mcq")
async def generate_mcq(
    query: str,
    index_name: Optional[str] = None
):
    global embedder
    try:
        if not embedder and index_name:
            embedder = EnhancedBookEmbedder(index_name=index_name)
        elif not embedder:
            raise HTTPException(status_code=400, detail="No index selected")
        
        mcqs = embedder.search_mcqs(query)
        return mcqs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 