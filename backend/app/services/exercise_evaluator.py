"""Exercise evaluator v2.0 — test-case-based code grading + structured feedback."""

from __future__ import annotations

import asyncio
import json
import re

from ..models.schemas import Exercise, ExerciseResult
from .code_runner import run_code


async def evaluate(exercise: Exercise, answer: str, code: str | None = None) -> ExerciseResult:
    """Grade a submission against an exercise definition."""
    if exercise.exercise_type == "quiz":
        return _eval_quiz(exercise, answer)
    elif exercise.exercise_type == "coding":
        return await _eval_coding(exercise, answer, code)
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


async def _eval_coding(ex: Exercise, answer: str, code: str | None = None) -> ExerciseResult:
    submission = (code or answer).strip()
    if not submission:
        return ExerciseResult(correct=False, feedback="Please submit your code.", score=0)

    # ── Phase 1: Run user code against test cases ──
    if ex.test_cases:
        return await _run_test_cases(ex, submission)

    # ── Phase 2: Output-matching (if solution has expected_output markers) ──
    if "# EXPECTED:" in ex.solution or "# expected_output:" in ex.solution:
        return await _run_output_match(ex, submission)

    # ── Phase 3: Structural analysis (check for required constructs) ──
    return _eval_structural(ex, submission)


async def _run_test_cases(ex: Exercise, code: str) -> ExerciseResult:
    """Run code against each test case, compare outputs."""
    passed = 0
    total = len(ex.test_cases)
    failures = []

    for i, tc in enumerate(ex.test_cases):
        test_input = tc.get("input", "")
        expected = tc.get("expected_output", "").strip()
        label = tc.get("label", f"Test {i + 1}")
        hidden = tc.get("hidden", False)

        # Build test harness: inject input, capture output
        harness = code + "\n"
        if test_input:
            # Prepend stdin simulation via input override
            input_lines = test_input.strip().split("\n")
            input_repr = repr(input_lines)
            harness = (
                f"import sys, io\n"
                f"_test_inputs = {input_repr}\n"
                f"_input_idx = [0]\n"
                f"_orig_input = input\n"
                f"def input(prompt=''):\n"
                f"    if _input_idx[0] < len(_test_inputs):\n"
                f"        val = _test_inputs[_input_idx[0]]\n"
                f"        _input_idx[0] += 1\n"
                f"        return val\n"
                f"    return ''\n"
                + code + "\n"
            )

        result = await run_code("python", harness, timeout=10)

        actual = result.stdout.strip()
        # Normalize whitespace for comparison
        actual_norm = re.sub(r'\s+', ' ', actual).strip()
        expected_norm = re.sub(r'\s+', ' ', expected).strip()

        if result.exit_code != 0 and result.stderr:
            failures.append(f"**{label}**: Runtime error — `{result.stderr[:200]}`")
        elif actual_norm == expected_norm:
            passed += 1
        elif _fuzzy_match(actual, expected):
            passed += 1
        else:
            if hidden:
                failures.append(f"**{label}**: Failed (hidden test)")
            else:
                failures.append(
                    f"**{label}**: Expected `{expected[:100]}`, got `{actual[:100]}`"
                )

    score = int((passed / total) * 100) if total > 0 else 0
    correct = passed == total

    if correct:
        return ExerciseResult(
            correct=True,
            feedback=f"All {total} test cases passed!",
            score=100,
        )

    feedback_parts = [f"Passed {passed}/{total} test cases."]
    if failures:
        feedback_parts.append("\n".join(failures[:5]))
    hint = ex.hints[min(total - passed - 1, len(ex.hints) - 1)] if ex.hints else None

    return ExerciseResult(
        correct=False,
        feedback="\n".join(feedback_parts),
        score=score,
        next_hint=hint,
    )


async def _run_output_match(ex: Exercise, code: str) -> ExerciseResult:
    """Run code and compare stdout against expected output in solution."""
    # Extract expected output from solution markers
    expected = ""
    for line in ex.solution.split("\n"):
        if line.strip().startswith("# EXPECTED:"):
            expected = line.strip().replace("# EXPECTED:", "").strip()
            break
        if line.strip().startswith("# expected_output:"):
            expected = line.strip().replace("# expected_output:", "").strip()
            break

    result = await run_code("python", code, timeout=10)

    if result.exit_code != 0 and result.stderr:
        hint = ex.hints[0] if ex.hints else None
        return ExerciseResult(
            correct=False,
            feedback=f"Your code had an error:\n```\n{result.stderr[:300]}\n```",
            score=0,
            next_hint=hint,
        )

    actual = result.stdout.strip()
    if _fuzzy_match(actual, expected):
        return ExerciseResult(correct=True, feedback="Output matches expected result!", score=100)

    return ExerciseResult(
        correct=False,
        feedback=f"Expected output: `{expected[:200]}`\nYour output: `{actual[:200]}`",
        score=30,
        next_hint=ex.hints[0] if ex.hints else None,
    )


def _eval_structural(ex: Exercise, code: str) -> ExerciseResult:
    """Analyze code structure — check for required functions, imports, patterns."""
    sol_lower = ex.solution.lower()
    code_lower = code.lower()
    checks = []
    score = 0
    max_score = 0

    # Check for required imports
    sol_imports = re.findall(r'^(?:from\s+\S+\s+)?import\s+\S+', ex.solution, re.MULTILINE)
    if sol_imports:
        max_score += 20
        found = sum(1 for imp in sol_imports if imp.lower() in code_lower)
        ratio = found / len(sol_imports)
        if ratio >= 0.5:
            score += int(20 * ratio)
            checks.append(f"Imports: {found}/{len(sol_imports)} required modules found")
        else:
            checks.append(f"Missing imports: check the solution for required modules")

    # Check for required function/class definitions
    sol_defs = re.findall(r'(?:def|class)\s+(\w+)', ex.solution)
    if sol_defs:
        max_score += 30
        found = sum(1 for d in sol_defs if d.lower() in code_lower)
        ratio = found / len(sol_defs)
        score += int(30 * ratio)
        if ratio < 1.0:
            missing = [d for d in sol_defs if d.lower() not in code_lower]
            checks.append(f"Missing definitions: {', '.join(missing[:3])}")
        else:
            checks.append(f"All required functions/classes defined")

    # Check for key operations/patterns
    key_patterns = _extract_key_patterns(ex.solution)
    if key_patterns:
        max_score += 30
        found = sum(1 for p in key_patterns if p.lower() in code_lower)
        ratio = found / len(key_patterns)
        score += int(30 * ratio)
        checks.append(f"Key patterns: {found}/{len(key_patterns)} found")

    # Code runs without error = bonus
    max_score += 20

    # Normalize score
    if max_score > 0:
        score = int((score / max_score) * 100)

    correct = score >= 70
    feedback_lines = ["Code analysis:"] + [f"  - {c}" for c in checks]
    if correct:
        feedback_lines.append("Good solution! Review the model solution for comparison.")
    else:
        feedback_lines.append("Your solution needs more work. Check the hints.")

    return ExerciseResult(
        correct=correct,
        feedback="\n".join(feedback_lines),
        score=score,
        next_hint=ex.hints[0] if ex.hints and not correct else None,
    )


def _extract_key_patterns(solution: str) -> list[str]:
    """Extract distinctive patterns from solution code."""
    patterns = []
    # Method calls like .fit(), .predict(), .to_csv()
    methods = re.findall(r'\.(\w{3,})\(', solution)
    patterns.extend(list(set(methods))[:5])
    # String literals that look like parameters
    strings = re.findall(r"['\"](\w{4,})['\"]", solution)
    patterns.extend(list(set(strings))[:3])
    return patterns


def _fuzzy_match(actual: str, expected: str) -> bool:
    """Flexible output comparison — handles float precision, whitespace, etc."""
    if not expected:
        return bool(actual)  # Any output counts if no expected defined
    # Exact match
    if actual.strip() == expected.strip():
        return True
    # Normalize whitespace
    a = re.sub(r'\s+', ' ', actual).strip()
    e = re.sub(r'\s+', ' ', expected).strip()
    if a == e:
        return True
    # Numeric fuzzy match (for floating point)
    try:
        a_nums = [float(x) for x in re.findall(r'-?\d+\.?\d*', actual)]
        e_nums = [float(x) for x in re.findall(r'-?\d+\.?\d*', expected)]
        if a_nums and e_nums and len(a_nums) == len(e_nums):
            return all(abs(a - e) < 0.01 for a, e in zip(a_nums, e_nums))
    except (ValueError, TypeError):
        pass
    # Substring match (expected contained in actual)
    if expected.strip() in actual:
        return True
    return False


def _eval_lab(ex: Exercise, answer: str) -> ExerciseResult:
    """Evaluate lab submissions — check for required observations."""
    answer_stripped = answer.strip()
    if len(answer_stripped) < 20:
        return ExerciseResult(
            correct=False,
            feedback="Please provide a more detailed response describing what you observed and learned.",
            score=0,
        )

    # Check for key terms from the solution
    if ex.solution:
        key_terms = [w.lower() for w in ex.solution.split() if len(w) > 4 and w.isalpha()]
        key_terms = list(set(key_terms))[:15]
        answer_lower = answer_stripped.lower()
        found = sum(1 for t in key_terms if t in answer_lower)
        ratio = found / len(key_terms) if key_terms else 0

        if ratio >= 0.4:
            score = min(100, int(60 + ratio * 40))
            return ExerciseResult(
                correct=True,
                feedback=f"Good lab response! You covered {int(ratio * 100)}% of key concepts. Review the model solution for anything you might have missed.",
                score=score,
            )
        else:
            missing_sample = [t for t in key_terms if t not in answer_lower][:3]
            return ExerciseResult(
                correct=False,
                feedback=f"Your response is missing key observations. Consider discussing: {', '.join(missing_sample)}",
                score=int(ratio * 60),
                next_hint=ex.hints[0] if ex.hints else None,
            )

    return ExerciseResult(
        correct=True,
        feedback="Lab exercise noted. Review the model solution for best practices.",
        score=80,
    )
