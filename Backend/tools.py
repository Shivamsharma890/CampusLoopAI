from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from database.connection import SessionLocal
from database.models import (
    BorrowRequest,
    Item,
    Notification,
    User,
)


@contextmanager
def _session_scope(
    db: Session | None = None,
) -> Iterator[Session]:
    """
    Reuse the request-scoped session when provided.
    Otherwise create and close a new session.
    """

    owns_session = db is None
    session = db if db is not None else SessionLocal()

    try:
        yield session
    finally:
        if owns_session:
            session.close()


def _notify(
    db: Session,
    *,
    user_id: int,
    notification_type: str,
    title: str,
    message: str,
    request_id: int,
    event_key: str,
) -> None:
    """
    Add a notification once for a specific event.

    Notification.event_key should have a unique constraint
    in the database model.
    """

    existing = db.scalar(
        select(Notification).where(Notification.event_key == event_key)
    )

    if existing is not None:
        return

    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        related_request_id=request_id,
        event_key=event_key,
        is_read=False,
    )

    db.add(notification)


def search_available_items(
    query: str,
    current_user_id: int,
    limit: int = 8,
    db: Session | None = None,
) -> list[dict]:
    """
    Search available marketplace items.

    The specialist LLM should provide a concise search query,
    such as 'laptop charger' or 'kurta pajama'.

    No keyword extraction or stop-word filtering is performed.
    """

    if not query or not query.strip():
        return []

    if current_user_id is None:
        raise ValueError("Authenticated user is required.")

    safe_limit = max(1, min(int(limit), 20))
    search_value = f"%{query.strip()}%"

    with _session_scope(db) as session:

        statement = (
            select(Item)
            .where(
                Item.is_available.is_(True),
                Item.owner_id != current_user_id,
                or_(
                    Item.name.ilike(search_value),
                    Item.category.ilike(search_value),
                    Item.description.ilike(search_value),
                ),
            )
            .order_by(Item.id.desc())
            .limit(safe_limit)
        )

        items = session.scalars(statement).all()

        return [
            {
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "description": item.description,
                "condition": item.condition,
                "available": item.is_available,
                "image_url": item.image_url,
            }
            for item in items
        ]


def count_available_items(
    db: Session | None = None,
) -> int:
    """Count all currently available marketplace items."""

    with _session_scope(db) as session:

        total = session.scalar(
            select(func.count(Item.id)).where(Item.is_available.is_(True))
        )

        return int(total or 0)


def get_item_details(
    item_id: int,
    db: Session | None = None,
) -> dict:
    """Get details of a marketplace item."""

    with _session_scope(db) as session:

        item = session.get(Item, item_id)

        if item is None:
            return {
                "success": False,
                "message": "Item was not found.",
            }

        return {
            "success": True,
            "item": {
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "description": item.description,
                "condition": item.condition,
                "available": item.is_available,
                "image_url": item.image_url,
            },
        }


def create_borrow_request(
    item_id: int,
    borrower_id: int,
    requested_days: int = 1,
    note: str = "",
    db: Session | None = None,
) -> dict:
    """
    Create a borrowing request.

    borrower_id must come from authenticated backend context,
    never from the LLM.
    """

    if requested_days < 1 or requested_days > 30:
        return {
            "success": False,
            "message": "Requested duration must be between 1 and 30 days.",
        }

    clean_note = (note or "").strip()

    if len(clean_note) > 500:
        return {
            "success": False,
            "message": "The note cannot exceed 500 characters.",
        }

    with _session_scope(db) as session:

        try:
            borrower = session.get(User, borrower_id)

            if borrower is None:
                return {
                    "success": False,
                    "message": "Borrower account was not found.",
                }

            item = session.scalar(
                select(Item).where(Item.id == item_id).with_for_update()
            )

            if item is None:
                return {
                    "success": False,
                    "message": "Item was not found.",
                }

            if item.owner_id == borrower_id:
                return {
                    "success": False,
                    "message": "You cannot borrow your own item.",
                }

            if not item.is_available:
                return {
                    "success": False,
                    "message": "This item is currently unavailable.",
                }

            active_statuses = [
                "pending",
                "approved",
                "return_requested",
            ]

            existing = session.scalar(
                select(BorrowRequest).where(
                    BorrowRequest.item_id == item_id,
                    BorrowRequest.borrower_id == borrower_id,
                    BorrowRequest.status.in_(active_statuses),
                )
            )

            if existing is not None:
                return {
                    "success": False,
                    "message": "You already have an active request for this item.",
                    "request_id": existing.id,
                    "status": existing.status,
                }

            request = BorrowRequest(
                item_id=item.id,
                borrower_id=borrower_id,
                owner_id=item.owner_id,
                status="pending",
                requested_days=requested_days,
                note=clean_note,
            )

            session.add(request)
            session.flush()

            _notify(
                session,
                user_id=item.owner_id,
                notification_type="borrow_request",
                title="New borrow request",
                message=(
                    f"{borrower.full_name} wants to borrow "
                    f"{item.name} for {requested_days} day(s)."
                ),
                request_id=request.id,
                event_key=f"borrow-request:{request.id}:owner",
            )

            session.commit()
            session.refresh(request)

            return {
                "success": True,
                "message": (
                    "Borrowing request created successfully. "
                    "The item owner must approve it."
                ),
                "request_id": request.id,
                "item_id": item.id,
                "item_name": item.name,
                "status": request.status,
                "requested_days": request.requested_days,
            }

        except Exception:
            session.rollback()
            raise


def get_my_borrow_requests(
    user_id: int,
    db: Session | None = None,
    limit: int = 20,
) -> list[dict]:
    """
    Get requests where the authenticated user is either
    the borrower or the item owner.
    """

    safe_limit = max(1, min(int(limit), 50))

    with _session_scope(db) as session:

        requests = session.scalars(
            select(BorrowRequest)
            .where(
                or_(
                    BorrowRequest.borrower_id == user_id,
                    BorrowRequest.owner_id == user_id,
                )
            )
            .order_by(BorrowRequest.id.desc())
            .limit(safe_limit)
        ).all()

        results = []

        for request in requests:

            item = session.get(Item, request.item_id)

            results.append(
                {
                    "request_id": request.id,
                    "item_id": request.item_id,
                    "item_name": (item.name if item else "Unknown item"),
                    "borrower_id": request.borrower_id,
                    "owner_id": request.owner_id,
                    "status": request.status,
                    "requested_days": request.requested_days,
                    "created_at": (
                        request.created_at.isoformat() if request.created_at else None
                    ),
                    "your_role": (
                        "borrower" if request.borrower_id == user_id else "owner"
                    ),
                }
            )

        return results


def get_pending_borrow_requests(
    owner_id: int,
    db: Session | None = None,
    limit: int = 20,
) -> list[dict]:
    """Get pending borrowing requests belonging to this owner."""

    safe_limit = max(1, min(int(limit), 50))

    with _session_scope(db) as session:

        requests = session.scalars(
            select(BorrowRequest)
            .where(
                BorrowRequest.owner_id == owner_id,
                BorrowRequest.status == "pending",
            )
            .order_by(BorrowRequest.id.desc())
            .limit(safe_limit)
        ).all()

        results = []

        for request in requests:

            item = session.get(Item, request.item_id)
            borrower = session.get(User, request.borrower_id)

            results.append(
                {
                    "request_id": request.id,
                    "item_id": request.item_id,
                    "item_name": (item.name if item else "Unknown item"),
                    "borrower_name": (borrower.full_name if borrower else "Student"),
                    "requested_days": request.requested_days,
                    "note": request.note,
                    "status": request.status,
                }
            )

        return results


def decide_borrow_request(
    request_id: int,
    owner_id: int,
    decision: str,
    confirmed: bool = False,
    db: Session | None = None,
) -> dict:
    """
    Approve or reject a borrowing request.

    Requires explicit confirmation before changing request status.
    owner_id must come from authenticated backend context.
    """

    normalized_decision = (decision or "").strip().lower()

    if normalized_decision not in {"approve", "reject"}:
        return {
            "success": False,
            "message": "Decision must be approve or reject.",
        }

    if not confirmed:
        return {
            "success": False,
            "requires_confirmation": True,
            "message": (
                f"Please confirm that you want to "
                f"{normalized_decision} request {request_id}."
            ),
        }

    with _session_scope(db) as session:

        try:
            request = session.scalar(
                select(BorrowRequest)
                .where(BorrowRequest.id == request_id)
                .with_for_update()
            )

            if request is None:
                return {
                    "success": False,
                    "message": "Borrow request was not found.",
                }

            if request.owner_id != owner_id:
                return {
                    "success": False,
                    "message": "Only the item owner can decide this request.",
                }

            if request.status != "pending":
                return {
                    "success": False,
                    "message": "This request has already been processed.",
                    "status": request.status,
                }

            item = session.scalar(
                select(Item).where(Item.id == request.item_id).with_for_update()
            )

            if item is None:
                return {
                    "success": False,
                    "message": "Item was not found.",
                }

            if normalized_decision == "approve":

                if not item.is_available:
                    return {
                        "success": False,
                        "message": "Item is no longer available.",
                    }

                item.is_available = False
                request.status = "approved"

            else:
                request.status = "rejected"

            approved = request.status == "approved"

            _notify(
                session,
                user_id=request.borrower_id,
                notification_type=(
                    "borrow_approved" if approved else "borrow_rejected"
                ),
                title=(
                    "Borrow request approved" if approved else "Borrow request rejected"
                ),
                message=(
                    f"Your request for {item.name} was approved."
                    if approved
                    else f"Your request for {item.name} was rejected."
                ),
                request_id=request.id,
                event_key=(
                    f"borrow-decision:{request.id}:" f"{request.status}:borrower"
                ),
            )

            session.commit()

            return {
                "success": True,
                "message": (
                    "Borrow request approved."
                    if approved
                    else "Borrow request rejected."
                ),
                "request_id": request.id,
                "item_name": item.name,
                "status": request.status,
            }

        except Exception:
            session.rollback()
            raise


def request_item_return(
    request_id: int,
    borrower_id: int,
    db: Session | None = None,
) -> dict:
    """
    Allow the borrower to request a return
    for an approved borrowing request.
    """

    with _session_scope(db) as session:

        try:
            request = session.scalar(
                select(BorrowRequest)
                .where(BorrowRequest.id == request_id)
                .with_for_update()
            )

            if request is None:
                return {
                    "success": False,
                    "message": "Borrow request was not found.",
                }

            if request.borrower_id != borrower_id:
                return {
                    "success": False,
                    "message": "Only the borrower can request this return.",
                }

            if request.status != "approved":
                return {
                    "success": False,
                    "message": (
                        f"Return cannot be requested when status is "
                        f"'{request.status}'. Only approved loans can be returned."
                    ),
                }

            item = session.get(Item, request.item_id)

            request.status = "return_requested"

            _notify(
                session,
                user_id=request.owner_id,
                notification_type="return_requested",
                title="Item return requested",
                message=(
                    f"A borrower requested to return "
                    f"{item.name if item else 'an item'}."
                ),
                request_id=request.id,
                event_key=f"return-request:{request.id}:owner",
            )

            session.commit()

            return {
                "success": True,
                "message": (
                    "Return request submitted. " "Waiting for owner confirmation."
                ),
                "request_id": request.id,
                "status": request.status,
            }

        except Exception:
            session.rollback()
            raise


def confirm_item_return(
    request_id: int,
    owner_id: int,
    confirmed: bool = False,
    db: Session | None = None,
) -> dict:
    """
    Confirm a return after the owner verifies the physical item.

    Credits are awarded only after a successful status transition.
    """

    if not confirmed:
        return {
            "success": False,
            "requires_confirmation": True,
            "message": (
                f"Please confirm that the item for request "
                f"{request_id} has actually been returned."
            ),
        }

    with _session_scope(db) as session:

        try:
            request = session.scalar(
                select(BorrowRequest)
                .where(BorrowRequest.id == request_id)
                .with_for_update()
            )

            if request is None:
                return {
                    "success": False,
                    "message": "Borrow request was not found.",
                }

            if request.owner_id != owner_id:
                return {
                    "success": False,
                    "message": "Only the item owner can confirm this return.",
                }

            if request.status != "return_requested":
                return {
                    "success": False,
                    "message": (
                        f"Return cannot be confirmed when status is "
                        f"'{request.status}'. A return request must be submitted first."
                    ),
                }

            owner = session.get(User, owner_id)
            item = session.get(Item, request.item_id)

            if owner is None:
                return {
                    "success": False,
                    "message": "Owner account was not found.",
                }

            if item is None:
                return {
                    "success": False,
                    "message": "Item was not found.",
                }

            request.status = "returned"
            item.is_available = True

            owner.credits += 10

            _notify(
                session,
                user_id=request.borrower_id,
                notification_type="return_confirmed",
                title="Item return confirmed",
                message=(f"Your return of {item.name} has been confirmed."),
                request_id=request.id,
                event_key=f"return-confirmed:{request.id}:borrower",
            )

            session.commit()

            return {
                "success": True,
                "message": "Return confirmed successfully.",
                "request_id": request.id,
                "status": request.status,
                "item_id": item.id,
                "item_name": item.name,
                "owner_credits_awarded": 10,
                "owner_total_credits": owner.credits,
            }

        except Exception:
            session.rollback()
            raise


def get_user_credits(
    user_id: int,
    db: Session | None = None,
) -> dict:
    """Get the authenticated user's credit balance."""

    with _session_scope(db) as session:

        user = session.get(User, user_id)

        if user is None:
            return {
                "success": False,
                "message": "User account was not found.",
            }

        return {
            "success": True,
            "credits": user.credits,
        }


def get_my_notifications(
    user_id: int,
    db: Session | None = None,
    limit: int = 10,
) -> list[dict]:
    """Get notifications belonging only to the authenticated user."""

    safe_limit = max(1, min(int(limit), 20))

    with _session_scope(db) as session:

        notifications = session.scalars(
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(
                Notification.created_at.desc(),
                Notification.id.desc(),
            )
            .limit(safe_limit)
        ).all()

        return [
            {
                "id": notification.id,
                "type": notification.notification_type,
                "title": notification.title,
                "message": notification.message,
                "request_id": notification.related_request_id,
                "is_read": notification.is_read,
                "created_at": (
                    notification.created_at.isoformat()
                    if notification.created_at
                    else None
                ),
            }
            for notification in notifications
        ]


"""
This registry exposes database functions to the agent layer.

In Agents.py, wrap these functions with authenticated context.
Do not expose user_id, borrower_id or owner_id as LLM-controlled
tool arguments. Inject those values from the authenticated request.
"""

DATABASE_TOOL_FUNCTIONS = {
    # Discovery
    "search_available_items": search_available_items,
    "count_available_items": count_available_items,
    "get_item_details": get_item_details,
    # Lending
    "create_borrow_request": create_borrow_request,
    "get_my_borrow_requests": get_my_borrow_requests,
    "get_pending_borrow_requests": get_pending_borrow_requests,
    "decide_borrow_request": decide_borrow_request,
    "request_item_return": request_item_return,
    "confirm_item_return": confirm_item_return,
    # Account
    "get_user_credits": get_user_credits,
    "get_my_notifications": get_my_notifications,
}
