from __future__ import annotations
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path
from typing import Any, Generator

from pgvector.sqlalchemy import Vector
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from sentence_transformers import SentenceTransformer
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from database.connection import SessionLocal
from database.models import PolicyChunk
import os
from dotenv import load_dotenv

load_dotenv()


# CONFIGURATION --

BASE_DIR = Path(__file__).resolve().parent.parent

POLICY_PDF_PATH = Path(os.getenv("POLICY_PDF_PATH"))

if not POLICY_PDF_PATH.is_absolute():
    POLICY_PDF_PATH = BASE_DIR / POLICY_PDF_PATH

POLICY_PDF_PATH = POLICY_PDF_PATH.resolve()


CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

DEFAULT_TOP_K = 4
DEFAULT_MAX_DISTANCE = 0.65


EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME")

EMBEDDING_DIMENSION = os.getenv("EMBEDDING_DIMENSION")


# DATABASE SESSION --


@contextmanager
def _session_scope(
    db: Session | None = None,
) -> Generator[Session, None, None]:
    """
    Reuse an existing database session when provided.
    Otherwise, create and close a new session.
    """

    if db is not None:
        yield db
        return

    session = SessionLocal()

    try:
        yield session
    finally:
        session.close()


# EMBEDDING MODEL --


@lru_cache(maxsize=1)
def create_embeddings() -> SentenceTransformer:
    """
    Load the embedding model once and reuse it.

    Model output dimension: 384
    """

    return SentenceTransformer(EMBEDDING_MODEL_NAME)


def _embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Convert multiple text chunks into embeddings.
    """

    if not texts:
        return []

    model = create_embeddings()

    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    return embeddings.tolist()


def _embed_query(query: str) -> list[float]:
    """
    Convert a user query into a single embedding.
    """

    model = create_embeddings()

    embedding = model.encode(
        query,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )

    return embedding.tolist()


# PDF LOADING --


def load_policy_document():
    """
    Load the CampusLoop policy PDF.
    """

    if not POLICY_PDF_PATH.exists():
        raise FileNotFoundError(f"Policy PDF not found: {POLICY_PDF_PATH}")

    loader = PyPDFLoader(str(POLICY_PDF_PATH))

    documents = loader.load()

    if not documents:
        raise ValueError("No readable text found in the policy PDF.")

    return documents


# TEXT CHUNKING --


def split_documents(documents):
    """
    Split PDF pages into smaller overlapping text chunks.
    """

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = splitter.split_documents(documents)

    chunks = [chunk for chunk in chunks if chunk.page_content.strip()]

    return chunks


# POLICY DOCUMENT INGESTION --


def ingest_policy_document(
    force: bool = False,
    db: Session | None = None,
) -> dict[str, Any]:
    """
    Read the policy PDF, split it into chunks,
    generate embeddings and store them in PostgreSQL.

    force=False:
        Skip ingestion if this PDF is already stored.

    force=True:
        Delete existing chunks for this PDF and ingest again.
    """

    source_name = POLICY_PDF_PATH.name

    with _session_scope(db) as session:

        total = (
            session.scalar(
                select(func.count())
                .select_from(PolicyChunk)
                .where(PolicyChunk.source == source_name)
            )
            or 0
        )

        if total > 0 and not force:
            return {
                "status": "skipped",
                "message": "Policy document is already ingested.",
                "source": source_name,
                "existing_chunks": total,
            }

        try:
            if force and total > 0:
                session.execute(
                    delete(PolicyChunk).where(PolicyChunk.source == source_name)
                )
                session.commit()

            # Load PDF --
            documents = load_policy_document()

            # Split PDF text --
            chunks = split_documents(documents)

            if not chunks:
                raise ValueError("No valid text chunks were generated.")

            # Generate embeddings --
            texts = [chunk.page_content for chunk in chunks]

            embeddings = _embed_texts(texts)

            # Prepare database records --
            records = []

            for index, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                page_number = chunk.metadata.get("page", 0)

                page_number = int(page_number) + 1

                record = PolicyChunk(
                    content=chunk.page_content,
                    embedding=embedding,
                    source=source_name,
                    page=page_number,
                    chunk_index=index,
                )

                records.append(record)

            batch_size = 100

            for start in range(0, len(records), batch_size):
                batch = records[start : start + batch_size]
                session.add_all(batch)
                session.flush()

            session.commit()

            return {
                "status": "success",
                "message": "Policy document ingested successfully.",
                "source": source_name,
                "total_pages": len(documents),
                "total_chunks": len(records),
            }

        except Exception:
            session.rollback()
            raise


# SEMANTIC POLICY RETRIEVAL --


def retrieve_policy_context(
    question: str,
    db: Session | None = None,
    top_k: int = DEFAULT_TOP_K,
    max_distance: float = DEFAULT_MAX_DISTANCE,
) -> list[dict[str, Any]]:
    """
    Retrieve the most relevant policy chunks using
    PostgreSQL pgvector cosine distance.

    Returns a list of dictionaries containing:
        content
        source
        page
        chunk_index
        distance
    """

    if not question or not question.strip():
        return []

    if top_k < 1:
        return []

    query_embedding = _embed_query(question.strip())

    with _session_scope(db) as session:

        distance_expression = PolicyChunk.embedding.cosine_distance(query_embedding)

        statement = (
            select(
                PolicyChunk,
                distance_expression.label("distance"),
            )
            .order_by(distance_expression)
            .limit(top_k)
        )

        results = session.execute(statement).all()

        context = []

        for policy_chunk, distance in results:

            distance = float(distance)

            if distance > max_distance:
                continue

            context.append(
                {
                    "content": policy_chunk.content,
                    "source": policy_chunk.source,
                    "page": policy_chunk.page,
                    "chunk_index": policy_chunk.chunk_index,
                    "distance": distance,
                }
            )

        return context


# FORMAT RETRIEVED CONTEXT --


def format_context(
    contexts: list[dict[str, Any]],
) -> str:
    """
    Convert retrieved policy chunks into readable text
    for the policy agent's LLM prompt.
    """

    if not contexts:
        return "No relevant policy information was found."

    formatted_parts = []

    for index, item in enumerate(contexts, start=1):

        content = item.get("content", "")
        source = item.get("source", "Unknown")
        page = item.get("page", "Unknown")

        formatted_parts.append(f"""
Policy Reference {index}
Source: {source}
Page: {page}

Content:
{content}
""".strip())

    return "\n\n---\n\n".join(formatted_parts)


# CHECK STORED POLICY CHUNKS --

def get_policy_chunk_count(
    db: Session | None = None,
) -> int:
    """
    Return the number of stored policy chunks.
    """

    with _session_scope(db) as session:

        total = session.scalar(select(func.count()).select_from(PolicyChunk))

        return int(total or 0)
