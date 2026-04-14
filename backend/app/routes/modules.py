"""Module and lesson routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..models.schemas import ModuleSummary, Module, Lesson
from ..services.curriculum_loader import get_all_modules, get_module, get_lesson
from ..routes.auth import require_user

router = APIRouter(prefix="/api/modules", tags=["modules"])


@router.get("", response_model=list[ModuleSummary])
async def list_modules():
    return get_all_modules()


@router.get("/{module_id}")
async def module_detail(module_id: str):
    mod = get_module(module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    # Return module with lesson summaries (no full content_md)
    lessons_summary = []
    for les in mod.lessons:
        lessons_summary.append({
            "id": les.id,
            "title": les.title,
            "order": les.order,
            "objectives": les.objectives,
            "exercise_count": len(les.exercises),
        })
    return {
        "id": mod.id,
        "title": mod.title,
        "description": mod.description,
        "level": mod.level,
        "order": mod.order,
        "estimated_hours": mod.estimated_hours,
        "prerequisites": mod.prerequisites,
        "skills": mod.skills,
        "lessons": lessons_summary,
    }


@router.get("/{module_id}/lessons/{lesson_id}")
async def lesson_detail(module_id: str, lesson_id: str):
    lesson = get_lesson(module_id, lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.post("/{module_id}/lessons/{lesson_id}/complete")
async def complete_lesson_alias(module_id: str, lesson_id: str, user=Depends(require_user)):
    """Alias for frontend compatibility — forwards to progress router."""
    from .progress import complete_lesson
    return await complete_lesson(module_id, lesson_id, user=user)
