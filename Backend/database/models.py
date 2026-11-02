from datetime import datetime, timezone
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database.connection import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    credits: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    items: Mapped[list["Item"]] = relationship(back_populates="owner")


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(80), default="Other")
    condition: Mapped[str] = mapped_column(String(40), default="Good")
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    image_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True, default=None
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    owner: Mapped["User"] = relationship(back_populates="items")


class BorrowRequest(Base):
    __tablename__ = "borrow_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    borrower_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    requested_days: Mapped[int] = mapped_column(Integer, default=1)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )


class Notification(Base):
    __tablename__ = "notifications"

    __table_args__ = (
        UniqueConstraint(
            "event_key",
            name="uq_notifications_event_key",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    notification_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    related_request_id: Mapped[int | None] = mapped_column(
        ForeignKey("borrow_requests.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    event_key: Mapped[str] = mapped_column(String(180), nullable=False)
    is_read: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True,
    )


class AssistantConversation(Base):
    __tablename__ = "assistant_conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(160), default="New conversation", nullable=False
    )

    pending_action: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, default=None
    )

    assistant_context: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, default=None
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
        index=True,
    )

    messages: Mapped[list["AssistantMessage"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="AssistantMessage.created_at",
    )


class AssistantMessage(Base):
    __tablename__ = "assistant_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("assistant_conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role: Mapped[str] = mapped_column(String(20), nullable=False)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    intent: Mapped[str | None] = mapped_column(String(40), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    conversation: Mapped["AssistantConversation"] = relationship(
        back_populates="messages"
    )


class PolicyChunk(Base):
    __tablename__ = "policy_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    embedding: Mapped[list[float]] = mapped_column(Vector(384), nullable=False)

    source: Mapped[str] = mapped_column(String(255), nullable=False)

    page: Mapped[int] = mapped_column(Integer, nullable=False)

    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )


class AssistantMemory(Base):
    """
    Persistent, user-scoped memory for CampusLoop AI.

    Memory is separate from conversation messages:
    - Messages store what was said.
    - Memory stores reusable facts and preferences.
    """

    __tablename__ = "assistant_memories"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "memory_key",
            name="uq_assistant_memory_user_key",
        ),
        Index(
            "ix_assistant_memory_user_category",
            "user_id",
            "category",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    memory_key: Mapped[str] = mapped_column(
        String(160),
        nullable=False,
    )

    memory_value: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        default="preference",
        nullable=False,
    )

    source_conversation_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "assistant_conversations.id",
            ondelete="SET NULL",
        ),
        nullable=True,
    )

    confidence: Mapped[float] = mapped_column(
        default=1.0,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
