# ai_engine.py — Local AI processing via llama-server
#
# This is the HEART of the refactor. The original study-llama used:
#   - LlamaCloud's LlamaClassify (paid API) for file classification
#   - LlamaCloud's LlamaExtract (paid API) for structured extraction
#   - OpenAI's embedding API (paid) for vector embeddings
#
# We replace ALL of that with direct calls to YOUR LOCAL llama-server,
# using the same openai library from Modules 2-4. No cloud, no cost.
#
# Original files replaced:
#   - classify_and_extract/workflow.py
#   - classify_and_extract/resources.py
#   - classify_and_extract/models.py
#   - classify_and_extract/events.py
#   - classify_and_extract/utils.py
#   - vectordb/embeddings.py

import json
from openai import OpenAI
from config import LLAMA_SERVER_URL, LLAMA_API_KEY, AI_MODEL, AI_TEMPERATURE

# ── Initialize the client (same pattern from Module 2) ────────────────
client = OpenAI(
    base_url=LLAMA_SERVER_URL,
    api_key=LLAMA_API_KEY
)


def classify_note(text, categories):
    """Classify a note into one of the user's categories.

    Replaces: LlamaClassify.aclassify_file_ids()
    The original used LlamaCloud's proprietary classification API.
    We achieve the same result with a carefully crafted prompt.

    Args:
        text: The content of the uploaded note.
        categories: List of dicts with 'name', 'type', 'description' keys.

    Returns:
        The category type string, or None if classification fails.
    """
    if not categories:
        return None

    # Build a category list for the prompt
    category_descriptions = "\n".join(
        f"- Type: \"{cat['type']}\" — {cat['description']}"
        for cat in categories
    )

    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a document classifier. Given a document and a list of "
                    "categories, respond with ONLY the category type that best matches "
                    "the document. If none match, respond with \"unknown\".\n\n"
                    "Available categories:\n"
                    f"{category_descriptions}"
                )
            },
            {
                "role": "user",
                "content": f"Classify this document:\n\n{text[:3000]}"
                # Limit to 3000 chars to stay within context window
            }
        ],
        temperature=0.1  # Very low — we want consistent classification
    )

    result = response.choices[0].message.content.strip().strip('"').strip("'")
    # Verify the result matches a known category
    known_types = [cat["type"] for cat in categories]
    for known_type in known_types:
        if known_type.lower() in result.lower():
            return known_type
    return result if result.lower() != "unknown" else None


def extract_study_notes(text):
    """Extract a structured summary and FAQs from note content.

    Replaces: LlamaExtract with StudyNotes schema
    The original used LlamaCloud's extraction API with a Pydantic model.
    We achieve the same result by asking llama-server to return JSON.

    Args:
        text: The content of the uploaded note.

    Returns:
        Dict with 'summary' (str) and 'faqs' (list of {question, answer}).
    """
    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a study assistant that extracts key information from "
                    "student notes. Given a document, produce a JSON object with:\n"
                    "1. \"summary\": A concise paragraph summarizing the main points.\n"
                    "2. \"faqs\": An array of 3-5 objects, each with \"question\" and "
                    "\"answer\" fields — potential exam questions based on the notes.\n\n"
                    "Respond with ONLY valid JSON, no other text."
                )
            },
            {
                "role": "user",
                "content": f"Extract study notes from this document:\n\n{text[:4000]}"
            }
        ],
        temperature=AI_TEMPERATURE
    )

    raw = response.choices[0].message.content.strip()

    # Try to parse JSON from the response
    # Sometimes the model wraps JSON in ```json ... ``` blocks
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1])

    try:
        result = json.loads(raw)
        # Validate expected structure
        if "summary" not in result:
            result["summary"] = "Summary could not be extracted."
        if "faqs" not in result:
            result["faqs"] = []
        return result
    except json.JSONDecodeError:
        # If JSON parsing fails, return the raw text as a summary
        return {
            "summary": raw[:500],
            "faqs": []
        }


def generate_embeddings(texts):
    """Generate vector embeddings for a list of texts.

    Replaces: OpenAIEmbedder using OpenAI's cloud API
    We use the SAME openai library, but pointed at llama-server's
    /v1/embeddings endpoint. The server must be started with --embedding.

    NOTE: If your llama-server doesn't support embeddings, this function
    falls back to a simple word-frequency approach.

    Args:
        texts: List of strings to embed.

    Returns:
        List of embedding vectors (list of floats).
    """
    try:
        response = client.embeddings.create(
            input=texts,
            model=AI_MODEL
        )
        return [item.embedding for item in response.data]
    except Exception:
        # Fallback: llama-server may not have embeddings enabled.
        # ChromaDB can use its own default embedding function instead.
        return None


def chat_with_notes(question, notes_context, history=None):
    """Ask a question about notes — same pattern from Module 4.

    This powers the "Review" / search chat feature.

    Args:
        question: The user's question.
        notes_context: Relevant note content to include.
        history: Optional conversation history list.

    Returns:
        The AI's response string.
    """
    messages = [
        {
            "role": "system",
            "content": (
                "You are a study assistant. Answer the student's question "
                "using ONLY the provided notes. If the answer isn't in the "
                "notes, say so clearly.\n\n"
                f"NOTES:\n{notes_context}"
            )
        }
    ]

    if history:
        messages.extend(history)

    messages.append({"role": "user", "content": question})

    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=messages,
        temperature=0.3
    )

    return response.choices[0].message.content


def chat_with_study_buddy(user_message, conversation_history, notes_context=""):
    """Study Buddy agent interaction for the webapp.
    
    Replaces the CLI while-loop from Module 4. 
    Maintains memory through the conversation_history array.
    """
    system_instructions = f"""You are a helpful high school study assistant. 
Your job is to help the student understand and memorize the material in 
their notes. Follow these rules:
1. Try to answer questions using the notes provided below.
2. If the student asks something not covered in the notes, say so clearly, but you can still try to help using your general knowledge.
3. Use simple, clear language appropriate for a high school student.
4. When generating flashcards, format them with clear Q: and A: labels.

STUDENT'S NOTES:
{notes_context}"""

    # Start with the system prompt
    messages = [{"role": "system", "content": system_instructions}]
    
    # Add history
    if conversation_history:
        messages.extend(conversation_history)
        
    # Add the current user message
    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model=AI_MODEL,
            messages=messages,
            temperature=0.3
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"⚠️ Error connecting to AI: {str(e)}"

