"""Notification service for creating and managing notifications."""

from typing import Optional
from uuid import UUID

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.db_models import (
    MaterialReviewDB,
    NotificationDB,
    ProfileDB,
    ReviewAssignmentDB,
    ReviewCommentDB,
)
from app.models.notification import NotificationPreferences, NotificationType


class NotificationService:
    """Service for managing notifications."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_preferences(self, user_id: UUID) -> NotificationPreferences:
        """Get user's notification preferences."""
        query = select(ProfileDB).where(ProfileDB.id == user_id)
        result = await self.db.exec(query)
        profile = result.first()

        if profile and profile.notification_preferences:
            return NotificationPreferences(**profile.notification_preferences)
        return NotificationPreferences()  # Defaults: all enabled

    async def should_notify(self, user_id: UUID, notification_type: NotificationType) -> bool:
        """Check if user should receive this notification type."""
        prefs = await self.get_user_preferences(user_id)
        return getattr(prefs, notification_type.value, True)

    async def create_notification(
        self,
        user_id: UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        review_id: Optional[int] = None,
        material_number: Optional[int] = None,
        comment_id: Optional[int] = None,
        triggered_by: Optional[UUID] = None,
    ) -> Optional[NotificationDB]:
        """Create a notification if user preferences allow it."""
        # Check user preferences
        if not await self.should_notify(user_id, notification_type):
            return None

        # Don't notify user about their own actions
        if triggered_by and str(triggered_by) == str(user_id):
            return None

        notification = NotificationDB(
            user_id=user_id,
            notification_type=notification_type.value,
            title=title,
            message=message,
            review_id=review_id,
            material_number=material_number,
            comment_id=comment_id,
            triggered_by=triggered_by,
        )

        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)

        return notification

    async def notify_review_assigned(
        self,
        review: MaterialReviewDB,
        assigned_to: UUID,
        assigned_by: UUID,
    ) -> Optional[NotificationDB]:
        """Notify a user that they have been assigned to a review."""
        title = f"Review assigned: Material {review.material_number}"
        message = f"You have been assigned to review material {review.material_number}."

        return await self.create_notification(
            user_id=assigned_to,
            notification_type=NotificationType.REVIEW_ASSIGNED,
            title=title,
            message=message,
            review_id=review.review_id,
            material_number=review.material_number,
            triggered_by=assigned_by,
        )

    async def notify_status_change(
        self,
        review: MaterialReviewDB,
        old_status: str,
        new_status: str,
        changed_by: UUID,
    ) -> list[NotificationDB]:
        """Notify relevant users when review status changes."""
        created_notifications: list[NotificationDB] = []

        # Get users involved in this review
        involved_users = await self._get_involved_users(review)

        title = f"Status changed: Material {review.material_number}"
        message = f"Review status changed from '{old_status}' to '{new_status}'."

        for user_id in involved_users:
            notification = await self.create_notification(
                user_id=user_id,
                notification_type=NotificationType.REVIEW_STATUS_CHANGED,
                title=title,
                message=message,
                review_id=review.review_id,
                material_number=review.material_number,
                triggered_by=changed_by,
            )
            if notification:
                created_notifications.append(notification)

        return created_notifications

    async def notify_comment_added(
        self,
        review: MaterialReviewDB,
        comment: ReviewCommentDB,
        commenter_id: UUID,
    ) -> list[NotificationDB]:
        """Notify relevant users when a comment is added."""
        created_notifications: list[NotificationDB] = []

        # Get users involved in this review
        involved_users = await self._get_involved_users(review)

        title = f"New comment: Material {review.material_number}"
        message = f"A new comment was added to the review for material {review.material_number}."

        for user_id in involved_users:
            notification = await self.create_notification(
                user_id=user_id,
                notification_type=NotificationType.COMMENT_ADDED,
                title=title,
                message=message,
                review_id=review.review_id,
                material_number=review.material_number,
                comment_id=comment.comment_id,
                triggered_by=commenter_id,
            )
            if notification:
                created_notifications.append(notification)

        return created_notifications

    async def _get_involved_users(self, review: MaterialReviewDB) -> set[UUID]:
        """Get all users involved in a review (initiator, decider, commenters)."""
        involved: set[UUID] = set()

        # Add initiator
        if review.initiated_by:
            involved.add(review.initiated_by)

        # Add assigned SME and approver
        assignments_query = select(ReviewAssignmentDB.user_id).where(
            ReviewAssignmentDB.review_id == review.review_id,
            ReviewAssignmentDB.status.notin_(["declined", "reassigned"]),
        )
        assignments_result = await self.db.exec(assignments_query)
        for user_id in assignments_result.all():
            involved.add(user_id)

        # Add commenters
        comments_query = select(ReviewCommentDB.user_id).where(ReviewCommentDB.review_id == review.review_id).distinct()
        result = await self.db.exec(comments_query)
        for user_id in result.all():
            involved.add(user_id)

        return involved
