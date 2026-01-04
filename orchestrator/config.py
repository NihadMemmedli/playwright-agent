"""
Configuration module for the Orchestrator.
Handles path setup and environment loading.
"""

import sys
import os
from pathlib import Path

# Get project root (parent of orchestrator)
PROJECT_ROOT = Path(__file__).parent.parent.absolute()
ORCHESTRATOR_DIR = Path(__file__).parent.absolute()

# Add project root to sys.path if not present
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Also add orchestrator to path to find workflows easily
if str(ORCHESTRATOR_DIR) not in sys.path:
    sys.path.insert(0, str(ORCHESTRATOR_DIR))

# Re-export setup_claude_env for convenience
try:
    from orchestrator.load_env import setup_claude_env
except ImportError:
    # Try local import if running from inside orchestrator
    try:
        from load_env import setup_claude_env
    except ImportError:
        # Fallback
        def setup_claude_env():
            pass

def init():
    """Initialize environment and paths"""
    setup_claude_env()
    
    # Ensure virtualenv is active or at least we warn?
    # (Optional validation logic here)
