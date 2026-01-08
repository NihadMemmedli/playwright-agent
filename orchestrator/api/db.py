from sqlmodel import create_engine, SQLModel, Session
from typing import Generator
import os

# Default to sqlite for local dev if not specified, but we aim for postgres
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")

engine = create_engine(DATABASE_URL, echo=False)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
