"""Lookup options API endpoints for configurable dropdown options."""

from datetime import datetime
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.lookup import (
    LookupOption,
    LookupOptionCreate,
    LookupOptionUpdate,
    LookupOptionHistory,
    LookupOptionInGroup,
    LookupOptionGroup,
    LookupOptionsGrouped,
)
from app.models.db_models import LookupOptionDB, LookupOptionHistoryDB, ProfileDB
from app.core.database import get_db
from app.core.auth import get_current_user, User

router = APIRouter()


async def require_admin(current_user: User, db: AsyncSession) -> None:
    """Check if current user is an admin. Raises 403 if not."""
    profile_query = select(ProfileDB).where(ProfileDB.id == current_user.id)
    profile_result = await db.exec(profile_query)
    profile = profile_result.first()

    if not profile or not profile.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required to manage lookup options",
        )


def db_to_response(option: LookupOptionDB) -> LookupOption:
    """Convert database model to response model."""
    return LookupOption(
        option_id=option.option_id,
        category=option.category,
        value=option.value,
        label=option.label,
        description=option.description,
        color=option.color,
        group_name=option.group_name,
        group_order=option.group_order,
        sort_order=option.sort_order,
        is_active=option.is_active,
        created_by=option.created_by,
        created_at=option.created_at,
        updated_by=option.updated_by,
        updated_at=option.updated_at,
    )


def options_to_grouped(category: str, options: list[LookupOptionDB]) -> LookupOptionsGrouped:
    """Convert a list of options to grouped response."""
    # Group options by group_name
    groups_dict: dict[str | None, list[LookupOptionInGroup]] = {}

    for opt in options:
        group_key = opt.group_name
        if group_key not in groups_dict:
            groups_dict[group_key] = []
        groups_dict[group_key].append(LookupOptionInGroup(
            option_id=opt.option_id,
            value=opt.value,
            label=opt.label,
            description=opt.description,
            color=opt.color,
            sort_order=opt.sort_order,
            is_active=opt.is_active,
        ))

    # Sort options within each group
    for opts in groups_dict.values():
        opts.sort(key=lambda x: x.sort_order)

    # Build groups list, sorted by group_order
    # Find group_order for each group_name from the first option in that group
    group_orders: dict[str | None, int] = {}
    for opt in options:
        if opt.group_name not in group_orders:
            group_orders[opt.group_name] = opt.group_order

    groups = [
        LookupOptionGroup(
            group_name=group_name,
            group_order=group_orders.get(group_name, 0),
            options=opts,
        )
        for group_name, opts in groups_dict.items()
    ]
    groups.sort(key=lambda g: g.group_order)

    # Flat list of all options
    all_options = [
        LookupOptionInGroup(
            option_id=opt.option_id,
            value=opt.value,
            label=opt.label,
            description=opt.description,
            color=opt.color,
            sort_order=opt.sort_order,
            is_active=opt.is_active,
        )
        for opt in sorted(options, key=lambda x: (x.group_order, x.sort_order))
    ]

    return LookupOptionsGrouped(
        category=category,
        groups=groups,
        options=all_options,
    )


async def record_history(
    db: AsyncSession,
    option_id: int,
    change_type: str,
    old_values: dict | None,
    new_values: dict | None,
    changed_by: str,
) -> None:
    """Record a change to the lookup options history table."""
    from uuid import UUID
    history = LookupOptionHistoryDB(
        option_id=option_id,
        change_type=change_type,
        old_values=old_values,
        new_values=new_values,
        changed_by=UUID(changed_by),
        changed_at=datetime.utcnow(),
    )
    db.add(history)


@router.get("/lookup-options")
async def list_all_lookup_options(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    include_inactive: bool = Query(False, description="Include inactive options"),
) -> dict[str, LookupOptionsGrouped]:
    """List all lookup options grouped by category."""
    query = select(LookupOptionDB)
    if not include_inactive:
        query = query.where(LookupOptionDB.is_active == True)
    query = query.order_by(LookupOptionDB.category, LookupOptionDB.group_order, LookupOptionDB.sort_order)

    result = await db.exec(query)
    options = result.all()

    # Group by category
    by_category: dict[str, list[LookupOptionDB]] = {}
    for opt in options:
        if opt.category not in by_category:
            by_category[opt.category] = []
        by_category[opt.category].append(opt)

    return {
        cat: options_to_grouped(cat, opts)
        for cat, opts in by_category.items()
    }


@router.get("/lookup-options/{category}")
async def list_lookup_options_by_category(
    category: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    include_inactive: bool = Query(False, description="Include inactive options"),
) -> LookupOptionsGrouped:
    """List lookup options for a specific category, grouped by group_name."""
    query = select(LookupOptionDB).where(LookupOptionDB.category == category)
    if not include_inactive:
        query = query.where(LookupOptionDB.is_active == True)
    query = query.order_by(LookupOptionDB.group_order, LookupOptionDB.sort_order)

    result = await db.exec(query)
    options = result.all()

    return options_to_grouped(category, list(options))


@router.get("/lookup-options/detail/{option_id}")
async def get_lookup_option(
    option_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LookupOption:
    """Get a single lookup option by ID."""
    query = select(LookupOptionDB).where(LookupOptionDB.option_id == option_id)
    result = await db.exec(query)
    option = result.first()

    if not option:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup option {option_id} not found",
        )

    return db_to_response(option)


@router.get("/lookup-options/detail/{option_id}/history")
async def get_lookup_option_history(
    option_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[LookupOptionHistory]:
    """Get change history for a lookup option. Admin only."""
    await require_admin(current_user, db)

    # Verify option exists
    option_query = select(LookupOptionDB).where(LookupOptionDB.option_id == option_id)
    option_result = await db.exec(option_query)
    if not option_result.first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup option {option_id} not found",
        )

    # Get history
    history_query = select(LookupOptionHistoryDB).where(
        LookupOptionHistoryDB.option_id == option_id
    ).order_by(LookupOptionHistoryDB.changed_at.desc())

    result = await db.exec(history_query)
    history_records = result.all()

    return [
        LookupOptionHistory(
            history_id=h.history_id,
            option_id=h.option_id,
            change_type=h.change_type,
            old_values=h.old_values,
            new_values=h.new_values,
            changed_by=h.changed_by,
            changed_at=h.changed_at,
        )
        for h in history_records
    ]


@router.post("/lookup-options", status_code=status.HTTP_201_CREATED)
async def create_lookup_option(
    option_data: LookupOptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LookupOption:
    """Create a new lookup option. Admin only."""
    await require_admin(current_user, db)

    # Check for duplicate category + value
    existing_query = select(LookupOptionDB).where(
        LookupOptionDB.category == option_data.category,
        LookupOptionDB.value == option_data.value,
    )
    existing_result = await db.exec(existing_query)
    if existing_result.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Option with category '{option_data.category}' and value '{option_data.value}' already exists",
        )

    # Create the option
    from uuid import UUID
    option_db = LookupOptionDB(
        category=option_data.category,
        value=option_data.value,
        label=option_data.label,
        description=option_data.description,
        color=option_data.color,
        group_name=option_data.group_name,
        group_order=option_data.group_order,
        sort_order=option_data.sort_order,
        is_active=True,
        created_by=UUID(current_user.id),
        updated_by=UUID(current_user.id),
    )

    try:
        db.add(option_db)
        await db.commit()
        await db.refresh(option_db)

        # Record history
        await record_history(
            db=db,
            option_id=option_db.option_id,
            change_type="created",
            old_values=None,
            new_values={
                "category": option_db.category,
                "value": option_db.value,
                "label": option_db.label,
                "description": option_db.description,
                "color": option_db.color,
                "group_name": option_db.group_name,
                "group_order": option_db.group_order,
                "sort_order": option_db.sort_order,
            },
            changed_by=current_user.id,
        )
        await db.commit()

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create lookup option: {str(e)}",
        )

    return db_to_response(option_db)


@router.put("/lookup-options/{option_id}")
async def update_lookup_option(
    option_id: int,
    option_data: LookupOptionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LookupOption:
    """Update an existing lookup option. Admin only."""
    await require_admin(current_user, db)

    # Get existing option
    query = select(LookupOptionDB).where(LookupOptionDB.option_id == option_id)
    result = await db.exec(query)
    option = result.first()

    if not option:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup option {option_id} not found",
        )

    # Capture old values for history
    old_values = {
        "label": option.label,
        "description": option.description,
        "color": option.color,
        "group_name": option.group_name,
        "group_order": option.group_order,
        "sort_order": option.sort_order,
        "is_active": option.is_active,
    }

    # Apply updates (only non-None values)
    update_data = option_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(option, field, value)

    # Update audit field
    from uuid import UUID
    option.updated_by = UUID(current_user.id)
    option.updated_at = datetime.utcnow()

    # Determine change type
    change_type = "updated"
    if "is_active" in update_data:
        if update_data["is_active"] is False and old_values["is_active"] is True:
            change_type = "deactivated"
        elif update_data["is_active"] is True and old_values["is_active"] is False:
            change_type = "reactivated"

    try:
        await db.commit()
        await db.refresh(option)

        # Record history
        new_values = {
            "label": option.label,
            "description": option.description,
            "color": option.color,
            "group_name": option.group_name,
            "group_order": option.group_order,
            "sort_order": option.sort_order,
            "is_active": option.is_active,
        }
        await record_history(
            db=db,
            option_id=option_id,
            change_type=change_type,
            old_values=old_values,
            new_values=new_values,
            changed_by=current_user.id,
        )
        await db.commit()

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update lookup option: {str(e)}",
        )

    return db_to_response(option)


@router.delete("/lookup-options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lookup_option(
    option_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft-delete a lookup option by setting is_active=False. Admin only."""
    await require_admin(current_user, db)

    # Get existing option
    query = select(LookupOptionDB).where(LookupOptionDB.option_id == option_id)
    result = await db.exec(query)
    option = result.first()

    if not option:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Lookup option {option_id} not found",
        )

    if not option.is_active:
        # Already inactive, nothing to do
        return

    # Capture old values for history
    old_values = {"is_active": True}

    # Soft delete
    from uuid import UUID
    option.is_active = False
    option.updated_by = UUID(current_user.id)
    option.updated_at = datetime.utcnow()

    try:
        await db.commit()

        # Record history
        await record_history(
            db=db,
            option_id=option_id,
            change_type="deactivated",
            old_values=old_values,
            new_values={"is_active": False},
            changed_by=current_user.id,
        )
        await db.commit()

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete lookup option: {str(e)}",
        )
