import { getAccessToken, setAccessToken } from './auth';

const BASE_URL = '/api';

// Demo / Mock Data
const DEMO_USER = {
  id: 1,
  username: 'demo_engineer',
  email: 'demo@hpcai.dev',
  level: 'intermediate',
  total_score: 2750,
  current_streak: 12,
  skills: {
    linux: 78,
    hpc: 62,
    containers: 55,
    ai_ml: 45,
    platform_eng: 70,
    cloud: 58,
  },
};

const DEMO_MODULES = [
  {
    id: 1,
    title: 'Linux & Command Line Mastery',
    description: 'Master the Linux command line, shell scripting, and system administration fundamentals essential for HPC and AI platform engineering.',
    level: 'beginner',
    order_index: 1,
    estimated_hours: 12,
    skills: ['Linux', 'Bash', 'System Admin'],
    prerequisites: [],
    lessons: [
      { id: 1, title: 'Introduction to the Linux Shell', order_index: 1, estimated_minutes: 45, objectives: ['Understand shell basics', 'Navigate the filesystem', 'Use basic commands'], exercise_count: 3, completed: true },
      { id: 2, title: 'File System & Permissions', order_index: 2, estimated_minutes: 60, objectives: ['Understand Linux file hierarchy', 'Manage file permissions', 'Use chmod and chown'], exercise_count: 4, completed: true },
      { id: 3, title: 'Shell Scripting Fundamentals', order_index: 3, estimated_minutes: 90, objectives: ['Write bash scripts', 'Use variables and loops', 'Handle arguments'], exercise_count: 5, completed: false },
      { id: 4, title: 'Process Management & Monitoring', order_index: 4, estimated_minutes: 60, objectives: ['Manage processes', 'Use top/htop', 'Understand signals'], exercise_count: 3, completed: false },
      { id: 5, title: 'Networking Basics', order_index: 5, estimated_minutes: 75, objectives: ['Understand TCP/IP', 'Use SSH effectively', 'Network troubleshooting'], exercise_count: 4, completed: false },
    ],
    completion_percentage: 40,
    status: 'in_progress',
  },
  {
    id: 2,
    title: 'HPC Fundamentals & Job Scheduling',
    description: 'Learn high-performance computing concepts, cluster architecture, job schedulers (SLURM), and parallel computing paradigms.',
    level: 'beginner',
    order_index: 2,
    estimated_hours: 15,
    skills: ['HPC', 'SLURM', 'MPI', 'Parallel Computing'],
    prerequisites: ['Linux & Command Line Mastery'],
    lessons: [
      { id: 6, title: 'HPC Architecture Overview', order_index: 1, estimated_minutes: 60, objectives: ['Understand cluster architecture', 'Learn about interconnects', 'Know compute vs storage nodes'], exercise_count: 3, completed: true },
      { id: 7, title: 'Introduction to SLURM', order_index: 2, estimated_minutes: 90, objectives: ['Submit jobs with sbatch', 'Monitor jobs with squeue', 'Configure job resources'], exercise_count: 5, completed: false },
      { id: 8, title: 'Parallel Computing with MPI', order_index: 3, estimated_minutes: 120, objectives: ['Understand message passing', 'Write basic MPI programs', 'Run multi-node jobs'], exercise_count: 4, completed: false },
      { id: 9, title: 'GPU Computing Basics', order_index: 4, estimated_minutes: 90, objectives: ['Understand GPU architecture', 'CUDA fundamentals', 'GPU job scheduling'], exercise_count: 4, completed: false },
    ],
    completion_percentage: 25,
    status: 'in_progress',
  },
  {
    id: 3,
    title: 'Containers & Orchestration',
    description: 'Master containerization with Docker and Singularity, learn Kubernetes for orchestrating AI/HPC workloads at scale.',
    level: 'intermediate',
    order_index: 3,
    estimated_hours: 18,
    skills: ['Docker', 'Singularity', 'Kubernetes', 'Container Security'],
    prerequisites: ['Linux & Command Line Mastery', 'HPC Fundamentals & Job Scheduling'],
    lessons: [
      { id: 10, title: 'Docker Fundamentals', order_index: 1, estimated_minutes: 90, objectives: ['Build Docker images', 'Manage containers', 'Docker networking'], exercise_count: 5, completed: false },
      { id: 11, title: 'Singularity for HPC', order_index: 2, estimated_minutes: 75, objectives: ['Build Singularity containers', 'Run on HPC clusters', 'GPU passthrough'], exercise_count: 4, completed: false },
      { id: 12, title: 'Kubernetes Architecture', order_index: 3, estimated_minutes: 90, objectives: ['Understand K8s components', 'Deploy applications', 'Service discovery'], exercise_count: 4, completed: false },
      { id: 13, title: 'K8s for AI Workloads', order_index: 4, estimated_minutes: 120, objectives: ['GPU scheduling in K8s', 'Helm charts', 'Resource management'], exercise_count: 5, completed: false },
    ],
    completion_percentage: 0,
    status: 'available',
  },
  {
    id: 4,
    title: 'AI/ML Infrastructure & Frameworks',
    description: 'Build and manage AI/ML training infrastructure, distributed training with PyTorch/TensorFlow, and model serving pipelines.',
    level: 'intermediate',
    order_index: 4,
    estimated_hours: 20,
    skills: ['PyTorch', 'TensorFlow', 'Distributed Training', 'MLOps'],
    prerequisites: ['Containers & Orchestration'],
    lessons: [
      { id: 14, title: 'ML Framework Environments', order_index: 1, estimated_minutes: 60, objectives: ['Set up PyTorch/TF environments', 'Manage CUDA versions', 'Virtual environments'], exercise_count: 3, completed: false },
      { id: 15, title: 'Distributed Training', order_index: 2, estimated_minutes: 120, objectives: ['Data parallelism', 'Model parallelism', 'Multi-GPU training'], exercise_count: 5, completed: false },
      { id: 16, title: 'Model Serving & Inference', order_index: 3, estimated_minutes: 90, objectives: ['TorchServe/TF Serving', 'Triton Inference Server', 'Optimization'], exercise_count: 4, completed: false },
      { id: 17, title: 'MLOps Pipelines', order_index: 4, estimated_minutes: 90, objectives: ['CI/CD for ML', 'Experiment tracking', 'Model registry'], exercise_count: 4, completed: false },
    ],
    completion_percentage: 0,
    status: 'locked',
  },
  {
    id: 5,
    title: 'Platform Engineering for AI',
    description: 'Design and implement internal developer platforms for AI teams: IaC, observability, self-service portals, and GitOps workflows.',
    level: 'advanced',
    order_index: 5,
    estimated_hours: 22,
    skills: ['Terraform', 'GitOps', 'Observability', 'Platform Design'],
    prerequisites: ['Containers & Orchestration', 'AI/ML Infrastructure & Frameworks'],
    lessons: [
      { id: 18, title: 'Infrastructure as Code', order_index: 1, estimated_minutes: 90, objectives: ['Terraform for HPC', 'Ansible automation', 'State management'], exercise_count: 5, completed: false },
      { id: 19, title: 'GitOps & ArgoCD', order_index: 2, estimated_minutes: 90, objectives: ['GitOps principles', 'ArgoCD setup', 'Declarative infrastructure'], exercise_count: 4, completed: false },
      { id: 20, title: 'Observability Stack', order_index: 3, estimated_minutes: 120, objectives: ['Prometheus/Grafana', 'GPU metrics', 'Alerting'], exercise_count: 5, completed: false },
      { id: 21, title: 'Self-Service Platforms', order_index: 4, estimated_minutes: 90, objectives: ['Backstage/Port', 'Service catalogs', 'Developer experience'], exercise_count: 3, completed: false },
    ],
    completion_percentage: 0,
    status: 'locked',
  },
  {
    id: 6,
    title: 'Enterprise AI at Scale',
    description: 'Production-grade AI platform operations: multi-tenancy, security, cost optimization, compliance, and large-scale LLM deployment.',
    level: 'professional',
    order_index: 6,
    estimated_hours: 25,
    skills: ['Security', 'Multi-tenancy', 'Cost Optimization', 'LLM Ops'],
    prerequisites: ['Platform Engineering for AI'],
    lessons: [
      { id: 22, title: 'Multi-tenant AI Platforms', order_index: 1, estimated_minutes: 120, objectives: ['Namespace isolation', 'Resource quotas', 'Fair scheduling'], exercise_count: 4, completed: false },
      { id: 23, title: 'Security & Compliance', order_index: 2, estimated_minutes: 90, objectives: ['RBAC', 'Network policies', 'Data governance'], exercise_count: 4, completed: false },
      { id: 24, title: 'Cost Optimization', order_index: 3, estimated_minutes: 90, objectives: ['GPU utilization', 'Spot instances', 'Chargeback models'], exercise_count: 3, completed: false },
      { id: 25, title: 'Large-Scale LLM Deployment', order_index: 4, estimated_minutes: 150, objectives: ['LLM serving patterns', 'vLLM/TGI', 'RAG infrastructure'], exercise_count: 5, completed: false },
    ],
    completion_percentage: 0,
    status: 'locked',
  },
];

const DEMO_LESSON_CONTENT = {
  1: {
    id: 1,
    module_id: 1,
    title: 'Introduction to the Linux Shell',
    order_index: 1,
    estimated_minutes: 45,
    objectives: ['Understand what a shell is and its role in the operating system', 'Navigate the Linux filesystem using command-line tools', 'Execute basic commands for file and directory management'],
    content: `# Introduction to the Linux Shell

## What is a Shell?

A **shell** is a command-line interface (CLI) that provides a way to interact with the operating system. It acts as an intermediary between the user and the kernel, translating commands into system calls.

### Common Shell Types

| Shell | Path | Description |
|-------|------|-------------|
| Bash | \`/bin/bash\` | Bourne Again Shell - most common on Linux |
| Zsh | \`/bin/zsh\` | Z Shell - default on macOS |
| Fish | \`/usr/bin/fish\` | Friendly Interactive Shell |

## Your First Commands

Let us start with some essential commands:

\`\`\`bash
# Print working directory
pwd

# List files and directories
ls -la

# Change directory
cd /home/user

# Create a directory
mkdir my_hpc_project

# Create a file
touch hello.sh
\`\`\`

## Navigating the Filesystem

The Linux filesystem is organized as a tree structure starting from the root \`/\`:

\`\`\`
/
├── home/          # User home directories
│   └── user/
├── etc/           # System configuration
├── var/           # Variable data (logs, etc.)
├── tmp/           # Temporary files
├── opt/           # Optional software
└── usr/           # User programs
    ├── bin/
    └── lib/
\`\`\`

### Essential Navigation Commands

\`\`\`bash
# Go to home directory
cd ~

# Go up one level
cd ..

# Go to previous directory
cd -

# Show directory tree
tree -L 2

# Find files
find /home -name "*.sh" -type f
\`\`\`

## File Operations

\`\`\`bash
# Copy files
cp source.txt destination.txt

# Move/rename files
mv old_name.txt new_name.txt

# Remove files (careful!)
rm unwanted_file.txt

# Remove directory recursively
rm -rf old_directory/

# View file contents
cat config.yaml
less large_log_file.log
head -20 output.csv
tail -f /var/log/syslog
\`\`\`

## Pro Tip: Tab Completion

Always use **Tab** for auto-completion! It saves time and prevents typos. Double-tap Tab to see all possibilities.

## HPC Context

In HPC environments, you will be working extensively with the command line to:
- Submit and monitor compute jobs
- Manage large datasets
- Configure software environments
- Debug parallel applications

> **Note**: Most HPC clusters run Linux (typically RHEL/CentOS or Ubuntu). Mastering the shell is your foundation for everything else in this course.
`,
    exercises: [
      {
        id: 1,
        type: 'quiz',
        title: 'Shell Basics Quiz',
        description: 'Test your understanding of Linux shell concepts',
        points: 10,
        question: 'Which command displays the current working directory?',
        options: ['ls', 'pwd', 'cd', 'whoami'],
        correct_answer: 1,
        hints: ['Think about what "print working directory" abbreviates to.'],
      },
      {
        id: 2,
        type: 'quiz',
        title: 'Filesystem Navigation',
        description: 'Test your knowledge of filesystem navigation',
        points: 10,
        question: 'What does "cd ~" do?',
        options: [
          'Changes to the root directory',
          'Changes to the home directory',
          'Changes to the previous directory',
          'Lists the current directory',
        ],
        correct_answer: 1,
        hints: ['The tilde (~) is a shortcut for a special directory.'],
      },
      {
        id: 3,
        type: 'coding',
        title: 'Write a File Listing Script',
        description: 'Write a bash command that lists all .py files in the current directory and its subdirectories',
        points: 20,
        starter_code: '# Write your command below\n',
        expected_output: 'find . -name "*.py" -type f',
        hints: [
          'Use the find command',
          'The -name flag filters by filename pattern',
          'The -type f flag filters for files only',
        ],
      },
    ],
  },
};

const DEMO_DASHBOARD = {
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

const DEMO_LEARNING_PATH = {
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

// API Helpers — v3.0 (in-memory token, HttpOnly cookie for refresh)

function getToken() {
  // Primary: in-memory token (XSS-safe)
  // Fallback: localStorage (demo/static mode compat)
  return getAccessToken() || localStorage.getItem('hpc_auth_token');
}

let isRefreshing = false;
let refreshPromise = null;

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include', // Send HttpOnly cookies
    });

    // If response is not JSON (e.g. HTML 404 from GitHub Pages), treat as backend unavailable
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn(`Backend unavailable for ${endpoint} (non-JSON response), using demo data`);
      return null;
    }

    // Auto-refresh on 401 (token expired)
    if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
      try {
        const refreshData = await refreshTokenAPI();
        if (refreshData && refreshData.access_token) {
          setAccessToken(refreshData.access_token);
          // Retry the original request with new token
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${refreshData.access_token}`,
          };
          const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: retryHeaders,
            credentials: 'include',
          });
          if (retryResponse.ok) {
            return await retryResponse.json();
          }
        }
      } catch {
        // Refresh failed
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      console.warn(`Backend unavailable for ${endpoint}, using demo data`);
      return null;
    }
    throw err;
  }
}

// Auth API

export async function loginAPI(email, password, totpCode = null) {
  try {
    const body = { email, password };
    if (totpCode) body.totp_code = totpCode;
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (data) return data;
  } catch (e) {
    if (email === 'demo@hpcai.dev') {
      return { access_token: 'demo-token-12345', token_type: 'bearer', expires_in: 86400 };
    }
    throw e;
  }
  if (email === 'demo@hpcai.dev') {
    return { access_token: 'demo-token-12345', token_type: 'bearer', expires_in: 86400 };
  }
  throw new Error('Backend unavailable. Use demo@hpcai.dev / any password to explore.');
}

export async function registerAPI(username, email, password) {
  try {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    if (data) return data;
  } catch (e) {
    throw e;
  }
  return { access_token: 'demo-token-12345', token_type: 'bearer', expires_in: 86400 };
}

export async function refreshTokenAPI() {
  const response = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include', // Sends HttpOnly cookie
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) return null;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  return await response.json();
}

export async function logoutAPI() {
  try {
    await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
      },
    });
  } catch { /* ignore */ }
}

export async function getMeAPI() {
  const data = await apiRequest('/auth/me');
  if (data) return data;
  const token = getToken();
  if (token) return DEMO_USER;
  return null;
}

export async function changePasswordAPI(currentPassword, newPassword) {
  return await apiRequest('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function checkPasswordStrengthAPI(password) {
  return await apiRequest('/auth/password-strength', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export async function setup2FAAPI() {
  return await apiRequest('/auth/2fa/setup', { method: 'POST' });
}

export async function verify2FASetupAPI(code) {
  return await apiRequest('/auth/2fa/verify-setup', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disable2FAAPI(password, code) {
  return await apiRequest('/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ password, code }),
  });
}

export async function getSessionsAPI() {
  return await apiRequest('/auth/sessions');
}

export async function revokeSessionAPI(sessionId) {
  return await apiRequest(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function revokeAllSessionsAPI() {
  return await apiRequest('/auth/sessions/revoke-all', { method: 'POST' });
}

// Modules API

export async function getModulesAPI() {
  const data = await apiRequest('/modules');
  if (data) return data;
  return DEMO_MODULES;
}

export async function getModuleAPI(id) {
  const data = await apiRequest(`/modules/${id}`);
  if (data) return data;
  return DEMO_MODULES.find((m) => m.id === Number(id)) || null;
}

// Lessons API

export async function getLessonAPI(moduleId, lessonId) {
  const data = await apiRequest(`/modules/${moduleId}/lessons/${lessonId}`);
  if (data) return data;
  if (DEMO_LESSON_CONTENT[lessonId]) return DEMO_LESSON_CONTENT[lessonId];
  const mod = DEMO_MODULES.find((m) => m.id === Number(moduleId));
  const lesson = mod?.lessons?.find((l) => l.id === Number(lessonId));
  if (lesson) {
    return {
      ...lesson,
      module_id: Number(moduleId),
      content: `# ${lesson.title}\n\n## Overview\n\nThis lesson covers the fundamentals of **${lesson.title.toLowerCase()}**.\n\n### Learning Objectives\n\n${lesson.objectives.map((o) => `- ${o}`).join('\n')}\n\n---\n\n> **Note:** Full content is available when the backend is running. This is a demo preview.\n\n### Key Concepts\n\n` + '```' + `python\n# Example code for ${lesson.title}\ndef main():\n    print("Welcome to ${lesson.title}")\n    # Your code here\n\nif __name__ == "__main__":\n    main()\n` + '```' + `\n\n### Summary\n\nIn this lesson, you learned the core concepts of ${lesson.title.toLowerCase()}. Practice the exercises to reinforce your understanding.\n`,
      exercises: [
        {
          id: 100 + Number(lessonId),
          type: 'quiz',
          title: `${lesson.title} Quiz`,
          description: 'Test your knowledge',
          points: 10,
          question: `Which of the following is a key concept in ${lesson.title}?`,
          options: lesson.objectives.slice(0, 4).map((o) => o.substring(0, 50)),
          correct_answer: 0,
          hints: ['Review the lesson objectives carefully.'],
        },
      ],
    };
  }
  return null;
}

// Progress API

export async function getProgressAPI() {
  const data = await apiRequest('/progress');
  if (data) return data;
  return {
    modules: DEMO_MODULES.map((m) => ({
      module_id: m.id,
      completion_percentage: m.completion_percentage,
      status: m.status,
    })),
  };
}

export async function completeLessonAPI(moduleId, lessonId) {
  const data = await apiRequest(`/modules/${moduleId}/lessons/${lessonId}/complete`, {
    method: 'POST',
  });
  if (data) return data;
  return { success: true, message: 'Lesson marked as complete (demo)' };
}

export async function submitExerciseAPI(exerciseId, answer) {
  const data = await apiRequest(`/exercises/${exerciseId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  });
  if (data) return data;
  return {
    correct: true,
    score: 10,
    feedback: 'Great job! (Demo mode)',
    explanation: 'This is a demo response. Connect the backend for real grading.',
  };
}

// Dashboard & Learning Path

export async function getDashboardAPI() {
  const data = await apiRequest('/dashboard');
  if (data) return data;
  return DEMO_DASHBOARD;
}

export async function getLearningPathAPI() {
  const data = await apiRequest('/learning-path');
  if (data) return data;
  return DEMO_LEARNING_PATH;
}

// ── Sandbox API ──

export async function runCodeAPI(language, code, timeout) {
  const data = await apiRequest('/sandbox/run', {
    method: 'POST',
    body: JSON.stringify({ language, code, timeout }),
  });
  if (data) return data;
  // Fallback when backend is offline
  return {
    stdout: '(Demo mode — backend offline. Connect the backend to run code.)\n',
    stderr: '',
    exit_code: 0,
    timed_out: false,
  };
}

export async function getTemplatesAPI() {
  const data = await apiRequest('/sandbox/templates');
  if (data) return data;
  return [
    { id: 'python_hello', language: 'python', title: 'Hello World', description: 'Your first Python program', code: 'print("Hello, HPC World!")\n' },
    { id: 'bash_sysinfo', language: 'bash', title: 'System Info', description: 'Explore the host system', code: 'echo "=== Kernel ===" && uname -a\necho "\\n=== CPUs ===" && nproc\n' },
    { id: 'python_numpy', language: 'python', title: 'NumPy Matrix Ops', description: 'Linear algebra basics', code: 'import numpy as np\nA = np.random.rand(3,3)\nprint("Det:", np.linalg.det(A))\n' },
    { id: 'python_mpi_sim', language: 'python', title: 'MPI Simulation', description: 'Map-reduce across workers', code: 'data = list(range(100))\nworkers = 4\nfor r in range(workers):\n    chunk = data[r*25:(r+1)*25]\n    print(f"Worker {r}: sum={sum(chunk)}")\n' },
  ];
}

// ── Health ──

export async function healthCheckAPI() {
  const data = await apiRequest('/health');
  return data;
}
