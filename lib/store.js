import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'projects.json');

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
      return [];
    }
    throw err;
  }
}

function writeData(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function getAll() {
  return readData();
}

export function getById(id) {
  const projects = readData();
  return projects.find((p) => p.id === id) || null;
}

export function create(data) {
  const projects = readData();
  const now = new Date().toISOString().split('T')[0];
  const project = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: now,
    updatedAt: now,
  };
  projects.push(project);
  writeData(projects);
  return project;
}

export function update(id, data) {
  const projects = readData();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const now = new Date().toISOString().split('T')[0];
  projects[index] = { ...projects[index], ...data, updatedAt: now };
  writeData(projects);
  return projects[index];
}

export function deleteById(id) {
  const projects = readData();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return false;
  projects.splice(index, 1);
  writeData(projects);
  return true;
}
