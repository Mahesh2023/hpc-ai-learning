"""Evaluate exercise submissions."""

from __future__ import annotations

from ..models.schemas import Exercise, ExerciseResult


def evaluate(exercise: Exercise, answer: str, code: str | None = None) -> ExerciseResult:
    """Grade a submission against an exercise definition."""
    if exercise.exercise_type == "quiz":
        return _eval_quiz(exercise, answer)
    elif exercise.exercise_type == "coding":
        return _eval_coding(exercise, answer, code)
    elif exercise.exercise_type in ("lab", "project"):
        return _eval_lab(exercise, answer)
    return ExerciseResult(correct=False, feedback="Unknown exercise type.", score=0)


def _eval_quiz(ex: Exercise, answer: str) -> ExerciseResult:
    correct = answer.strip().lower() == ex.correct_answer.strip().lower()
    if correct:
        return ExerciseResult(correct=True, feedback="Correct!", score=100)
    hint = ex.hints[0] if ex.hints else None
    return ExerciseResult(
        correct=False,
        feedback=f"Not quite. The correct answer is: {ex.correct_answer}",
        score=0,
        next_hint=hint,
    )


def _eval_coding(ex: Exercise, answer: str, code: str | None = None) -> ExerciseResult:
    submission = (code or answer).strip()
    if not submission:
        return ExerciseResult(correct=False, feedback="Please submit your code.", score=0)

    # Keyword-based checking: look for required patterns in the solution
    sol_lower = ex.solution.lower()
    sub_lower = submission.lower()

    # Extract key tokens from the solution
    keywords = [w for w in sol_lower.split() if len(w) > 3 and w.isalpha()]
    if not keywords:
        # Fallback: accept any non-empty submission
        return ExerciseResult(correct=True, feedback="Submission received. Review the model solution for comparison.", score=70)

    matched = sum(1 for kw in keywords if kw in sub_lower)
    ratio = matched / len(keywords) if keywords else 0

    if ratio >= 0.6:
        score = min(100, int(ratio * 100))
        return ExerciseResult(correct=True, feedback=f"Good solution! Matched {score}% of expected patterns.", score=score)

    hint_idx = 0
    hint = ex.hints[hint_idx] if ex.hints else None
    return ExerciseResult(
        correct=False,
        feedback="Your solution doesn't match the expected approach. Check the hints and try again.",
        score=int(ratio * 100),
        next_hint=hint,
    )


def _eval_lab(ex: Exercise, answer: str) -> ExerciseResult:
    if len(answer.strip()) < 20:
        return ExerciseResult(correct=False, feedback="Please provide a more detailed response describing what you did.", score=0)
    return ExerciseResult(
        correct=True,
        feedback="Lab exercise noted. Review the model solution for best practices.",
        score=80,
    )
