"""
JSON extraction and validation utilities
"""

import json
import re
from typing import Any, Optional
from pathlib import Path


def extract_json_from_markdown(text: str) -> dict:
    """
    Extract JSON from markdown code block.

    Handles:
    - ```json ... ```
    - ``` ... ```
    - Plain JSON string
    """
    if not text or not isinstance(text, str):
        raise ValueError("Input must be a non-empty string")

    text = text.strip()

    # Try to extract from ```json code block
    json_pattern = r'```json\s*(.*?)\s*```'
    match = re.search(json_pattern, text, re.DOTALL)
    if match:
        json_str = match.group(1).strip()
        return json.loads(json_str)

    # Try to extract from ``` code block (no language specified)
    code_pattern = r'```\s*(.*?)\s*```'
    match = re.search(code_pattern, text, re.DOTALL)
    if match:
        json_str = match.group(1).strip()
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass  # Try next method

    # Try parsing the whole text as JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Could not extract JSON from text. Error: {e}\nText preview: {text[:200]}...")


def validate_json_schema(data: dict, schema_path: str) -> bool:
    """
    Validate JSON data against a schema file.
    """
    from jsonschema import validate, ValidationError

    schema = load_json_schema(schema_path)

    try:
        validate(instance=data, schema=schema)
        return True
    except ValidationError as e:
        raise ValueError(f"Schema validation failed: {e.message}\nPath: {' -> '.join(str(p) for p in e.path)}")


def load_json_schema(schema_path: str) -> dict:
    """Load JSON schema from file."""
    path = Path(schema_path)
    if not path.exists():
        raise FileNotFoundError(f"Schema file not found: {schema_path}")

    with open(path) as f:
        return json.load(f)


def save_json(data: dict, output_path: str) -> None:
    """Save JSON data to file with pretty formatting."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with open(path, 'w') as f:
        json.dump(data, f, indent=2)


def load_json(file_path: str) -> dict:
    """Load JSON data from file."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"JSON file not found: {file_path}")

    with open(path) as f:
        return json.load(f)
