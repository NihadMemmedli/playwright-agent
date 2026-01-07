from pydantic import BaseModel
from typing import List, Optional

class TestSpec(BaseModel):
    name: str
    path: str
    content: str

class TestRun(BaseModel):
    id: str
    timestamp: str
    status: str
    test_name: Optional[str] = None
    steps_completed: int = 0
    total_steps: int = 0
    browser: Optional[str] = "chromium"

class CreateSpecRequest(BaseModel):
    name: str
    content: str

class UpdateSpecRequest(BaseModel):
    content: str
