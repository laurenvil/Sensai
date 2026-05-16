# vector_store.py — Local vector database using ChromaDB
#
# This replaces the original study-llama's Qdrant Cloud integration.
# ChromaDB runs entirely in-process — just `pip install chromadb`.
# No cloud account, no API key, no server to manage.
#
# Original files replaced:
#   - src/study_llama/vectordb/vectordb.py  (SummaryVectorDB, FaqsVectorDB)
#   - src/study_llama/vectordb/embeddings.py (OpenAIEmbedder)
#   - src/study_llama/search/workflow.py    (SearchWorkflow)
#   - src/study_llama/search/events.py      (SearchInputEvent, SearchOutputEvent)
#   - src/study_llama/search/resources.py   (get_vector_db_* factories)
#   - scripts/create_qdrant_collections.py  (collection setup)

import chromadb
from config import CHROMA_PERSIST_DIR

# ── Initialize ChromaDB ──────────────────────────────────────────────
# ChromaDB auto-creates collections — no setup script needed!
# (This replaces scripts/create_qdrant_collections.py entirely)
_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

# Two collections, mirroring the original Qdrant setup:
# - "summaries" for document summaries
# - "faqs" for question/answer pairs
_summaries_collection = _client.get_or_create_collection(
    name="summaries",
    metadata={"hnsw:space": "cosine"}
)

_faqs_collection = _client.get_or_create_collection(
    name="faqs",
    metadata={"hnsw:space": "cosine"}
)


def store_summary(summary, username, category, file_name):
    """Store a document summary for semantic search.

    Replaces: SummaryVectorDB.upload() from vectordb.py

    ChromaDB handles embedding automatically using its built-in
    sentence-transformer model — no OpenAI API needed.
    """
    import uuid
    doc_id = str(uuid.uuid4())

    _summaries_collection.add(
        documents=[summary],
        metadatas=[{
            "username": username,
            "category": category or "",
            "file_name": file_name,
            "type": "summary"
        }],
        ids=[doc_id]
    )


def store_faqs(questions, answers, username, category, file_name):
    """Store question/answer pairs for semantic search.

    Replaces: FaqsVectorDB.upload() from vectordb.py

    Each question is stored as a document (for similarity matching),
    with the answer stored in metadata.
    """
    import uuid

    if not questions:
        return

    ids = [str(uuid.uuid4()) for _ in questions]
    metadatas = [
        {
            "username": username,
            "category": category or "",
            "file_name": file_name,
            "answer": answers[i] if i < len(answers) else "",
            "type": "faq"
        }
        for i in range(len(questions))
    ]

    _faqs_collection.add(
        documents=questions,
        metadatas=metadatas,
        ids=ids
    )


def search_summaries(query, username, category=None, file_name=None, n_results=5):
    """Search for relevant document summaries.

    Replaces: SummaryVectorDB.search() + SearchWorkflow (summary branch)

    Args:
        query: The search text.
        username: Filter results to this user.
        category: Optional category filter.
        file_name: Optional file name filter.
        n_results: Maximum results to return.

    Returns:
        List of dicts with 'text', 'file_name', 'category', 'distance'.
    """
    where_filter = {"username": username}
    if category:
        where_filter = {"$and": [
            {"username": username},
            {"category": category}
        ]}
    if file_name:
        conditions = [{"username": username}, {"file_name": file_name}]
        if category:
            conditions.append({"category": category})
        where_filter = {"$and": conditions}

    try:
        results = _summaries_collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_filter
        )
    except Exception:
        # If the collection is empty or filter fails, return empty
        return []

    return _format_results(results, result_type="summary")


def search_faqs(query, username, category=None, file_name=None, n_results=5):
    """Search for relevant FAQ entries.

    Replaces: FaqsVectorDB.search() + SearchWorkflow (faqs branch)

    Returns:
        List of dicts with 'text' (answer), 'question', 'file_name', 'category', 'distance'.
    """
    where_filter = {"username": username}
    if category:
        where_filter = {"$and": [
            {"username": username},
            {"category": category}
        ]}
    if file_name:
        conditions = [{"username": username}, {"file_name": file_name}]
        if category:
            conditions.append({"category": category})
        where_filter = {"$and": conditions}

    try:
        results = _faqs_collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_filter
        )
    except Exception:
        return []

    return _format_results(results, result_type="faq")


def _format_results(results, result_type="summary"):
    """Format ChromaDB query results into a clean list of dicts."""
    formatted = []
    if not results or not results.get("documents"):
        return formatted

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0] if results.get("distances") else [0] * len(documents)

    for i, doc in enumerate(documents):
        meta = metadatas[i] if i < len(metadatas) else {}
        entry = {
            "result_type": result_type,
            "file_name": meta.get("file_name", ""),
            "category": meta.get("category", ""),
            "distance": distances[i] if i < len(distances) else 0,
        }
        if result_type == "faq":
            entry["text"] = meta.get("answer", "")
            entry["question"] = doc
        else:
            entry["text"] = doc

        formatted.append(entry)

    return formatted


def delete_by_file(file_name, username):
    """Remove all vectors associated with a file.

    Called when a user deletes a note.
    """
    for collection in (_summaries_collection, _faqs_collection):
        try:
            # Get IDs matching this file
            results = collection.get(
                where={"$and": [
                    {"username": username},
                    {"file_name": file_name}
                ]}
            )
            if results and results["ids"]:
                collection.delete(ids=results["ids"])
        except Exception:
            pass
