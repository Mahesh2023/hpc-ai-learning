"""Progress tracking routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from ..models.schemas import (
    UserProgress, DashboardStats,
    LearningPath, LearningPathModule,
)
from ..models.database import save_progress, get_progress, get_all_progress
from ..routes.auth import require_user
from ..services.curriculum_loader import (
    get_all_modules, get_module, get_total_lessons,
)

router = APIRouter(tags=["progress"])


@router.get("/api/progress", response_model=DashboardStats)
async def dashboard_stats(user=Depends(require_user)):
    all_prog = get_all_progress(user["id"])
    modules = get_all_modules()
    total = len(modules)
    completed = 0
    total_score = 0
    skill_scores: dict[str, list[int]] = {}

    for mod_summary in modules:
        mod = get_module(mod_summary.id)
        prog = all_prog.get(mod_summary.id, {})
        lessons_done = len(prog.get("lessons_completed", []))
        total_lessons = len(mod.lessons) if mod else 0
        if total_lessons > 0 and lessons_done >= total_lessons:
            completed += 1
        total_score += prog.get("score", 0)
        for skill in mod_summary.skills:
            if skill not in skill_scores:
                skill_scores[skill] = []
            pct = (lessons_done / total_lessons * 100) if total_lessons > 0 else 0
            skill_scores[skill].append(int(pct))

    skills = {k: int(sum(v) / len(v)) if v else 0 for k, v in skill_scores.items()}

    level = "beginner"
    if completed >= 5:
        level = "professional"
    elif completed >= 3:
        level = "advanced"
    elif completed >= 1:
        level = "intermediate"

    return DashboardStats(
        total_modules=total,
        completed_modules=completed,
        current_level=level,
        total_score=total_score,
        streak_days=1,
        skills=skills,
    )


@router.get("/api/dashboard")
async def dashboard(user=Depends(require_user)):
    """Dashboard endpoint formatted for frontend compatibility.

    Returns the shape the frontend expects:
    { user, stats, recent_activity, skills, overall_progress }
    """
    all_prog = get_all_progress(user["id"])
    modules = get_all_modules()
    total = len(modules)
    completed = 0
    total_score = 0
    skill_scores: dict[str, list[int]] = {}

    for mod_summary in modules:
        mod = get_module(mod_summary.id)
        prog = all_prog.get(mod_summary.id, {})
        lessons_done = len(prog.get("lessons_completed", []))
        total_lessons = len(mod.lessons) if mod else 0
        if total_lessons > 0 and lessons_done >= total_lessons:
            completed += 1
        total_score += prog.get("score", 0)
        for skill in mod_summary.skills:
            if skill not in skill_scores:
                skill_scores[skill] = []
            pct = (lessons_done / total_lessons * 100) if total_lessons > 0 else 0
            skill_scores[skill].append(int(pct))

    skills = {k: int(sum(v) / len(v)) if v else 0 for k, v in skill_scores.items()}

    overall_progress = round(completed / total * 100, 1) if total > 0 else 0

    return {
        "user": {
            "id": user["id"],
            "username": user.get("username", ""),
            "email": user.get("email", ""),
        },
        "stats": {
            "total_modules": total,
            "completed_modules": completed,
            "current_level": "beginner" if completed < 1 else (
                "intermediate" if completed < 3 else (
                    "advanced" if completed < 5 else "professional"
                )
            ),
            "total_score": total_score,
            "streak_days": 1,
        },
        "recent_activity": [],
        "skills": skills,
        "overall_progress": overall_progress,
    }


@router.get("/api/progress/{module_id}", response_model=UserProgress)
async def module_progress(module_id: str, user=Depends(require_user)):
    prog = get_progress(user["id"], module_id)
    if not prog:
        return UserProgress(user_id=user["id"], module_id=module_id)
    return UserProgress(**prog)


@router.post("/api/progress/{module_id}/lessons/{lesson_id}/complete")
async def complete_lesson(module_id: str, lesson_id: str, user=Depends(require_user)):
    mod = get_module(module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")

    prog = get_progress(user["id"], module_id) or {
        "lessons_completed": [],
        "score": 0,
    }

    lessons_done = list(prog.get("lessons_completed", []))
    if lesson_id not in lessons_done:
        lessons_done.append(lesson_id)

    total = len(mod.lessons)
    pct = (len(lessons_done) / total * 100) if total > 0 else 0

    updated = save_progress(user["id"], module_id, {
        "lessons_completed": lessons_done,
        "completion_pct": round(pct, 1),
    })
    return {"status": "ok", "completion_pct": round(pct, 1), "lessons_completed": lessons_done}


@router.get("/api/learning-path", response_model=LearningPath)
async def learning_path(user=Depends(require_user)):
    all_prog = get_all_progress(user["id"])
    modules = get_all_modules()
    path_modules = []

    completed_ids = set()
    for mod_summary in modules:
        mod = get_module(mod_summary.id)
        prog = all_prog.get(mod_summary.id, {})
        total_lessons = len(mod.lessons) if mod else 0
        lessons_done = len(prog.get("lessons_completed", []))
        pct = (lessons_done / total_lessons * 100) if total_lessons > 0 else 0

        if total_lessons > 0 and lessons_done >= total_lessons:
            completed_ids.add(mod_summary.id)

    for mod_summary in modules:
        mod = get_module(mod_summary.id)
        prog = all_prog.get(mod_summary.id, {})
        total_lessons = len(mod.lessons) if mod else 0
        lessons_done = len(prog.get("lessons_completed", []))
        pct = (lessons_done / total_lessons * 100) if total_lessons > 0 else 0

        prereqs_met = all(p in completed_ids for p in mod_summary.prerequisites)

        if mod_summary.id in completed_ids:
            status = "completed"
        elif lessons_done > 0:
            status = "in_progress"
        elif prereqs_met:
            status = "available"
        else:
            status = "locked"

        path_modules.append(LearningPathModule(
            module_id=mod_summary.id,
            title=mod_summary.title,
            level=mod_summary.level,
            order=mod_summary.order,
            status=status,
            completion_pct=round(pct, 1),
        ))

    return LearningPath(modules=path_modules)
