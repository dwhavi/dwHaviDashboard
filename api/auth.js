import { signToken } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, error: '비밀번호를 입력해주세요.' });
  }

  const token = signToken(password);
  if (!token) {
    return res.status(401).json({ success: false, error: '비밀번호가 올바르지 않습니다.' });
  }

  return res.status(200).json({
    success: true,
    token,
    expiresIn: '24h',
  });
}
