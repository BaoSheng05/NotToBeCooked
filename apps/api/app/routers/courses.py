from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.database import get_session
from app.dependencies.auth import get_current_user
from app.schemas.course import Course, CourseCreate, CourseRead, CourseStatus, CourseUpdate
from app.schemas.folder import Folder

courses_router = APIRouter(dependencies=[Depends(get_current_user)])
DEFAULT_COURSE_FOLDERS = (
    "Course Planner",
    "Lecture Slides",
    "Tutorials",
    "Past Year Papers",
    "Other",
)


def _duplicate_course(code: str, year: int, sem: int) -> HTTPException:
    """uq_course_user_code_year_sem, said in words the form can show.

    Until 11 October 2026 the IntegrityError went out as a 500, so adding a
    course twice read as the server breaking. An archived course holds its
    code too -- deleting archives, it does not remove -- hence the second
    sentence.
    """
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=(
            f"You already have {code} in Year {year}, Semester {sem}. "
            "If you deleted it earlier, it still holds that code."
        ),
    )


@courses_router.post(
    "",
    response_model=CourseRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_course(
    data: CourseCreate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> CourseRead:

    user_id = UUID(user["sub"])
    course = Course(
        user_id=user_id,
        code=data.code,
        name=data.name,
        year=data.year,
        sem=data.sem,
    )

    session.add(course)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise _duplicate_course(data.code, data.year, data.sem) from None
    if course.id is None:
        raise RuntimeError("Course ID was not generated")
    folders = [
        Folder(
            course_id=course.id,
            parent_folder_id=None,
            name=folder_name,
            is_root=True,
            sort_order=sort_order,
        )
        for sort_order, folder_name in enumerate(DEFAULT_COURSE_FOLDERS)
    ]
    session.add_all(folders)
    await session.commit()
    await session.refresh(course)
    return CourseRead.model_validate(course)


@courses_router.get(
    "",
    response_model=list[CourseRead],
)
async def list_courses(
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> list[CourseRead]:
    user_id = UUID(user["sub"])

    statement = select(Course).where(
        col(Course.user_id) == user_id,
        col(Course.status) == CourseStatus.ACTIVE,
    )
    result = await session.exec(statement)
    courses = result.all()
    return [CourseRead.model_validate(course) for course in courses]


@courses_router.patch(
    "/{course_id}",
    response_model=CourseRead,
)
async def update_course(
    course_id: UUID,
    data: CourseUpdate,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> CourseRead:

    user_id = UUID(user["sub"])
    statement = select(Course).where(col(Course.user_id) == user_id, col(Course.id) == course_id)

    course = (await session.exec(statement)).first()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    if data.code is not None:
        course.code = data.code
    if data.name is not None:
        course.name = data.name
    if data.year is not None:
        course.year = data.year
    if data.sem is not None:
        course.sem = data.sem
    if data.status is not None:
        course.status = data.status

    # Read before the commit: a rollback expires the row, and touching an
    # expired attribute afterwards is a lazy load an async session cannot do.
    key = (course.code, course.year, course.sem)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise _duplicate_course(*key) from None
    await session.refresh(course)
    return CourseRead.model_validate(course)


@courses_router.delete(
    "/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_course(
    course_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: dict = Depends(get_current_user),
) -> None:

    user_id = UUID(user["sub"])
    statement = select(Course).where(
        col(Course.user_id) == user_id,
        col(Course.id) == course_id,
    )
    course = (await session.exec(statement)).first()

    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    course.status = CourseStatus.ARCHIVED

    await session.commit()
