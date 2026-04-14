// API layer — pure code, no inline data
// All demo/mock data lives in frontend/src/data/*.json

import { getAccessToken, setAccessToken } from './auth';
import DEMO_MODULES from '../data/modules.json';
import DEMO_USER from '../data/demoUser.json';
import DEMO_LESSON_CONTENT from '../data/lessonContent.json';
import INTERACTIVE_MAP from '../data/interactiveContent.json';
import {
  DEMO_DASHBOARD,
  DEMO_LEARNING_PATH,
  DEMO_TEMPLATES,
  generateDemoLessonContent,
  generateDemoExercises,
} from '../data/demoContent';

const BASE_URL = '/api';

// ── Helpers ──

function getToken() {
  return getAccessToken() || localStorage.getItem('hpc_auth_token');
}

function buildInteractiveDirective(slug) {
  const entry = INTERACTIVE_MAP[slug];
  if (!entry) return '';
  const cfg = entry.config ? ` config='${entry.config}'` : '';
  return `:::interactive{component="${entry.component}"${cfg}}`;
}

// ── Core request with auto-refresh ──

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
      credentials: 'include',
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn(`Backend unavailable for ${endpoint} (non-JSON response), using demo data`);
      return null;
    }

    if (response.status === 401 && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
      try {
        const refreshData = await refreshTokenAPI();
        if (refreshData && refreshData.access_token) {
          setAccessToken(refreshData.access_token);
          const retryHeaders = { ...headers, Authorization: `Bearer ${refreshData.access_token}` };
          const retryResponse = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers: retryHeaders,
            credentials: 'include',
          });
          if (retryResponse.ok) return await retryResponse.json();
        }
      } catch { /* refresh failed */ }
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

// ── Auth API ──

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
    credentials: 'include',
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

// ── Modules API ──

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

// ── Lessons API ──

export async function getLessonAPI(moduleId, lessonId) {
  const data = await apiRequest(`/modules/${moduleId}/lessons/${lessonId}`);
  if (data) return data;

  // Static lesson content from JSON
  if (DEMO_LESSON_CONTENT[lessonId]) return DEMO_LESSON_CONTENT[lessonId];

  // Generate from module data + interactive mapping
  const mod = DEMO_MODULES.find((m) => m.id === Number(moduleId));
  const lesson = mod?.lessons?.find((l) => l.id === Number(lessonId));
  if (lesson) {
    const directive = buildInteractiveDirective(lesson.slug);
    return {
      ...lesson,
      module_id: Number(moduleId),
      content: generateDemoLessonContent(lesson, directive),
      exercises: generateDemoExercises(lesson, lessonId),
    };
  }
  return null;
}

// ── Progress API ──

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

// ── Dashboard & Learning Path ──

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
  return DEMO_TEMPLATES;
}

// ── Health ──

export async function healthCheckAPI() {
  const data = await apiRequest('/health');
  return data;
}
