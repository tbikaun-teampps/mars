"""Role-based access control API endpoints."""

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlmodel import or_, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import User, get_current_user
from app.core.database import get_db
from app.models.db_models import (
    LookupOptionDB,
    ProfileDB,
    RoleDB,
    SMEExpertiseDB,
    UserRoleDB,
    UserRoleHistoryDB,
)
from app.models.rbac import (
    RoleListItem,
    RoleResponse,
    SMEExpertiseCreate,
    SMEExpertiseResponse,
    SMEExpertiseUpdate,
    UserListItem,
    UserRoleCreate,
    UserRoleResponse,
    UserRoleUpdate,
)

router = APIRouter()

# Permission field names for iteration
PERMISSION_FIELDS = [
    "can_create_reviews",
    "can_edit_reviews",
    "can_delete_reviews",
    "can_approve_reviews",
    "can_provide_sme_review",
    "can_assign_reviews",
    "can_manage_users",
    "can_manage_settings",
    "can_view_all_reviews",
    "can_export_data",
    "can_manage_acknowledgements",
    "can_upload_data",
]


# ============================================================================
# SECURITY HELPER FUNCTIONS
# ============================================================================


async def get_user_permissions(user_id: str, db: AsyncSession) -> list[str]:
    """Get aggregated permissions for a user from all their active roles."""
    today = date.today()

    query = (
        select(RoleDB)
        .join(UserRoleDB, UserRoleDB.role_id == RoleDB.role_id)
        .where(
            UserRoleDB.user_id == UUID(user_id),
            UserRoleDB.is_active.is_(True),
            RoleDB.is_active.is_(True),
            or_(UserRoleDB.valid_to.is_(None), UserRoleDB.valid_to >= today),
            or_(UserRoleDB.valid_from.is_(None), UserRoleDB.valid_from <= today),
        )
    )
    result = await db.exec(query)
    roles = result.all()

    # Aggregate permissions (OR logic - if any role has permission, user has it)
    permissions = {perm: False for perm in PERMISSION_FIELDS}

    for role in roles:
        for perm in PERMISSION_FIELDS:
            if getattr(role, perm, False):
                permissions[perm] = True

    return [perm for perm in permissions if permissions[perm]]


async def require_user_admin(current_user: User, db: AsyncSession) -> list[str]:
    """
    Check if current user has can_manage_users permission.
    Returns their permissions list for use in privilege escalation checks.
    """
    return await get_user_permissions(current_user.id, db)


async def check_privilege_escalation(
    assigner_permissions: list[str],
    role: RoleDB,
) -> None:
    """
    SECURITY: Prevent privilege escalation.
    User cannot assign a role that has permissions they don't have.
    """
    for perm in PERMISSION_FIELDS:
        role_has_perm = getattr(role, perm, False)
        assigner_has_perm = perm in assigner_permissions

        if role_has_perm and not assigner_has_perm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cannot assign role with '{perm}' permission that you don't have",
            )


async def check_admin_self_demotion(
    current_user_id: str,
    target_user_id: UUID,
    role: RoleDB,
) -> None:
    """
    SECURITY: Prevent admin from removing their own admin role.
    """
    if str(target_user_id) != current_user_id:
        return  # Not self-modification

    if role.role_code in ("system_admin", "user_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove your own admin role. Ask another admin.",
        )


async def check_last_system_admin(
    target_user_id: UUID,
    role: RoleDB,
    db: AsyncSession,
) -> None:
    """
    SECURITY: Prevent orphaning the system by removing the last system_admin.
    """
    if role.role_code != "system_admin":
        return

    today = date.today()

    # Count other active system_admin assignments
    count_query = (
        select(UserRoleDB)
        .join(RoleDB, RoleDB.role_id == UserRoleDB.role_id)
        .where(
            RoleDB.role_code == "system_admin",
            UserRoleDB.is_active.is_(True),
            UserRoleDB.user_id != target_user_id,
            or_(UserRoleDB.valid_to.is_(None), UserRoleDB.valid_to >= today),
        )
    )
    result = await db.exec(count_query)
    other_admins = result.all()

    if len(other_admins) == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove the last system administrator",
        )


async def record_user_role_history(
    db: AsyncSession,
    user_role_id: int,
    action: str,
    old_values: dict | None,
    new_values: dict | None,
    performed_by: str,
) -> None:
    """Record a change to the user_role_history table."""
    history = UserRoleHistoryDB(
        user_role_id=user_role_id,
        action=action,
        old_values=old_values,
        new_values=new_values,
        performed_by=UUID(performed_by),
        performed_at=datetime.utcnow(),
    )
    db.add(history)


async def check_user_is_admin(
    user_id: str,
    db: AsyncSession,
) -> bool:
    """Check if a user has system admin privileges based on their associated roles."""
    today = date.today()

    query = (
        select(RoleDB)
        .join(UserRoleDB, UserRoleDB.role_id == RoleDB.role_id)
        .where(
            UserRoleDB.user_id == UUID(user_id),
            UserRoleDB.is_active.is_(True),
            RoleDB.is_active.is_(True),
            or_(UserRoleDB.valid_to.is_(None), UserRoleDB.valid_to >= today),
            or_(UserRoleDB.valid_from.is_(None), UserRoleDB.valid_from <= today),
        )
    )
    result = await db.exec(query)
    roles = result.all()

    for role in roles:
        if role.role_type == "admin":
            return True
    return False


# ============================================================================
# ROLES ENDPOINTS (Read-only)
# ============================================================================


@router.get("/roles")
async def list_roles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    include_inactive: bool = Query(False),
    role_type: Optional[str] = Query(None),
) -> list[RoleListItem]:
    """List all roles (requires authentication)."""
    query = select(RoleDB)

    if not include_inactive:
        query = query.where(RoleDB.is_active.is_(True))
    if role_type:
        query = query.where(RoleDB.role_type == role_type)

    query = query.order_by(RoleDB.role_type, RoleDB.role_name)

    result = await db.exec(query)
    roles = result.all()

    return [RoleListItem.model_validate(r) for r in roles]


@router.get("/roles/{role_id}")
async def get_role(
    role_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RoleResponse:
    """Get role details (requires authentication)."""
    query = select(RoleDB).where(RoleDB.role_id == role_id)
    result = await db.exec(query)
    role = result.first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )

    return RoleResponse.model_validate(role)


# ============================================================================
# USER-ROLE ENDPOINTS (Full CRUD with security)
# ============================================================================


@router.get("/user-roles")
async def list_user_roles(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_id: Optional[UUID] = Query(None),
    role_id: Optional[int] = Query(None),
    include_inactive: bool = Query(False),
) -> list[UserRoleResponse]:
    """List user-role assignments. Requires can_manage_users."""
    await require_user_admin(current_user, db)

    query = (
        select(UserRoleDB, RoleDB, ProfileDB).join(RoleDB, RoleDB.role_id == UserRoleDB.role_id).join(ProfileDB, ProfileDB.id == UserRoleDB.user_id)
    )

    if not include_inactive:
        query = query.where(UserRoleDB.is_active.is_(True))
    if user_id:
        query = query.where(UserRoleDB.user_id == user_id)
    if role_id:
        query = query.where(UserRoleDB.role_id == role_id)

    query = query.order_by(ProfileDB.full_name, RoleDB.role_name)

    result = await db.exec(query)
    rows = result.all()

    responses = []
    for ur, role, profile in rows:
        # Get assigner name if available
        assigner_name = None
        if ur.assigned_by:
            assigner_query = select(ProfileDB).where(ProfileDB.id == ur.assigned_by)
            assigner_result = await db.exec(assigner_query)
            assigner = assigner_result.first()
            if assigner:
                assigner_name = assigner.full_name

        responses.append(
            UserRoleResponse(
                user_role_id=ur.user_role_id,
                user_id=ur.user_id,
                user_name=profile.full_name,
                user_email=getattr(profile, "email", None),
                role_id=role.role_id,
                role_code=role.role_code,
                role_name=role.role_name,
                role_type=role.role_type,
                valid_from=ur.valid_from,
                valid_to=ur.valid_to,
                assigned_by=ur.assigned_by,
                assigned_by_name=assigner_name,
                assigned_at=ur.assigned_at,
                is_active=ur.is_active,
            )
        )

    return responses


@router.post("/user-roles", status_code=status.HTTP_201_CREATED)
async def create_user_role(
    data: UserRoleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRoleResponse:
    """Assign a role to a user. Security checks applied."""
    assigner_perms = await require_user_admin(current_user, db)

    # Get the role being assigned
    role_query = select(RoleDB).where(RoleDB.role_id == data.role_id)
    role_result = await db.exec(role_query)
    role = role_result.first()

    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found",
        )
    if not role.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign inactive role",
        )

    # SECURITY: Check privilege escalation
    await check_privilege_escalation(assigner_perms, role)

    # Check user exists
    user_query = select(ProfileDB).where(ProfileDB.id == data.user_id)
    user_result = await db.exec(user_query)
    user = user_result.first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check for existing active assignment
    existing_query = select(UserRoleDB).where(
        UserRoleDB.user_id == data.user_id,
        UserRoleDB.role_id == data.role_id,
        UserRoleDB.is_active.is_(True),
    )
    existing_result = await db.exec(existing_query)

    if existing_result.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has this role",
        )

    # Create assignment
    user_role = UserRoleDB(
        user_id=data.user_id,
        role_id=data.role_id,
        valid_from=data.valid_from or date.today(),
        valid_to=data.valid_to,
        assigned_by=UUID(current_user.id),
        assigned_at=datetime.utcnow(),
        is_active=True,
    )

    try:
        db.add(user_role)
        await db.commit()
        await db.refresh(user_role)

        # Record history
        await record_user_role_history(
            db=db,
            user_role_id=user_role.user_role_id,
            action="assigned",
            old_values=None,
            new_values={
                "role_id": data.role_id,
                "role_code": role.role_code,
                "valid_from": str(user_role.valid_from) if user_role.valid_from else None,
                "valid_to": str(user_role.valid_to) if user_role.valid_to else None,
            },
            performed_by=current_user.id,
        )
        await db.commit()

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user-role assignment: {str(e)}",
        )

    return UserRoleResponse(
        user_role_id=user_role.user_role_id,
        user_id=user_role.user_id,
        user_name=user.full_name,
        user_email=getattr(user, "email", None),
        role_id=role.role_id,
        role_code=role.role_code,
        role_name=role.role_name,
        role_type=role.role_type,
        valid_from=user_role.valid_from,
        valid_to=user_role.valid_to,
        assigned_by=user_role.assigned_by,
        assigned_at=user_role.assigned_at,
        is_active=user_role.is_active,
    )


@router.put("/user-roles/{user_role_id}")
async def update_user_role(
    user_role_id: int,
    data: UserRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserRoleResponse:
    """Update user-role validity period."""
    await require_user_admin(current_user, db)

    # Get existing assignment with role and user info
    query = (
        select(UserRoleDB, RoleDB, ProfileDB)
        .join(RoleDB, RoleDB.role_id == UserRoleDB.role_id)
        .join(ProfileDB, ProfileDB.id == UserRoleDB.user_id)
        .where(UserRoleDB.user_role_id == user_role_id)
    )
    result = await db.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User-role assignment not found",
        )

    user_role, role, user = row

    # Capture old values
    old_values = {
        "valid_from": str(user_role.valid_from) if user_role.valid_from else None,
        "valid_to": str(user_role.valid_to) if user_role.valid_to else None,
    }

    # Apply updates
    if data.valid_from is not None:
        user_role.valid_from = data.valid_from
    if data.valid_to is not None:
        user_role.valid_to = data.valid_to

    try:
        await db.commit()
        await db.refresh(user_role)

        # Record history
        await record_user_role_history(
            db=db,
            user_role_id=user_role.user_role_id,
            action="updated",
            old_values=old_values,
            new_values={
                "valid_from": str(user_role.valid_from) if user_role.valid_from else None,
                "valid_to": str(user_role.valid_to) if user_role.valid_to else None,
            },
            performed_by=current_user.id,
        )
        await db.commit()

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user-role assignment: {str(e)}",
        )

    return UserRoleResponse(
        user_role_id=user_role.user_role_id,
        user_id=user_role.user_id,
        user_name=user.full_name,
        user_email=getattr(user, "email", None),
        role_id=role.role_id,
        role_code=role.role_code,
        role_name=role.role_name,
        role_type=role.role_type,
        valid_from=user_role.valid_from,
        valid_to=user_role.valid_to,
        assigned_by=user_role.assigned_by,
        assigned_at=user_role.assigned_at,
        is_active=user_role.is_active,
    )


@router.delete("/user-roles/{user_role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_user_role(
    user_role_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Revoke (soft-delete) a user-role assignment. Security checks applied."""
    assigner_perms = await require_user_admin(current_user, db)

    # Get existing assignment
    query = select(UserRoleDB, RoleDB).join(RoleDB, RoleDB.role_id == UserRoleDB.role_id).where(UserRoleDB.user_role_id == user_role_id)
    result = await db.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User-role assignment not found",
        )

    user_role, role = row

    if not user_role.is_active:
        return  # Already revoked

    # SECURITY: Check privilege escalation (need permission to revoke roles you could assign)
    await check_privilege_escalation(assigner_perms, role)

    # SECURITY: Check self-demotion
    await check_admin_self_demotion(current_user.id, user_role.user_id, role)

    # SECURITY: Check last system admin
    await check_last_system_admin(user_role.user_id, role, db)

    # Soft-delete
    user_role.is_active = False
    user_role.revoked_by = UUID(current_user.id)
    user_role.revoked_at = datetime.utcnow()

    try:
        await db.commit()

        # Record history
        await record_user_role_history(
            db=db,
            user_role_id=user_role.user_role_id,
            action="revoked",
            old_values={"is_active": True},
            new_values={"is_active": False},
            performed_by=current_user.id,
        )
        await db.commit()

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to revoke user-role assignment: {str(e)}",
        )


# ============================================================================
# SME EXPERTISE ENDPOINTS
# ============================================================================


@router.get("/sme-expertise")
async def list_sme_expertise(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    user_id: Optional[UUID] = Query(None),
    sme_type: Optional[str] = Query(None),
    is_available: Optional[bool] = Query(None),
) -> list[SMEExpertiseResponse]:
    """List SME expertise records. Requires can_manage_users."""
    await require_user_admin(current_user, db)

    query = select(SMEExpertiseDB, ProfileDB).join(ProfileDB, ProfileDB.id == SMEExpertiseDB.user_id)

    if user_id:
        query = query.where(SMEExpertiseDB.user_id == user_id)
    if sme_type:
        query = query.where(SMEExpertiseDB.sme_type == sme_type)
    if is_available is not None:
        query = query.where(SMEExpertiseDB.is_available == is_available)

    query = query.order_by(ProfileDB.full_name, SMEExpertiseDB.sme_type)

    result = await db.exec(query)
    rows = result.all()

    responses = []
    for expertise, profile in rows:
        # Get SME type label from lookup_options
        sme_type_label = None
        lookup_query = select(LookupOptionDB).where(
            LookupOptionDB.category == "sme_type",
            LookupOptionDB.value == expertise.sme_type,
        )
        lookup_result = await db.exec(lookup_query)
        lookup = lookup_result.first()
        if lookup:
            sme_type_label = lookup.label

        # Get backup user name if set
        backup_user_name = None
        if expertise.backup_user_id:
            backup_query = select(ProfileDB).where(ProfileDB.id == expertise.backup_user_id)
            backup_result = await db.exec(backup_query)
            backup_user = backup_result.first()
            if backup_user:
                backup_user_name = backup_user.full_name

        responses.append(
            SMEExpertiseResponse(
                expertise_id=expertise.expertise_id,
                user_id=expertise.user_id,
                user_name=profile.full_name,
                user_email=getattr(profile, "email", None),
                sme_type=expertise.sme_type,
                sme_type_label=sme_type_label,
                material_group=expertise.material_group,
                plant=expertise.plant,
                max_concurrent_reviews=expertise.max_concurrent_reviews,
                current_review_count=expertise.current_review_count,
                is_available=expertise.is_available,
                unavailable_until=expertise.unavailable_until,
                unavailable_reason=expertise.unavailable_reason,
                backup_user_id=expertise.backup_user_id,
                backup_user_name=backup_user_name,
                created_at=expertise.created_at,
                updated_at=expertise.updated_at,
            )
        )

    return responses


@router.post("/sme-expertise", status_code=status.HTTP_201_CREATED)
async def create_sme_expertise(
    data: SMEExpertiseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SMEExpertiseResponse:
    """Create SME expertise record. Validates sme_type against lookup_options."""
    await require_user_admin(current_user, db)

    # VALIDATION: Check sme_type exists in lookup_options
    lookup_query = select(LookupOptionDB).where(
        LookupOptionDB.category == "sme_type",
        LookupOptionDB.value == data.sme_type,
        LookupOptionDB.is_active.is_(True),
    )
    lookup_result = await db.exec(lookup_query)
    lookup = lookup_result.first()

    if not lookup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sme_type '{data.sme_type}'. Must be an active value in lookup_options.",
        )

    # Check user exists
    user_query = select(ProfileDB).where(ProfileDB.id == data.user_id)
    user_result = await db.exec(user_query)
    user = user_result.first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Check for duplicate
    existing_query = select(SMEExpertiseDB).where(
        SMEExpertiseDB.user_id == data.user_id,
        SMEExpertiseDB.sme_type == data.sme_type,
        SMEExpertiseDB.material_group == data.material_group,
        SMEExpertiseDB.plant == data.plant,
    )
    existing_result = await db.exec(existing_query)

    if existing_result.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate SME expertise entry",
        )

    # Validate backup user if provided
    if data.backup_user_id:
        backup_query = select(ProfileDB).where(ProfileDB.id == data.backup_user_id)
        backup_result = await db.exec(backup_query)
        if not backup_result.first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup user not found",
            )

    # Create
    expertise = SMEExpertiseDB(
        user_id=data.user_id,
        sme_type=data.sme_type,
        material_group=data.material_group,
        plant=data.plant,
        max_concurrent_reviews=data.max_concurrent_reviews,
        backup_user_id=data.backup_user_id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    try:
        db.add(expertise)
        await db.commit()
        await db.refresh(expertise)

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create SME expertise: {str(e)}",
        )

    return SMEExpertiseResponse(
        expertise_id=expertise.expertise_id,
        user_id=expertise.user_id,
        user_name=user.full_name,
        user_email=getattr(user, "email", None),
        sme_type=expertise.sme_type,
        sme_type_label=lookup.label,
        material_group=expertise.material_group,
        plant=expertise.plant,
        max_concurrent_reviews=expertise.max_concurrent_reviews,
        current_review_count=expertise.current_review_count,
        is_available=expertise.is_available,
        unavailable_until=expertise.unavailable_until,
        unavailable_reason=expertise.unavailable_reason,
        backup_user_id=expertise.backup_user_id,
        created_at=expertise.created_at,
        updated_at=expertise.updated_at,
    )


@router.put("/sme-expertise/{expertise_id}")
async def update_sme_expertise(
    expertise_id: int,
    data: SMEExpertiseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SMEExpertiseResponse:
    """Update SME expertise record."""
    await require_user_admin(current_user, db)

    query = (
        select(SMEExpertiseDB, ProfileDB).join(ProfileDB, ProfileDB.id == SMEExpertiseDB.user_id).where(SMEExpertiseDB.expertise_id == expertise_id)
    )
    result = await db.exec(query)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SME expertise not found",
        )

    expertise, user = row

    # If sme_type is being changed, validate it
    if data.sme_type is not None:
        lookup_query = select(LookupOptionDB).where(
            LookupOptionDB.category == "sme_type",
            LookupOptionDB.value == data.sme_type,
            LookupOptionDB.is_active.is_(True),
        )
        lookup_result = await db.exec(lookup_query)
        if not lookup_result.first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sme_type '{data.sme_type}'",
            )

    # Validate backup user if being changed
    if data.backup_user_id is not None:
        backup_query = select(ProfileDB).where(ProfileDB.id == data.backup_user_id)
        backup_result = await db.exec(backup_query)
        if not backup_result.first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup user not found",
            )

    # Apply updates
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expertise, field, value)
    expertise.updated_at = datetime.utcnow()

    try:
        await db.commit()
        await db.refresh(expertise)

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update SME expertise: {str(e)}",
        )

    # Get SME type label
    sme_type_label = None
    lookup_query = select(LookupOptionDB).where(
        LookupOptionDB.category == "sme_type",
        LookupOptionDB.value == expertise.sme_type,
    )
    lookup_result = await db.exec(lookup_query)
    lookup = lookup_result.first()
    if lookup:
        sme_type_label = lookup.label

    # Get backup user name
    backup_user_name = None
    if expertise.backup_user_id:
        backup_query = select(ProfileDB).where(ProfileDB.id == expertise.backup_user_id)
        backup_result = await db.exec(backup_query)
        backup_user = backup_result.first()
        if backup_user:
            backup_user_name = backup_user.full_name

    return SMEExpertiseResponse(
        expertise_id=expertise.expertise_id,
        user_id=expertise.user_id,
        user_name=user.full_name,
        user_email=getattr(user, "email", None),
        sme_type=expertise.sme_type,
        sme_type_label=sme_type_label,
        material_group=expertise.material_group,
        plant=expertise.plant,
        max_concurrent_reviews=expertise.max_concurrent_reviews,
        current_review_count=expertise.current_review_count,
        is_available=expertise.is_available,
        unavailable_until=expertise.unavailable_until,
        unavailable_reason=expertise.unavailable_reason,
        backup_user_id=expertise.backup_user_id,
        backup_user_name=backup_user_name,
        created_at=expertise.created_at,
        updated_at=expertise.updated_at,
    )


@router.delete("/sme-expertise/{expertise_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sme_expertise(
    expertise_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete SME expertise record (hard delete)."""
    await require_user_admin(current_user, db)

    query = select(SMEExpertiseDB).where(SMEExpertiseDB.expertise_id == expertise_id)
    result = await db.exec(query)
    expertise = result.first()

    if not expertise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SME expertise not found",
        )

    try:
        await db.delete(expertise)
        await db.commit()

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete SME expertise: {str(e)}",
        )


# ============================================================================
# USERS LIST ENDPOINT (for picker)
# ============================================================================


@router.get("/users")
async def list_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True),
) -> list[UserListItem]:
    """List users for picker components. Requires can_manage_users."""
    await require_user_admin(current_user, db)

    query = select(ProfileDB)

    if is_active is not None:
        # Check if is_active column exists on profile
        if hasattr(ProfileDB, "is_active"):
            query = query.where(ProfileDB.is_active == is_active)

    if search:
        search_pattern = f"%{search}%"
        if hasattr(ProfileDB, "email"):
            query = query.where(
                or_(
                    ProfileDB.full_name.ilike(search_pattern),
                    ProfileDB.email.ilike(search_pattern),
                )
            )
        else:
            query = query.where(ProfileDB.full_name.ilike(search_pattern))

    query = query.order_by(ProfileDB.full_name)

    result = await db.exec(query)
    profiles = result.all()

    return [
        UserListItem(
            user_id=p.id,
            full_name=p.full_name,
            email=getattr(p, "email", None),
            is_active=getattr(p, "is_active", True),
        )
        for p in profiles
    ]
