// API base URL — Vercel 배포 시 실제 도메인으로 변경
const API_BASE = import.meta.env.VITE_API_BASE || '';

// 토큰 헬퍼
export function getToken() {
  return localStorage.getItem('admin_token');
}

export function setToken(token) {
  localStorage.setItem('admin_token', token);
}

export function clearToken() {
  localStorage.removeItem('admin_token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(password) {
  const res = await fetch(`${API_BASE}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '로그인 실패');
  return json.token;
}

export async function fetchProjects(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/api/projects${query ? '?' + query : ''}`);
  const json = await res.json();
  return json.data || [];
}

export async function fetchProject(id) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`);
  const json = await res.json();
  return json.data || null;
}

export async function createProject(data) {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '생성 실패');
  return json.data;
}

export async function updateProject(id, data) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '수정 실패');
  return json.data;
}

export async function deleteProject(id) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || '삭제 실패');
  return json.success;
}

export async function uploadScreenshot(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Upload failed');
  return json.url;
}

export async function uploadToDrive(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/drive-upload`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Drive upload failed');
  return json.url;
}

export async function resolveDriveUrl(url) {
  const res = await fetch(`${API_BASE}/api/drive-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ url }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Drive URL conversion failed');
  return json.url;
}

export async function fetchReadmeStructure(githubUrl) {
  const res = await fetch(`${API_BASE}/api/readme`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ githubUrl }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `README 불러오기 실패 (${res.status})`);
  }
  return json.data;
}

export const categoryMap = {
  web: "Web App",
  mobile: "Mobile",
  ai: "AI/ML",
  devops: "DevOps",
  tool: "Tools",
};

export const categories = [
  { key: "all", label: "전체" },
  { key: "web", label: "Web App" },
  { key: "mobile", label: "Mobile" },
  { key: "ai", label: "AI/ML" },
  { key: "devops", label: "DevOps" },
  { key: "tool", label: "Tools" },
];
