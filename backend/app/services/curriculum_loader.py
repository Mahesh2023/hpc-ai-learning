"""Load curriculum from JSON files (preferred) or YAML files (fallback)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import yaml

from ..config import CURRICULUM_DIR
from ..models.schemas import Module, Lesson, ModuleSummary

_modules: dict[str, Module] = {}

JSON_DIR = CURRICULUM_DIR / "json"


def _load_file(path: Path) -> dict | None:
    """Load a curriculum file (JSON or YAML)."""
    with open(path, "r") as f:
        if path.suffix == ".json":
            return json.load(f)
        return yaml.safe_load(f)


def load_curriculum() -> None:
    """Load curriculum data. Prefers JSON from json/ subdir, falls back to YAML."""
    global _modules
    _modules.clear()

    if not CURRICULUM_DIR.exists():
        return

    # Collect files: prefer JSON, fall back to YAML
    files: list[Path] = []
    if JSON_DIR.exists():
        files = sorted(JSON_DIR.glob("*.json"))
    if not files:
        files = sorted(CURRICULUM_DIR.glob("*.yaml"))

    for filepath in files:
        data = _load_file(filepath)
        if not data or not isinstance(data, dict):
            continue

        lessons = []
        for ldata in data.get("lessons", []):
            lesson = Lesson(
                id=ldata["id"],
                title=ldata["title"],
                content_md=ldata.get("content_md", ""),
                order=ldata.get("order", 0),
                objectives=ldata.get("objectives", []),
            )
            lessons.append(lesson)

        module = Module(
            id=data["id"],
            title=data["title"],
            description=data.get("description", ""),
            level=data.get("level", "beginner"),
            order=data.get("order", 0),
            estimated_hours=data.get("estimated_hours", 0),
            prerequisites=data.get("prerequisites", []),
            skills=data.get("skills", []),
            lessons=lessons,
        )
        _modules[module.id] = module


def get_all_modules() -> list[ModuleSummary]:
    return [
        ModuleSummary(
            id=m.id, title=m.title, description=m.description,
            level=m.level, order=m.order, estimated_hours=m.estimated_hours,
            prerequisites=m.prerequisites, skills=m.skills,
            lesson_count=len(m.lessons),
        )
        for m in sorted(_modules.values(), key=lambda x: x.order)
    ]


def get_module(module_id: str) -> Optional[Module]:
    return _modules.get(module_id)


def get_lesson(module_id: str, lesson_id: str) -> Optional[Lesson]:
    mod = _modules.get(module_id)
    if not mod:
        return None
    for lesson in mod.lessons:
        if lesson.id == lesson_id:
            return lesson
    return None


def get_total_lessons(module_id: str) -> int:
    mod = _modules.get(module_id)
    return len(mod.lessons) if mod else 0
