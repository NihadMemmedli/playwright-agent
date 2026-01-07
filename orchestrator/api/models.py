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

class SpecMetadata(BaseModel):
    tags: List[str] = []
    description: Optional[str] = None
    author: Optional[str] = None
    lastModified: Optional[str] = None

class UpdateMetadataRequest(BaseModel):
    tags: Optional[List[str]] = None
    description: Optional[str] = None
    author: Optional[str] = None

class BulkRunRequest(BaseModel):
    spec_names: List[str]
    browser: str = "chromium"
