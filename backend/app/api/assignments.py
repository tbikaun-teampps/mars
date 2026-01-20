"""Review assignments API endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.rbac import check_user_is_admin, get_user_permissions, require_permission
from app.api.utils import get_proposed_action_config
from app.core.auth import User, get_current_user
from app.core.database import get_db
from app.models.assignment import (
    AssignmentStepPayload,
    AssignmentType,
    MyAssignmentResponse,
    MyInitiatedReviewResponse,
    ReviewAssignmentResponse,
    UserWithPermission,
)
from app.models.db_models import (
    MaterialReviewDB,
    ProfileDB,
    ReviewAssignmentDB,
    ReviewAssignmentHistoryDB,
    RoleDB,
    SAPMaterialData,
    SMEExpertiseDB,
    UserRoleDB,
)
from app.models.review import MaterialReview
from app.services.notification_service import NotificationService
from app.services.review_service import ReviewService
from app.services.workflow import is_sme_required

router = APIRouter()


@router.get("/my-assignments")
async def get_my_assignments(
    status: str | None = None,
    assignment_type: str | None = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MyAssignmentResponse]:
    """Get assignments for the current user with material and review details.

    Used for the "My Reviews" page to show users their pending work.
    """
    from uuid import UUID as UUIDType

    user_uuid = UUIDType(current_user.id)

    # Build query with joins to get material and review details
    query = (
        select(
            ReviewAssignmentDB,
            MaterialReviewDB.status.label("review_status"),
            SAPMaterialData.material_number,
            SAPMaterialData.material_desc,
            ProfileDB.full_name.label("assigned_by_name"),
        )
        .join(MaterialReviewDB, ReviewAssignmentDB.review_id == MaterialReviewDB.review_id)
        .join(SAPMaterialData, MaterialReviewDB.material_number == SAPMaterialData.material_number)
        .outerjoin(ProfileDB, ReviewAssignmentDB.assigned_by == ProfileDB.id)
        .where(ReviewAssignmentDB.user_id == user_uuid)
    )

    # Apply filters
    if status:
        query = query.where(ReviewAssignmentDB.status == status)
    if assignment_type:
        query = query.where(ReviewAssignmentDB.assignment_type == assignment_type)

    # Order by assigned_at descending (most recent first)
    query = query.order_by(ReviewAssignmentDB.assigned_at.desc())

    # Apply pagination
    query = query.offset(skip).limit(limit)

    result = await db.exec(query)
    rows = result.all()

    # Transform to response format
    assignments = []
    for row in rows:
        assignment, review_status, material_number, material_desc, assigned_by_name = row
        assignments.append(
            MyAssignmentResponse(
                assignment_id=assignment.assignment_id,
                assignment_type=assignment.assignment_type,
                status=assignment.status,
                assigned_at=assignment.assigned_at,
                due_at=assignment.due_at,
                material_number=material_number,
                material_description=material_desc,
                review_id=assignment.review_id,
                review_status=review_status,
                assigned_by_name=assigned_by_name,
            )
        )

    return assignments


@router.get("/my-initiated-reviews")
async def get_my_initiated_reviews(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[MyInitiatedReviewResponse]:
    """Get reviews initiated by the current user.

    Used for the "My Reviews" page to show users reviews they created.
    """
    from uuid import UUID as UUIDType

    user_uuid = UUIDType(current_user.id)

    # Build query with join to get material details
    query = (
        select(
            MaterialReviewDB.review_id,
            MaterialReviewDB.status,
            MaterialReviewDB.proposed_action,
            MaterialReviewDB.review_date,
            MaterialReviewDB.created_at,
            SAPMaterialData.material_number,
            SAPMaterialData.material_desc,
        )
        .join(SAPMaterialData, MaterialReviewDB.material_number == SAPMaterialData.material_number)
        .where(MaterialReviewDB.initiated_by == user_uuid)
    )

    # Apply status filter
    if status:
        query = query.where(MaterialReviewDB.status == status)

    # Order by created_at descending (most recent first)
    query = query.order_by(MaterialReviewDB.created_at.desc())

    # Apply pagination
    query = query.offset(skip).limit(limit)

    result = await db.exec(query)
    rows = result.all()

    # Transform to response format
    reviews = []
    for row in rows:
        review_id, review_status, proposed_action, review_date, created_at, material_number, material_desc = row
        reviews.append(
            MyInitiatedReviewResponse(
                review_id=review_id,
                material_number=material_number,
                material_description=material_desc,
                status=review_status,
                proposed_action=proposed_action,
                review_date=review_date,
                created_at=created_at,
            )
        )

    return reviews


@router.get("/materials/{material_number}/reviews/{review_id}/assignments")
async def get_review_assignments(
    material_number: int,
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ReviewAssignmentResponse]:
    """Get all assignments for a review."""
    # Verify the review exists and belongs to the material
    review_query = select(MaterialReviewDB).where(
        MaterialReviewDB.review_id == review_id,
        MaterialReviewDB.material_number == material_number,
    )
    result = await db.exec(review_query)
    review = result.first()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    # Query assignments with user details
    query = (
        select(
            ReviewAssignmentDB,
            ProfileDB.full_name.label("user_name"),
            ProfileDB.email.label("user_email"),
        )
        .join(ProfileDB, ReviewAssignmentDB.user_id == ProfileDB.id)
        .where(ReviewAssignmentDB.review_id == review_id)
    )
    result = await db.exec(query)
    rows = result.all()

    # Get assigned_by user names
    assigned_by_ids = [row[0].assigned_by for row in rows if row[0].assigned_by]
    assigned_by_names: dict[UUID, str] = {}
    if assigned_by_ids:
        assigner_query = select(ProfileDB.id, ProfileDB.full_name).where(
            ProfileDB.id.in_(assigned_by_ids)
        )
        assigner_result = await db.exec(assigner_query)
        for assigner in assigner_result.all():
            assigned_by_names[assigner[0]] = assigner[1]

    assignments = []
    for row in rows:
        assignment, user_name, user_email = row
        assignments.append(
            ReviewAssignmentResponse(
                assignment_id=assignment.assignment_id,
                review_id=assignment.review_id,
                user_id=assignment.user_id,
                user_name=user_name,
                user_email=user_email,
                assignment_type=assignment.assignment_type,
                sme_type=assignment.sme_type,
                status=assignment.status,
                assigned_at=assignment.assigned_at,
                due_at=assignment.due_at,
                accepted_at=assignment.accepted_at,
                completed_at=assignment.completed_at,
                assigned_by=assignment.assigned_by,
                assigned_by_name=assigned_by_names.get(assignment.assigned_by),
            )
        )

    return assignments


@router.post("/materials/{material_number}/reviews/{review_id}/assignments")
async def create_review_assignments(
    material_number: int,
    review_id: int,
    data: AssignmentStepPayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MaterialReview:
    """Create SME and approver assignments for a review (Assignment Step)."""
    # Permission check: require can_assign_reviews
    await require_permission(current_user.id, db, "can_assign_reviews")

    # Verify the review exists and belongs to the material
    review_query = select(MaterialReviewDB).where(
        MaterialReviewDB.review_id == review_id,
        MaterialReviewDB.material_number == material_number,
    )
    result = await db.exec(review_query)
    review = result.first()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    # Validate assigned users have the required permissions
    # SME validation only if SME is provided
    if data.sme_user_id:
        sme_permissions = await get_user_permissions(str(data.sme_user_id), db)
        if "can_provide_sme_review" not in sme_permissions:
            # Check if user is admin
            is_sme_admin = await check_user_is_admin(str(data.sme_user_id), db)
            if not is_sme_admin:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Selected SME user does not have SME review permission",
                )

    approver_permissions = await get_user_permissions(str(data.approver_user_id), db)
    if "can_approve_reviews" not in approver_permissions:
        # Check if user is admin
        is_approver_admin = await check_user_is_admin(str(data.approver_user_id), db)
        if not is_approver_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected approver user does not have approval permission",
            )

    # Check for existing assignments and update or create
    existing_query = select(ReviewAssignmentDB).where(
        ReviewAssignmentDB.review_id == review_id,
        ReviewAssignmentDB.assignment_type.in_(["sme", "approver"]),
    )
    existing_result = await db.exec(existing_query)
    existing_assignments = {a.assignment_type: a for a in existing_result.all()}

    current_user_uuid = UUID(current_user.id)
    created_assignments = []

    # Create or update SME assignment (only if SME user is provided)
    if data.sme_user_id:
        if "sme" in existing_assignments:
            # Update existing
            sme_assignment = existing_assignments["sme"]
            old_user_id = sme_assignment.user_id
            if old_user_id != data.sme_user_id:
                sme_assignment.reassigned_from_user_id = old_user_id
                sme_assignment.reassigned_reason = "Reassigned during assignment step"
                sme_assignment.user_id = data.sme_user_id
                sme_assignment.status = "pending"
            sme_assignment.due_at = data.sme_due_at
            db.add(sme_assignment)
        else:
            # Create new
            sme_assignment = ReviewAssignmentDB(
                review_id=review_id,
                user_id=data.sme_user_id,
                assignment_type=AssignmentType.SME.value,
                status="pending",
                due_at=data.sme_due_at,
                assigned_by=current_user_uuid,
            )
            db.add(sme_assignment)
        created_assignments.append(sme_assignment)

    # Create or update Approver assignment
    if "approver" in existing_assignments:
        # Update existing
        approver_assignment = existing_assignments["approver"]
        old_user_id = approver_assignment.user_id
        if old_user_id != data.approver_user_id:
            approver_assignment.reassigned_from_user_id = old_user_id
            approver_assignment.reassigned_reason = "Reassigned during assignment step"
            approver_assignment.user_id = data.approver_user_id
            approver_assignment.status = "pending"
        approver_assignment.due_at = data.approver_due_at
        db.add(approver_assignment)
    else:
        # Create new
        approver_assignment = ReviewAssignmentDB(
            review_id=review_id,
            user_id=data.approver_user_id,
            assignment_type=AssignmentType.APPROVER.value,
            status="pending",
            due_at=data.approver_due_at,
            assigned_by=current_user_uuid,
        )
        db.add(approver_assignment)
    created_assignments.append(approver_assignment)

    # Update review status based on whether SME review is required
    config = None
    if review.proposed_action:
        config = await get_proposed_action_config(db, review.proposed_action)
    if is_sme_required(review.proposed_action, config):
        review.status = "pending_sme"
    else:
        # Skip SME step, go directly to pending_decision
        review.status = "pending_decision"
    db.add(review)

    await db.commit()

    # Refresh to get IDs
    for assignment in created_assignments:
        await db.refresh(assignment)

    # Record history for new assignments
    for assignment in created_assignments:
        history = ReviewAssignmentHistoryDB(
            assignment_id=assignment.assignment_id,
            action="created",
            to_user_id=assignment.user_id,
            performed_by=current_user_uuid,
        )
        db.add(history)

    await db.commit()

    # Send notifications
    notification_service = NotificationService(db)
    if data.sme_user_id:
        await notification_service.notify_review_assigned(
            review=review,
            assigned_to=data.sme_user_id,
            assigned_by=current_user_uuid,
        )
    await notification_service.notify_review_assigned(
        review=review,
        assigned_to=data.approver_user_id,
        assigned_by=current_user_uuid,
    )

    # Return the full updated review (same as other update endpoints)
    # This ensures the frontend gets fresh data immediately without needing a refetch
    review_service = ReviewService(db)
    return await review_service.build_review_response(review, user_role="admin")


@router.get("/users-by-permission")
async def get_users_by_permission(
    permission: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[UserWithPermission]:
    """Get users who have a specific permission, grouped by SME type.

    For SME picker: permission = "can_provide_sme_review"
    For Approver picker: permission = "can_approve_reviews"
    """
    # Validate permission name
    valid_permissions = ["can_provide_sme_review", "can_approve_reviews", "can_assign_reviews"]
    if permission not in valid_permissions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid permission. Must be one of: {valid_permissions}",
        )

    # Build the permission column reference dynamically
    permission_column = getattr(RoleDB, permission, None)
    if permission_column is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Permission {permission} not found",
        )

    # Query users with the specified permission through their roles
    query = (
        select(ProfileDB.id, ProfileDB.full_name, ProfileDB.email)
        .distinct()
        .join(UserRoleDB, ProfileDB.id == UserRoleDB.user_id)
        .join(RoleDB, UserRoleDB.role_id == RoleDB.role_id)
        .where(
            UserRoleDB.is_active.is_(True),
            RoleDB.is_active.is_(True),
            permission_column.is_(True),
        )
    )

    result = await db.exec(query)
    users_data = result.all()

    # Build user ID to profile mapping
    user_profiles: dict[UUID, dict] = {}
    for user_id, full_name, email in users_data:
        user_profiles[user_id] = {
            "user_id": user_id,
            "full_name": full_name or "Unknown",
            "email": email,
            "sme_types": [],
        }

    # If looking for SME permission, also get their expertise types
    if permission == "can_provide_sme_review":
        user_ids = list(user_profiles.keys())
        if user_ids:
            expertise_query = select(
                SMEExpertiseDB.user_id, SMEExpertiseDB.sme_type
            ).where(SMEExpertiseDB.user_id.in_(user_ids))
            expertise_result = await db.exec(expertise_query)

            for user_id, sme_type in expertise_result.all():
                if user_id in user_profiles and sme_type:
                    user_profiles[user_id]["sme_types"].append(sme_type)

    # Convert to response format
    # For users with multiple SME types, create multiple entries (one per type)
    response_users: list[UserWithPermission] = []

    for profile in user_profiles.values():
        sme_types = profile.get("sme_types", [])

        if sme_types:
            # Create an entry for each SME type
            for sme_type in sme_types:
                response_users.append(
                    UserWithPermission(
                        user_id=profile["user_id"],
                        full_name=profile["full_name"],
                        email=profile["email"],
                        sme_type=sme_type,
                        sme_types=sme_types,
                    )
                )
        else:
            # User has permission but no specific SME types
            response_users.append(
                UserWithPermission(
                    user_id=profile["user_id"],
                    full_name=profile["full_name"],
                    email=profile["email"],
                    sme_type=None,
                    sme_types=None,
                )
            )

    # Sort by SME type (None last), then by name
    response_users.sort(key=lambda u: (u.sme_type is None, u.sme_type or "", u.full_name))

    return response_users
