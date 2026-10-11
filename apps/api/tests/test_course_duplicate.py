"""A second course with the same code, year and semester is a 409, not a 500.

Real database: the conflict is uq_course_user_code_year_sem firing, and a
mocked session has no constraint to fire.
"""

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
from app.schemas.user import User

CST235 = {"code": "CST235", "name": "NLP", "year": 2, "sem": 2}


@pytest_asyncio.fixture
async def client(test_database_url):
    engine = make_engine(test_database_url)
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)
    maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with maker() as session:
        user = User(email=f"{uuid4().hex[:8]}@x.com", hashed_password="x")
        session.add(user)
        await session.commit()
        user_id = user.id

    async def override_session():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: {"sub": str(user_id)}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_adding_the_same_course_twice_is_a_conflict(client):
    first = await client.post("/courses", json=CST235)
    second = await client.post("/courses", json=CST235)

    assert first.status_code == 201
    assert second.status_code == 409
    assert "CST235" in second.json()["detail"]

    # The failed insert left nothing half-made behind.
    listed = (await client.get("/courses")).json()
    assert [c["code"] for c in listed] == ["CST235"]


@pytest.mark.asyncio
async def test_same_code_in_another_semester_is_allowed(client):
    await client.post("/courses", json=CST235)
    other = await client.post("/courses", json={**CST235, "sem": 1})
    assert other.status_code == 201


@pytest.mark.asyncio
async def test_renaming_onto_an_existing_code_is_a_conflict(client):
    await client.post("/courses", json=CST235)
    other = (await client.post("/courses", json={**CST235, "code": "CST236"})).json()

    response = await client.patch(f"/courses/{other['id']}", json={"code": "CST235"})

    assert response.status_code == 409
