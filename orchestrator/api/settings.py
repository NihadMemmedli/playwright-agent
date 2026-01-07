from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import json
from pathlib import Path
from typing import Optional

router = APIRouter()

class Settings(BaseModel):
    llm_provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None

SETTINGS_FILE = Path.home() / ".claude" / "settings.json"

@router.get("/settings")
def get_settings():
    """Get current settings (masked sensitive data)"""
    settings = {}
    
    # Try reading from file first
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text())
            env_config = data.get("env", {})
            
            settings["base_url"] = env_config.get("ANTHROPIC_BASE_URL", "")
            settings["model_name"] = env_config.get("ANTHROPIC_DEFAULT_SONNET_MODEL", "")
            
            # Mask API Key
            api_key = env_config.get("ANTHROPIC_AUTH_TOKEN", "")
            if api_key:
                settings["api_key"] = api_key[:4] + "*" * (len(api_key) - 8) + api_key[-4:]
            
            # Infer provider
            if "z.ai" in settings.get("base_url", ""):
                 settings["llm_provider"] = "zai"
            else:
                 settings["llm_provider"] = "anthropic"
                 
        except Exception:
            pass
            
    # Fallback to current env vars if file is empty/missing
    if not settings:
        settings["base_url"] = os.environ.get("ANTHROPIC_BASE_URL", "")
        settings["model_name"] = os.environ.get("ANTHROPIC_DEFAULT_SONNET_MODEL", "")
        api_key = os.environ.get("ANTHROPIC_AUTH_TOKEN", "")
        if api_key:
             settings["api_key"] = "********"
        settings["llm_provider"] = "custom"

    return settings

@router.post("/settings")
def update_settings(new_settings: Settings):
    """Update settings and save to ~/.claude/settings.json"""
    
    # Read existing
    data = {}
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text())
        except:
             data = {}
             
    if "env" not in data:
        data["env"] = {}
        
    # Update fields
    if new_settings.base_url:
        data["env"]["ANTHROPIC_BASE_URL"] = new_settings.base_url
        
    if new_settings.model_name:
        data["env"]["ANTHROPIC_DEFAULT_SONNET_MODEL"] = new_settings.model_name
        
    if new_settings.api_key and "********" not in new_settings.api_key:
        data["env"]["ANTHROPIC_AUTH_TOKEN"] = new_settings.api_key
        
    # Ensure dir exists
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    SETTINGS_FILE.write_text(json.dumps(data, indent=2))
    
    return {"status": "success", "message": "Settings saved. Please restart the agent for changes to take full effect."}
