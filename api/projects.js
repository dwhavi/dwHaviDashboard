import { getAll, create, serializePublicList } from '../lib/store-v2.js';
import { requireAdmin, verifyToken } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const { category, q, status } = req.query;
      const projects = await getAll({ category, status, q });
      // 비로그인 호출은 공개 필드만 (서버 강제). 관리자는 전체 필드.
      if (verifyToken(req)) {
        return res.status(200).json({ success: true, data: projects });
      }
      return res.status(200).json({ success: true, data: serializePublicList(projects) });
    }

    if (req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const { name, category } = req.body;

      if (!name || !category) {
        return res.status(400).json({
          success: false,
          error: 'name과 category는 필수 필드입니다.',
        });
      }

      const project = await create(req.body);
      return res.status(201).json({ success: true, data: project });
    }

    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
