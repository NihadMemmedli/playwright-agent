"""Load Claude credentials from settings"""

import os
import json
from pathlib import Path


def load_claude_settings():
    """Load Claude settings and return environment variables"""
    settings_file = Path.home() / ".claude" / "settings.json"

    if not settings_file.exists():
        return {}

    with open(settings_file) as f:
        settings = json.load(f)

    return settings.get("env", {})


def setup_claude_env():
    """Setup environment variables from Claude settings and .env file"""
    # Load from .env file (for secrets like LOGIN_PASSWORD)
    from dotenv import load_dotenv, find_dotenv
    load_dotenv(find_dotenv())

    env_vars = load_claude_settings()

    for key, value in env_vars.items():
        if key not in os.environ:  # Don't override existing
            os.environ[key] = value

    return env_vars


if __name__ == "__main__":
    env = setup_claude_env()
    print("Loaded environment variables:")
    for key in env.keys():
        if "TOKEN" not in key:  # Don't print tokens
            print(f"  {key}={env[key]}")
        else:
            print(f"  {key}=***")
