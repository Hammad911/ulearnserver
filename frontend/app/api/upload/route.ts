import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const indexName = formData.get('indexName') as string;
    
    if (!file || !indexName) {
      return NextResponse.json(
        { error: 'File and index name are required' },
        { status: 400 }
      );
    }

    // Validate index name format
    if (!/^[a-z0-9-]+$/.test(indexName)) {
      return NextResponse.json(
        { error: 'Index name must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Create a new FormData instance for the FastAPI server
    const apiFormData = new FormData();
    apiFormData.append('file', file);
    apiFormData.append('index_name', indexName);  // Note: using snake_case for FastAPI

    // Use NEXT_PUBLIC_API_URL for the backend URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/upload`, {
      method: 'POST',
      body: apiFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail || 'Failed to process file' },
        { status: response.status }
      );
    }

    // Return the streaming response
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 