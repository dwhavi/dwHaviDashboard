import { getAll, create } from '../lib/store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      let projects = getAll();
      const { category, q, status } = req.query;

      if (category) {
        projects = projects.filter((p) => p.category === category);
      }

      if (status) {
        projects = projects.filter((p) => p.status === status);
      }

      if (q) {
        const keyword = q.toLowerCase();
        projects = projects.filter((p) => {
          const searchable = [
            p.name,
            p.summary,
            ...(p.techStack || []),
            ...(p.tags || []),
          ]
            .join(' ')
            .toLowerCase();
          return searchable.includes(keyword);
        });
      }

      return res.status(200).json({ success: true, data: projects });
    }

    if (req.method === 'POST') {
      const { name, category } = req.body;

      if (!name || !category) {
        return res.status(400).json({
          success: false,
          error: 'name과 category는 필수 필드입니다.',
        });
      }

      const project = create(req.body);
      return res.status(201).json({ success: true, data: project });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
