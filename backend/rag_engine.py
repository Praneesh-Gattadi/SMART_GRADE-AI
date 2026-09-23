"""
Retrieval-Augmented Generation (RAG) Engine for SmartGrade Pro
Handles chunking large documents and storing/retrieving from an in-memory/Docker Qdrant database.
"""
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import os
import uuid
import sys
import uuid

import google.generativeai as genai

# Setup Qdrant Client. In production, this points to a Docker container.
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
try:
    # Try connecting to Docker Qdrant
    client = QdrantClient(host=QDRANT_HOST, port=6333)
except Exception:
    # Fallback to in-memory local DB if Docker isn't running
    client = QdrantClient(":memory:")

COLLECTION_NAME = "smartgrade_knowledge"

def get_gemini_embedding(text: str, api_key: str) -> list[float]:
    """Generates an embedding vector using Google Gemini's embedding model."""
    genai.configure(api_key=api_key)
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document"
    )
    return result['embedding']

def chunk_text(text: str, chunk_size=500, overlap=50) -> list[str]:
    """Splits a massive text into overlapping chunks."""
    words = text.split()
    chunks = []
    
    for i in range(0, len(words), chunk_size - overlap):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
    return chunks

def store_knowledge_base(kb_text: str, api_key: str) -> str:
    """Chunks the KB, embeds it, stores it in Qdrant, and returns the session_id."""
    session_id = str(uuid.uuid4())
    
    # Ensure collection exists
    try:
        client.get_collection(collection_name=COLLECTION_NAME)
    except Exception:
        # Create collection if it doesn't exist (Gemini text-embedding-004 uses 768 dimensions)
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=768, distance=Distance.COSINE),
        )

    chunks = chunk_text(kb_text)
    points = []
    
    print(f"Creating RAG embeddings for {len(chunks)} text chunks...")
    for idx, chunk in enumerate(chunks):
        embedding = get_gemini_embedding(chunk, api_key)
        
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=embedding,
            payload={"session_id": session_id, "text": chunk, "chunk_index": idx}
        )
        points.append(point)
        
    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points
    )
    return session_id

def retrieve_relevant_context(query_text: str, session_id: str, api_key: str, top_k: int = 3) -> str:
    """Retrieves the top K most relevant text chunks from Qdrant based on the student's answer."""
    query_vector = get_gemini_embedding(query_text, api_key)
    
    # Search the vector database for matching chunks belonging to this grading session
    search_result = client.search(
        collection_name=COLLECTION_NAME,
        query_vector=query_vector,
        query_filter={
            "must": [
                {
                    "key": "session_id",
                    "match": {"value": session_id}
                }
            ]
        },
        limit=top_k
    )
    
    if not search_result:
        return ""
        
    extracted_chunks = [hit.payload["text"] for hit in search_result]
    joined_context = "\n...\n".join(extracted_chunks)
    
    return f"RELEVANT KNOWLEDGE BASE SECTIONS FOR THIS ANSWER:\n{joined_context}"
