"""Startup recovery: a restart must not leave a file at INDEXING for ever.

Runs against a real database: the whole fix is two UPDATE statements, and a
mocked session would only check that they were called, not what they match.
"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

import app.models  # noqa: F401  -- registers every table before create_all
from app.db.database import make_engine
from app.schemas.course import Course
from app.schemas.file import File as FileRow
from app.schemas.file import FileStatus
from app.schemas.folder import Folder
from app.schemas.ingestion_run import IngestionRun, IngestionRunStatus
from app.schemas.user import User
from app.services.processing import INTERRUPTED_MESSAGE, recover_interrupted_ingestion


@pytest_asyncio.fixture
async def maker(test_database_url):
    engine = make_engine(test_database_url)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    yield async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    await engine.dispose()


async def _seed(session: AsyncSession) -> dict:
    """One file per FILE status, each with one run in the matching state."""
    user = User(email=f"{uuid4().hex[:8]}@x.com", hashed_password="x")
    session.add(user)
    await session.flush()
    assert user.id is not None
    course = Course(user_id=user.id, code="CST235", name="NLP", year=2, sem=2)
    session.add(course)
    await session.flush()
    assert course.id is not None
    folder = Folder(course_id=course.id, name="root", is_root=True, sort_order=0)
    session.add(folder)
    await session.flush()
    assert folder.id is not None

    run_status = {
        FileStatus.UPLOADED: IngestionRunStatus.QUEUED,
        FileStatus.PROCESSING: IngestionRunStatus.PROCESSING,
        FileStatus.READY: IngestionRunStatus.READY,
        FileStatus.FAILED: IngestionRunStatus.FAILED,
    }
    ids = {}
    for file_status, status in run_status.items():
        row = FileRow(
            course_id=course.id,
            folder_id=folder.id,
            filename=f"{file_status.value}.pdf",
            storage_key=f"k/{uuid4()}",
            mime_type="application/pdf",
            size_bytes=1,
            status=file_status,
            uploaded_at=datetime.now(UTC),
        )
        session.add(row)
        await session.flush()
        assert row.id is not None
        run = IngestionRun(
            file_id=row.id,
            status=status,
            chunker_version="v",
            embedding_model="m",
            embedding_dim=1024,
            is_active=status == IngestionRunStatus.READY,
        )
        session.add(run)
        await session.flush()
        ids[file_status] = (row.id, run.id)
    await session.commit()
    return ids


@pytest.mark.asyncio
async def test_restart_fails_processing_files_and_unfinished_runs(maker):
    async with maker() as session:
        ids = await _seed(session)

    async with maker() as session:
        assert await recover_interrupted_ingestion(session) == (1, 2)

    async with maker() as session:
        after = {}
        for file_status, (file_id, run_id) in ids.items():
            row = await session.get(FileRow, file_id)
            run = await session.get(IngestionRun, run_id)
            assert row is not None and run is not None
            after[file_status] = (row.status, run.status)

        stuck = await session.get(FileRow, ids[FileStatus.PROCESSING][0])
        assert stuck is not None
        assert stuck.error_message == INTERRUPTED_MESSAGE

    assert after == {
        # "Start indexing" already exists for this one; only its run is closed.
        FileStatus.UPLOADED: (FileStatus.UPLOADED, IngestionRunStatus.FAILED),
        # The INDEXING-for-ever file: now FAILED, so the explorer offers Retry.
        FileStatus.PROCESSING: (FileStatus.FAILED, IngestionRunStatus.FAILED),
        FileStatus.READY: (FileStatus.READY, IngestionRunStatus.READY),
        FileStatus.FAILED: (FileStatus.FAILED, IngestionRunStatus.FAILED),
    }


@pytest.mark.asyncio
async def test_clean_start_changes_nothing(maker):
    async with maker() as session:
        assert await recover_interrupted_ingestion(session) == (0, 0)
