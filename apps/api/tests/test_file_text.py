"""GET /files/{id}/text: the indexed text the reader previews (US-08).

Real database: what matters is which chunks the join picks -- the active run
only, in chunk order -- and a mocked session would pick whatever it was told.
"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

import app.models  # noqa: F401  -- registers every table before create_all
from app.db.database import get_session, make_engine
from app.dependencies.auth import get_current_user
from app.main import app
from app.schemas.chunk import Chunk
from app.schemas.course import Course
from app.schemas.file import File as FileRow
from app.schemas.file import FileStatus
from app.schemas.folder import Folder
from app.schemas.ingestion_run import IngestionRun, IngestionRunStatus
from app.schemas.user import User


def _file(course_id, folder_id, name, status):
    return FileRow(
        course_id=course_id,
        folder_id=folder_id,
        filename=name,
        storage_key=f"k/{uuid4()}",
        mime_type="application/octet-stream",
        size_bytes=1,
        status=status,
        uploaded_at=datetime.now(UTC),
    )


def _run(file_id, *, active):
    return IngestionRun(
        file_id=file_id,
        status=IngestionRunStatus.READY,
        chunker_version="v",
        embedding_model="m",
        embedding_dim=1024,
        is_active=active,
    )


def _chunk(run, file_row, index, page, text):
    return Chunk(
        ingestion_run_id=run.id,
        file_id=file_row.id,
        course_id=file_row.course_id,
        chunk_index=index,
        page_start=page,
        page_end=page,
        content=text,
        token_count=1,
        embedding=[0.0] * 1024,
    )


@pytest_asyncio.fixture
async def ctx(test_database_url):
    engine = make_engine(test_database_url)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with maker() as session:
        me, stranger = (User(email=f"{uuid4().hex[:8]}@x.com", hashed_password="x") for _ in "ab")
        session.add_all([me, stranger])
        await session.flush()
        mine = Course(user_id=me.id, code="CST235", name="NLP", year=2, sem=2)  # pyright: ignore[reportArgumentType]
        theirs = Course(user_id=stranger.id, code="X", name="X", year=1, sem=1)  # pyright: ignore[reportArgumentType]
        session.add_all([mine, theirs])
        await session.flush()
        my_folder = Folder(course_id=mine.id, name="root", is_root=True, sort_order=0)  # pyright: ignore[reportArgumentType]
        their_folder = Folder(course_id=theirs.id, name="root", is_root=True, sort_order=0)  # pyright: ignore[reportArgumentType]
        session.add_all([my_folder, their_folder])
        await session.flush()

        deck = _file(mine.id, my_folder.id, "Part 4.pptx", FileStatus.READY)
        pending = _file(mine.id, my_folder.id, "notes.docx", FileStatus.PROCESSING)
        other = _file(theirs.id, their_folder.id, "secret.docx", FileStatus.READY)
        session.add_all([deck, pending, other])
        await session.flush()

        old_run, new_run = _run(deck.id, active=False), _run(deck.id, active=True)
        their_run = _run(other.id, active=True)
        session.add_all([old_run, new_run, their_run])
        await session.flush()
        session.add_all(
            [
                _chunk(new_run, deck, 1, 9, "Packetizing Routing Forwarding"),
                _chunk(new_run, deck, 0, 2, "Network layer overview"),
                _chunk(old_run, deck, 0, 2, "stale text from an earlier index"),
                _chunk(their_run, other, 0, 1, "not yours"),
            ]
        )
        await session.commit()
        ids = {"deck": deck.id, "pending": pending.id, "other": other.id}
        user_id = me.id

    async def override_session():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: {"sub": str(user_id)}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client, ids
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_text_is_the_active_run_in_chunk_order(ctx):
    client, ids = ctx
    body = (await client.get(f"/files/{ids['deck']}/text")).json()

    assert [(p["page_start"], p["text"]) for p in body["passages"]] == [
        (2, "Network layer overview"),
        (9, "Packetizing Routing Forwarding"),
    ]


@pytest.mark.asyncio
async def test_a_file_not_yet_indexed_is_409_and_a_strangers_file_is_404(ctx):
    client, ids = ctx
    assert (await client.get(f"/files/{ids['pending']}/text")).status_code == 409
    assert (await client.get(f"/files/{ids['other']}/text")).status_code == 404
