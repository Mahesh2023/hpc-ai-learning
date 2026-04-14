"""Load curriculum from YAML files."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

import yaml

from ..models.schemas import Module, Lesson, Exercise, ModuleSummary, LessonSummary

_modules: dict[str, Module] = {}
_exercises: dict[str, Exercise] = {}

CURRICULUM_DIR = Path(__file__).parent.parent / "curriculum"


def load_curriculum() -> None:
    """Load all YAML files from the curriculum directory."""
    global _modules, _exercises
    _modules.clear()
    _exercises.clear()

    if not CURRICULUM_DIR.exists():
        return

    for yaml_file in sorted(CURRICULUM_DIR.glob("*.yaml")):
        with open(yaml_file, "r") as f:
            data = yaml.safe_load(f)
        if not data:
            continue

        module_data = data if isinstance(data, dict) else {}
        lessons = []
        for ldata in module_data.get("lessons", []):
            exercises = []
            for edata in ldata.get("exercises", []):
                ex = Exercise(**edata)
                exercises.append(ex)
                _exercises[ex.id] = ex
            lesson = Lesson(
                id=ldata["id"],
                title=ldata["title"],
                content_md=ldata.get("content_md", ""),
                order=ldata.get("order", 0),
                objectives=ldata.get("objectives", []),
                exercises=exercises,
            )
            lessons.append(lesson)

        module = Module(
            id=module_data["id"],
            title=module_data["title"],
            description=module_data.get("description", ""),
            level=module_data.get("level", "beginner"),
            order=module_data.get("order", 0),
            estimated_hours=module_data.get("estimated_hours", 0),
            prerequisites=module_data.get("prerequisites", []),
            skills=module_data.get("skills", []),
            lessons=lessons,
        )
        _modules[module.id] = module


def get_all_modules() -> list[ModuleSummary]:
    """Return summary info for all modules."""
    return [
        ModuleSummary(
            id=m.id,
            title=m.title,
            description=m.description,
            level=m.level,
            order=m.order,
            estimated_hours=m.estimated_hours,
            prerequisites=m.prerequisites,
            skills=m.skills,
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


def get_exercise(exercise_id: str) -> Optional[Exercise]:
    return _exercises.get(exercise_id)


def get_total_lessons(module_id: str) -> int:
    mod = _modules.get(module_id)
    return len(mod.lessons) if mod else 0
