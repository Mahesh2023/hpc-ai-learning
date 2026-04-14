// Demo data generators — separated from API logic
// Pure functions that generate lesson content and exercises from data

import DEMO_USER from './demoUser.json';
import DEMO_MODULES from './modules.json';
import { LESSON_EXERCISES } from './exerciseData';
import { LESSON_EXERCISES_2 } from './exerciseData2';

// Merge both exercise maps
const ALL_EXERCISES = { ...LESSON_EXERCISES, ...LESSON_EXERCISES_2 };

// ── Dashboard ──

export const DEMO_DASHBOARD = {
  user: DEMO_USER,
  stats: {
    total_modules: 6,
    completed_modules: 0,
    in_progress_modules: 2,
    total_lessons: 25,
    completed_lessons: 3,
    current_streak: 12,
    total_score: 2750,
    level: 'intermediate',
  },
  recent_activity: [
    { module_id: 1, module_title: 'Linux & Command Line Mastery', lesson_title: 'Shell Scripting Fundamentals', progress: 40, last_accessed: '2024-01-15T10:30:00Z' },
    { module_id: 2, module_title: 'HPC Fundamentals & Job Scheduling', lesson_title: 'Introduction to SLURM', progress: 25, last_accessed: '2024-01-14T16:45:00Z' },
    { module_id: 3, module_title: 'Containers & Orchestration', lesson_title: 'Docker Fundamentals', progress: 0, last_accessed: null },
  ],
  skills: DEMO_USER.skills,
  overall_progress: 18,
};

// ── Learning Path ──

export const DEMO_LEARNING_PATH = {
  modules: DEMO_MODULES.map((m) => ({
    id: m.id,
    title: m.title,
    level: m.level,
    status: m.status,
    completion_percentage: m.completion_percentage,
    estimated_hours: m.estimated_hours,
    lesson_count: m.lessons.length,
  })),
  overall_progress: 18,
};

// ── Lesson Content Generator ──

export function generateDemoLessonContent(lesson, interactiveDirective) {
  const objectives = lesson.objectives?.map(o => `- ${o}`).join('\n') || '';
  return `# ${lesson.title}

## Overview

This lesson provides **hands-on, practical training** in ${lesson.title.toLowerCase()}. You'll work through interactive exercises, run real code, and build skills directly applicable to production HPC systems.

### Learning Objectives

${objectives}

---

## Interactive Lab

Use the interactive component below to explore the concepts hands-on. Experiment with different configurations to build intuition.

${interactiveDirective}

---

## Key Concepts

${lesson.objectives?.map((o, i) => `### ${i + 1}. ${o}

This is a core skill you'll need on production HPC systems. The interactive exercises in the sidebar will test your understanding with real code challenges.

`).join('') || ''}

## Practical Application

\`\`\`python
# Real-world example for ${lesson.title}
import os
import sys

def main():
    """
    Practical ${lesson.title.toLowerCase()} implementation.
    Modify this code and click 'Run' to see the results.
    """
    print(f"System: {os.uname().sysname} {os.uname().release}")
    print(f"Python: {sys.version.split()[0]}")
    print(f"Working on: ${lesson.title}")
    # Add your implementation here

if __name__ == "__main__":
    main()
\`\`\`

> **Pro tip:** Complete all exercises in the sidebar panel to earn full marks. Each exercise tests a specific skill you'll use in production.

## Summary

In this lesson, you gained practical experience with ${lesson.title.toLowerCase()}. The interactive simulations and coding exercises above mirror real HPC workflows. Continue to the next lesson to build on these skills.
`;
}

// ── Exercise Generator ──

export function generateDemoExercises(lesson, lessonId) {
  // Use expert-crafted exercises if available
  const expertExercises = ALL_EXERCISES[Number(lessonId)];
  if (expertExercises && expertExercises.length > 0) {
    return expertExercises;
  }

  // Fallback for lessons without expert data
  const baseId = 100 + Number(lessonId);
  return [
    {
      id: baseId,
      type: 'quiz',
      title: `${lesson.title} — Concept Check`,
      description: 'Test your understanding of the core concepts.',
      points: 10,
      question: `Which of the following is a key concept in ${lesson.title}?`,
      options: (lesson.objectives || []).slice(0, 4).map(o => o.substring(0, 60)),
      correct_answer: 0,
      hints: ['Review the learning objectives at the top of this lesson.', 'Think about which concept is most fundamental to this topic.'],
    },
    {
      id: baseId + 1,
      type: 'coding',
      title: `${lesson.title} — Coding Challenge`,
      description: `Write a Python function that demonstrates a key concept from ${lesson.title.toLowerCase()}. Your code should print results that can be verified.`,
      points: 25,
      starter_code: `# ${lesson.title} — Coding Challenge\n# Write your solution below\nimport os\nimport sys\n\ndef solve():\n    """Implement your solution here."""\n    # TODO: Your code here\n    print("Hello from ${lesson.title}")\n    return True\n\nif __name__ == "__main__":\n    result = solve()\n    print(f"Result: {result}")`,
      test_cases: [
        { label: 'Test 1: Function runs', input: '', expected_output: 'Hello from', hidden: false },
        { label: 'Test 2: Returns True', input: '', expected_output: 'Result: True', hidden: false },
      ],
      hints: ['Start by reading the existing code and understanding what it does.', 'Make sure your function prints output and returns a value.', 'Check the test cases to see what output is expected.'],
      solution: `import os\nimport sys\n\ndef solve():\n    print("Hello from ${lesson.title}")\n    return True\n\nif __name__ == "__main__":\n    result = solve()\n    print(f"Result: {result}")`,
    },
  ];
}

// ── Sandbox Templates ──

export const DEMO_TEMPLATES = [
  { id: 'python_hello', language: 'python', title: 'Hello World', description: 'Your first Python program', code: 'print("Hello, HPC World!")\n' },
  { id: 'bash_sysinfo', language: 'bash', title: 'System Info', description: 'Explore the host system', code: 'echo "=== Kernel ===" && uname -a\necho "\\n=== CPUs ===" && nproc\n' },
  { id: 'python_numpy', language: 'python', title: 'NumPy Matrix Ops', description: 'Linear algebra basics', code: 'import numpy as np\nA = np.random.rand(3,3)\nprint("Det:", np.linalg.det(A))\n' },
  { id: 'python_mpi_sim', language: 'python', title: 'MPI Simulation', description: 'Map-reduce across workers', code: 'data = list(range(100))\nworkers = 4\nfor r in range(workers):\n    chunk = data[r*25:(r+1)*25]\n    print(f"Worker {r}: sum={sum(chunk)}")\n' },
];
