// API base URL — Vercel 배포 시 실제 도메인으로 변경
const API_BASE = import.meta.env.VITE_API_BASE || '';

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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return json.data;
}

export async function updateProject(id, data) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return json.data;
}

export async function deleteProject(id) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, { method: 'DELETE' });
  const json = await res.json();
  return json.success;
}

export async function uploadScreenshot(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
  const json = await res.json();
  return json.url;
}

export async function fetchReadmeStructure(githubUrl) {
  const res = await fetch(`${API_BASE}/api/readme`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ githubUrl }),
  });
  const json = await res.json();
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
