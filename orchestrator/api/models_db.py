from typing import Optional, List
from sqlmodel import SQLModel, Field
from datetime import datetime
import json

class TestRun(SQLModel, table=True):
    id: str = Field(primary_key=True)
    spec_name: str
    status: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    test_name: Optional[str] = None
    steps_completed: int = 0
    total_steps: int = 0
    browser: str = "chromium"
    
    # We can store heavy JSONs as text/jsonb if needed, or stick to file for big logs.
    # For now, let's keep metadata in DB.
    
class SpecMetadata(SQLModel, table=True):
    spec_name: str = Field(primary_key=True)
    tags_json: str = "[]" # Stored as JSON string
    description: Optional[str] = None
    author: Optional[str] = None
    last_modified: Optional[datetime] = None

    @property
    def tags(self) -> List[str]:
        try:
            return json.loads(self.tags_json)
        except:
            return []

    @tags.setter
    def tags(self, value: List[str]):
        self.tags_json = json.dumps(value)
