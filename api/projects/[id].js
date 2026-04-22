import { getById, update, deleteById } from '../../lib/store.js';
import { requireAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const project = await getById(id);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      return res.status(200).json({ success: true, data: project });
    }

    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const project = await update(id, req.body);
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      return res.status(200).json({ success: true, data: project });
    }

    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const deleted = await deleteById(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }
      return res.status(200).json({ success: true, data: null });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
