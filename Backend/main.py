import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Literal

from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Query,
    File,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import select, or_, func, update, delete
from sqlalchemy.orm import Session
from supabase import create_client

from config import settings
from database.connection import init_db, get_db
from database.models import (
    AssistantConversation,
    AssistantMessage,
    BorrowRequest,
    Item,
    Notification,
    User,
)
from multi_agent.Graph import run_assistant
from multi_agent.State import CampusLoopState
from security.auth import router as auth_router, get_current_user

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="CampusLoop AI API",
    description=(
        "Campus item borrowing and return platform " "with a multi-agent AI assistant."
    ),
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    auth_router,
    prefix="/api/auth",
    tags=["Authentication"],
)


def add_notification(
    db: Session,
    *,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    request_id: int,
    event_key: str,
) -> None:
    db.add(
        Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            related_request_id=request_id,
            event_key=event_key,
            is_read=False,
        )
    )


def cleanup_read_notifications(
    db: Session,
    user_id: int,
) -> None:
    """Keep unread notifications and the 10 newest read notifications."""

    db.flush()

    old_read_ids = db.scalars(
        select(Notification.id)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(True),
        )
        .order_by(
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
        .offset(10)
    ).all()

    if old_read_ids:
        db.execute(
            delete(Notification).where(
                Notification.user_id == user_id,
                Notification.id.in_(old_read_ids),
            )
        )


class AssistantRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: int | None = Field(default=None, gt=0)

    selected_item_id: int | None = Field(default=None, gt=0)
    selected_request_id: int | None = Field(default=None, gt=0)


class AssistantResponse(BaseModel):
    reply: str
    intent: str
    results: list[dict] = Field(default_factory=list)
    conversation_id: int


class ItemCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=2000)
    category: str = Field(default="Other", max_length=80)
    condition: str = Field(default="Good", max_length=40)
    image_url: str | None = None


class ItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    category: str | None = Field(default=None, max_length=80)
    condition: str | None = Field(default=None, max_length=40)
    image_url: str | None = None


class ItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    name: str
    description: str
    category: str
    condition: str
    is_available: bool
    image_url: str | None = None


class BorrowRequestCreate(BaseModel):
    item_id: int
    requested_days: int = Field(ge=1, le=30)
    note: str = Field(default="", max_length=500)


class BorrowDecision(BaseModel):
    decision: Literal["approve", "reject"]


class BorrowRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    borrower_id: int
    owner_id: int
    status: str
    requested_days: int
    note: str

    borrower_name: str | None = None
    item_name: str | None = None


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    notification_type: str
    title: str
    message: str
    related_request_id: int | None
    is_read: bool
    created_at: datetime


@app.get("/api/credits/me", tags=["Credits"])
def get_my_credits(
    current_user: User = Depends(get_current_user),
):
    return {
        "credits": current_user.credits,
    }


@app.post("/api/upload-image", tags=["Images"])
async def upload_item_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    allowed_types = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
    }

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, PNG and WEBP images are allowed.",
        )

    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image size must be less than 5 MB.",
        )

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SECRET_KEY")

    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase storage is not configured.",
        )

    try:
        supabase = create_client(supabase_url, supabase_key)

        extension = allowed_types[file.content_type]
        file_path = f"{current_user.id}/{uuid.uuid4()}.{extension}"

        storage = supabase.storage.from_("item-images")

        storage.upload(
            path=file_path,
            file=image_bytes,
            file_options={
                "content-type": file.content_type,
                "upsert": "false",
            },
        )

        image_url = storage.get_public_url(file_path)

        return {
            "image_url": image_url,
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Image upload failed. Please try again.",
        )


@app.post(
    "/api/items",
    response_model=ItemResponse,
    status_code=201,
    tags=["Items"],
)
def create_item(
    payload: ItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = Item(
        owner_id=current_user.id,
        name=payload.name.strip(),
        description=payload.description.strip(),
        category=payload.category.strip(),
        condition=payload.condition.strip(),
        image_url=payload.image_url,
        is_available=True,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@app.get(
    "/api/items",
    response_model=list[ItemResponse],
    tags=["Items"],
)
def get_items(
    q: str | None = Query(default=None, max_length=160),
    category: str | None = Query(default=None, max_length=80),
    available: bool = True,
    db: Session = Depends(get_db),
):
    statement = select(Item).where(Item.is_available == available)

    if q and q.strip():
        search = f"%{q.strip()}%"

        statement = statement.where(
            or_(
                Item.name.ilike(search),
                Item.description.ilike(search),
                Item.category.ilike(search),
            )
        )

    if category and category.strip():
        statement = statement.where(Item.category.ilike(category.strip()))

    statement = statement.order_by(Item.id.desc()).limit(100)

    return db.scalars(statement).all()


@app.get(
    "/api/items/mine",
    response_model=list[ItemResponse],
    tags=["Items"],
)
def get_my_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    statement = (
        select(Item).where(Item.owner_id == current_user.id).order_by(Item.id.desc())
    )

    return db.scalars(statement).all()


@app.patch(
    "/api/items/{item_id}",
    response_model=ItemResponse,
    tags=["Items"],
)
def update_item(
    item_id: int,
    payload: ItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.get(Item, item_id)

    if not item:
        raise HTTPException(404, "Item not found.")

    if item.owner_id != current_user.id:
        raise HTTPException(
            403,
            "You can only edit your own item.",
        )

    active_request = db.scalar(
        select(BorrowRequest).where(
            BorrowRequest.item_id == item.id,
            BorrowRequest.status.in_(
                [
                    "pending",
                    "approved",
                    "return_requested",
                ]
            ),
        )
    )

    if active_request:
        raise HTTPException(
            409,
            "This item cannot be edited while a borrowing request is active.",
        )

    updates = payload.model_dump(exclude_unset=True)

    for field, value in updates.items():
        if isinstance(value, str):
            value = value.strip()

        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


@app.delete("/api/items/{item_id}", tags=["Items"])
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.get(Item, item_id)

    if not item:
        raise HTTPException(404, "Item not found.")

    if item.owner_id != current_user.id:
        raise HTTPException(
            403,
            "You can only delete your own item.",
        )

    existing_request = db.scalar(
        select(BorrowRequest.id).where(BorrowRequest.item_id == item.id).limit(1)
    )

    if existing_request:
        raise HTTPException(
            409,
            "This item has borrowing history and cannot be deleted.",
        )

    db.delete(item)
    db.commit()

    return {
        "message": "Item deleted successfully.",
        "item_id": item_id,
    }


@app.get(
    "/api/items/{item_id}",
    response_model=ItemResponse,
    tags=["Items"],
)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
):
    item = db.get(Item, item_id)

    if not item:
        raise HTTPException(404, "Item not found.")

    return item


@app.get(
    "/api/notifications",
    response_model=list[NotificationResponse],
    tags=["Notifications"],
)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    unread = db.scalars(
        select(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .order_by(
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
    ).all()

    read_history = db.scalars(
        select(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(True),
        )
        .order_by(
            Notification.created_at.desc(),
            Notification.id.desc(),
        )
        .limit(10)
    ).all()

    notifications = list(unread) + list(read_history)

    notifications.sort(
        key=lambda item: (item.created_at, item.id),
        reverse=True,
    )

    return notifications


@app.get(
    "/api/notifications/unread-count",
    tags=["Notifications"],
)
def unread_notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )

    return {
        "unread_count": count or 0,
    }


@app.patch(
    "/api/notifications/{notification_id}/read",
    tags=["Notifications"],
)
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )

    if not notification:
        raise HTTPException(404, "Notification not found.")

    notification.is_read = True

    cleanup_read_notifications(db, current_user.id)
    db.commit()

    return {
        "success": True,
        "id": notification_id,
        "is_read": True,
    }


@app.patch(
    "/api/notifications/read-all",
    tags=["Notifications"],
)
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )

    cleanup_read_notifications(db, current_user.id)
    db.commit()

    return {
        "success": True,
    }


@app.post(
    "/api/borrow-requests",
    response_model=BorrowRequestResponse,
    status_code=201,
    tags=["Borrowing"],
)
def create_borrow_request(
    payload: BorrowRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.scalar(select(Item).where(Item.id == payload.item_id).with_for_update())

    if not item:
        raise HTTPException(404, "Item not found.")

    if item.owner_id == current_user.id:
        raise HTTPException(
            400,
            "You cannot borrow your own item.",
        )

    if not item.is_available:
        raise HTTPException(
            409,
            "Item is not available.",
        )

    existing = db.scalar(
        select(BorrowRequest).where(
            BorrowRequest.item_id == item.id,
            BorrowRequest.borrower_id == current_user.id,
            BorrowRequest.status == "pending",
        )
    )

    if existing:
        raise HTTPException(
            409,
            "You already have a pending request for this item.",
        )

    request = BorrowRequest(
        item_id=item.id,
        borrower_id=current_user.id,
        owner_id=item.owner_id,
        status="pending",
        requested_days=payload.requested_days,
        note=payload.note.strip(),
    )

    db.add(request)
    db.flush()

    add_notification(
        db,
        user_id=item.owner_id,
        notification_type="borrow_request",
        title="New borrow request",
        message=(
            f"{current_user.full_name} wants to borrow "
            f"{item.name} for {payload.requested_days} day(s)."
        ),
        request_id=request.id,
        event_key=f"borrow-request:{request.id}:owner",
    )

    db.commit()
    db.refresh(request)

    return request


@app.get(
    "/api/borrow-requests/mine",
    response_model=list[BorrowRequestResponse],
    tags=["Borrowing"],
)
def get_my_borrow_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    statement = (
        select(BorrowRequest)
        .where(
            or_(
                BorrowRequest.borrower_id == current_user.id,
                BorrowRequest.owner_id == current_user.id,
            )
        )
        .order_by(BorrowRequest.id.desc())
    )

    requests = db.scalars(statement).all()
    results = []

    for request in requests:
        item = db.get(Item, request.item_id)
        borrower = db.get(User, request.borrower_id)

        results.append(
            {
                "id": request.id,
                "item_id": request.item_id,
                "borrower_id": request.borrower_id,
                "owner_id": request.owner_id,
                "status": request.status,
                "requested_days": request.requested_days,
                "note": request.note,
                "borrower_name": (borrower.full_name if borrower else "Student"),
                "item_name": (item.name if item else "Unknown item"),
            }
        )

    return results


@app.patch(
    "/api/borrow-requests/{request_id}/decision",
    response_model=BorrowRequestResponse,
    tags=["Borrowing"],
)
def decide_borrow_request(
    request_id: int,
    payload: BorrowDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request = db.scalar(
        select(BorrowRequest).where(BorrowRequest.id == request_id).with_for_update()
    )

    if not request:
        raise HTTPException(404, "Request not found.")

    if request.owner_id != current_user.id:
        raise HTTPException(
            403,
            "Only the item owner can decide this request.",
        )

    if request.status != "pending":
        raise HTTPException(
            409,
            "This request has already been processed.",
        )

    item = db.scalar(select(Item).where(Item.id == request.item_id).with_for_update())

    if not item:
        raise HTTPException(404, "Item not found.")

    if payload.decision == "approve":
        if not item.is_available:
            raise HTTPException(
                409,
                "Item is no longer available.",
            )

        item.is_available = False
        request.status = "approved"
    else:
        request.status = "rejected"

    approved = request.status == "approved"

    add_notification(
        db,
        user_id=request.borrower_id,
        notification_type=("borrow_approved" if approved else "borrow_rejected"),
        title=("Borrow request approved" if approved else "Borrow request rejected"),
        message=(
            f"Your request for {item.name} was approved."
            if approved
            else f"Your request for {item.name} was rejected."
        ),
        request_id=request.id,
        event_key=(f"borrow-decision:{request.id}:" f"{request.status}:borrower"),
    )

    db.commit()
    db.refresh(request)

    return request


@app.post(
    "/api/borrow-requests/{request_id}/return-request",
    response_model=BorrowRequestResponse,
    tags=["Borrowing"],
)
def request_item_return(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request = db.get(BorrowRequest, request_id)

    if not request:
        raise HTTPException(404, "Request not found.")

    if request.borrower_id != current_user.id:
        raise HTTPException(
            403,
            "Only the borrower can request a return.",
        )

    if request.status != "approved":
        raise HTTPException(
            409,
            "Only an approved borrowing can be returned.",
        )

    request.status = "return_requested"
    item = db.get(Item, request.item_id)

    add_notification(
        db,
        user_id=request.owner_id,
        notification_type="return_requested",
        title="Item return requested",
        message=(
            f"{current_user.full_name} requested to return "
            f"{item.name if item else 'an item'}."
        ),
        request_id=request.id,
        event_key=f"return-request:{request.id}:owner",
    )

    db.commit()
    db.refresh(request)

    return request


@app.post(
    "/api/borrow-requests/{request_id}/confirm-return",
    response_model=BorrowRequestResponse,
    tags=["Borrowing"],
)
def confirm_item_return(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request = db.scalar(
        select(BorrowRequest).where(BorrowRequest.id == request_id).with_for_update()
    )

    if not request:
        raise HTTPException(404, "Request not found.")

    if request.owner_id != current_user.id:
        raise HTTPException(
            403,
            "Only the item owner can confirm the return.",
        )

    if request.status != "return_requested":
        raise HTTPException(
            409,
            "A return request must be submitted first.",
        )

    item = db.get(Item, request.item_id)
    owner = db.get(User, request.owner_id)

    if not item or not owner:
        raise HTTPException(
            404,
            "Item or owner not found.",
        )

    item.is_available = True
    request.status = "returned"
    owner.credits += 10

    add_notification(
        db,
        user_id=request.borrower_id,
        notification_type="return_confirmed",
        title="Item return confirmed",
        message=f"Your return of {item.name} has been confirmed.",
        request_id=request.id,
        event_key=f"return-confirmed:{request.id}:borrower",
    )

    db.commit()
    db.refresh(request)

    return request


@app.get(
    "/api/assistant/conversations",
    tags=["Assistant"],
)
def get_assistant_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversations = db.scalars(
        select(AssistantConversation)
        .where(AssistantConversation.user_id == current_user.id)
        .order_by(AssistantConversation.updated_at.desc())
    ).all()

    return [
        {
            "id": conversation.id,
            "title": conversation.title,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at,
        }
        for conversation in conversations
    ]


@app.get(
    "/api/assistant/conversations/{conversation_id}",
    tags=["Assistant"],
)
def get_assistant_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = db.scalar(
        select(AssistantConversation).where(
            AssistantConversation.id == conversation_id,
            AssistantConversation.user_id == current_user.id,
        )
    )

    if not conversation:
        raise HTTPException(
            404,
            "Conversation not found.",
        )

    messages = db.scalars(
        select(AssistantMessage)
        .where(AssistantMessage.conversation_id == conversation.id)
        .order_by(
            AssistantMessage.created_at.asc(),
            AssistantMessage.id.asc(),
        )
    ).all()

    return {
        "id": conversation.id,
        "title": conversation.title,
        "messages": [
            {
                "id": message.id,
                "role": message.role,
                "content": message.content,
                "intent": message.intent,
                "created_at": message.created_at,
            }
            for message in messages
        ],
    }


@app.delete(
    "/api/assistant/conversations/{conversation_id}",
    tags=["Assistant"],
)
def delete_assistant_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = db.scalar(
        select(AssistantConversation).where(
            AssistantConversation.id == conversation_id,
            AssistantConversation.user_id == current_user.id,
        )
    )

    if not conversation:
        raise HTTPException(
            404,
            "Conversation not found.",
        )

    db.delete(conversation)
    db.commit()

    return {
        "message": "Conversation deleted successfully.",
    }


YES_RESPONSES = {
    "yes",
    "yes please",
    "confirm",
    "confirmed",
    "proceed",
    "do it",
    "go ahead",
    "haan",
    "ha",
    "han",
    "kar do",
    "yes do it",
}

NO_RESPONSES = {
    "no",
    "no thanks",
    "cancel",
    "cancel it",
    "don't",
    "dont",
    "stop",
    "nahi",
    "nahin",
    "mat karo",
    "cancel karo",
}


def save_assistant_message(
    db: Session,
    conversation_id: int,
    content: str,
    intent: str | None = None,
) -> None:
    db.add(
        AssistantMessage(
            conversation_id=conversation_id,
            role="assistant",
            content=content,
            intent=intent,
        )
    )


def get_conversation_history(
    db: Session,
    conversation_id: int,
    limit: int = 12,
) -> list[dict[str, str]]:
    recent_messages = db.scalars(
        select(AssistantMessage)
        .where(AssistantMessage.conversation_id == conversation_id)
        .order_by(
            AssistantMessage.created_at.desc(),
            AssistantMessage.id.desc(),
        )
        .limit(limit)
    ).all()

    return [
        {
            "role": item.role,
            "content": item.content,
        }
        for item in reversed(recent_messages)
    ]


def validate_selected_item(
    db: Session,
    item_id: int,
    current_user: User,
) -> Item:
    item = db.get(Item, item_id)

    if not item:
        raise HTTPException(
            404,
            "Selected item not found.",
        )

    if not item.is_available:
        raise HTTPException(
            409,
            "Selected item is no longer available.",
        )

    if item.owner_id == current_user.id:
        raise HTTPException(
            400,
            "You cannot borrow your own item.",
        )

    return item


def validate_selected_request(
    db: Session,
    request_id: int,
    current_user: User,
) -> tuple[BorrowRequest, Item | None, User | None]:
    request = db.get(BorrowRequest, request_id)

    if not request:
        raise HTTPException(
            404,
            "Selected request not found.",
        )

    if current_user.id not in (
        request.borrower_id,
        request.owner_id,
    ):
        raise HTTPException(
            403,
            "You cannot access this request.",
        )

    item = db.get(Item, request.item_id)
    borrower = db.get(User, request.borrower_id)

    return request, item, borrower


@app.post(
    "/api/assistant/chat",
    response_model=AssistantResponse,
    tags=["Assistant"],
)
def assistant_chat(
    payload: AssistantRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = payload.message.strip()

    if not message:
        raise HTTPException(
            400,
            "Message cannot be empty.",
        )

    if payload.selected_item_id is not None and payload.selected_request_id is not None:
        raise HTTPException(
            400,
            "Select either an item or a request, not both.",
        )

    if payload.conversation_id is not None:
        conversation = db.scalar(
            select(AssistantConversation).where(
                AssistantConversation.id == payload.conversation_id,
                AssistantConversation.user_id == current_user.id,
            )
        )

        if not conversation:
            raise HTTPException(
                404,
                "Conversation not found.",
            )

    else:
        conversation = AssistantConversation(
            user_id=current_user.id,
            title=message[:60],
            assistant_context={},
        )

        db.add(conversation)
        db.flush()

    if conversation.title == "New conversation":
        conversation.title = message[:60]

    assistant_context = dict(conversation.assistant_context or {})

    if payload.selected_item_id is not None:
        selected_item = validate_selected_item(
            db,
            payload.selected_item_id,
            current_user,
        )

        assistant_context["selected_item_id"] = selected_item.id
        assistant_context["selected_item_name"] = selected_item.name

        assistant_context.pop("selected_request_id", None)
        assistant_context.pop("selected_request_item_name", None)
        assistant_context.pop("selected_borrower_name", None)

    if payload.selected_request_id is not None:
        selected_request, selected_item, borrower = validate_selected_request(
            db,
            payload.selected_request_id,
            current_user,
        )

        assistant_context["selected_request_id"] = selected_request.id

        assistant_context["selected_request_item_name"] = (
            selected_item.name if selected_item else "Unknown item"
        )

        assistant_context["selected_borrower_name"] = (
            borrower.full_name if borrower else "Student"
        )

        assistant_context.pop("selected_item_id", None)
        assistant_context.pop("selected_item_name", None)

    db.add(
        AssistantMessage(
            conversation_id=conversation.id,
            role="user",
            content=message,
        )
    )

    db.flush()

    conversation_history = get_conversation_history(
        db,
        conversation.id,
        limit=12,
    )

    normalized_message = message.lower().strip().rstrip("!. ")

    pending_action = conversation.pending_action
    action_confirmed = False

    if pending_action:
        if normalized_message in NO_RESPONSES:
            conversation.pending_action = None

            assistant_context.pop("selected_request_id", None)
            assistant_context.pop("selected_request_item_name", None)
            assistant_context.pop("selected_borrower_name", None)

            conversation.assistant_context = assistant_context

            reply = "Action cancelled. No changes have been made."

            save_assistant_message(
                db,
                conversation.id,
                reply,
                "lending",
            )

            conversation.updated_at = datetime.utcnow()
            db.commit()

            return AssistantResponse(
                reply=reply,
                intent="lending",
                results=[],
                conversation_id=conversation.id,
            )

        if normalized_message in YES_RESPONSES:
            action_confirmed = True

        else:
            reply = (
                "There is a pending action awaiting your confirmation. "
                "Please reply with 'yes' to proceed or 'no' to cancel."
            )

            save_assistant_message(
                db,
                conversation.id,
                reply,
                "lending",
            )

            conversation.updated_at = datetime.utcnow()
            db.commit()

            return AssistantResponse(
                reply=reply,
                intent="lending",
                results=[],
                conversation_id=conversation.id,
            )

    state = CampusLoopState(
        user_message=message,
        user_id=current_user.id,
        conversation_id=conversation.id,
        conversation_history=conversation_history,
        conversation_context=assistant_context,
        selected_item_id=assistant_context.get("selected_item_id"),
        selected_item_name=assistant_context.get("selected_item_name"),
        selected_request_id=assistant_context.get("selected_request_id"),
        selected_request_item_name=assistant_context.get("selected_request_item_name"),
        selected_borrower_name=assistant_context.get("selected_borrower_name"),
        pending_action=pending_action,
        action_confirmed=action_confirmed,
    )

    try:
        result = run_assistant(
            state,
            db=db,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )

    conversation.pending_action = result.pending_action

    updated_context = dict(result.conversation_context or assistant_context)

    selection_values = {
        "selected_item_id": result.selected_item_id,
        "selected_item_name": result.selected_item_name,
        "selected_request_id": result.selected_request_id,
        "selected_request_item_name": (result.selected_request_item_name),
        "selected_borrower_name": result.selected_borrower_name,
    }

    for key, value in selection_values.items():
        if value is None:
            updated_context.pop(key, None)
        else:
            updated_context[key] = value

    if action_confirmed:
        action_success = (
            isinstance(result.action_result, dict)
            and result.action_result.get("success") is True
        )

        if action_success:
            for key in (
                "selected_item_id",
                "selected_item_name",
                "selected_request_id",
                "selected_request_item_name",
                "selected_borrower_name",
            ):
                updated_context.pop(key, None)

    conversation.assistant_context = updated_context

    reply = result.assistant_reply or (
        "I couldn't process that request. Please try again."
    )

    save_assistant_message(
        db,
        conversation.id,
        reply,
        result.intent,
    )

    conversation.updated_at = datetime.utcnow()

    db.commit()

    return AssistantResponse(
        reply=reply,
        intent=result.intent,
        results=result.search_results,
        conversation_id=conversation.id,
    )
