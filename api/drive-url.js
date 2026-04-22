import { google } from 'googleapis';
import { requireAdmin } from '../lib/auth.js';

function extractFileId(input) {
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  // https://drive.google.com/uc?id=FILE_ID
  // https://lh3.googleusercontent.com/... (already public)
  if (input.includes('lh3.googleusercontent.com') || input.includes('drive.google.com/thumbnail')) {
    return { type: 'direct', url: input };
  }

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)\//,
  ];

  for (const p of patterns) {
    const m = input.match(p);
    if (m) return { type: 'drive', fileId: m[1] };
  }

  // raw file ID (33 chars, alphanumeric + - + _)
  if (/^[a-zA-Z0-9_-]{20,40}$/.test(input.trim())) {
    return { type: 'drive', fileId: input.trim() };
  }

  return null;
}

function getDriveAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) return null;
  try {
    const privateKey = key.replace(/\\n/g, '\n');
    return new google.auth.JWT({
      email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'URL이 필요합니다.' });
  }

  // 이미 공개 링크인 경우 바로 반환 (인증 불필요)
  const parsed = extractFileId(url);
  if (!parsed) {
    return res.status(400).json({ success: false, error: '유효하지 않은 구글 드라이브 URL입니다.' });
  }

  if (parsed.type === 'direct') {
    return res.status(200).json({ success: true, url: parsed.url });
  }

  // Drive API 호출이 필요하므로 인증 요구
  if (!requireAdmin(req, res)) return;

  const auth = getDriveAuth();
  if (!auth) {
    return res.status(500).json({ success: false, error: 'Google Drive 인증 설정이 필요합니다.' });
  }

  try {
    const drive = google.drive({ version: 'v3', auth });

    // 파일 메타데이터 확인
    const file = await drive.files.get({
      fileId: parsed.fileId,
      fields: 'id, name, mimeType, permissions, thumbnailLink, webContentLink',
    });

    // 이미지 파일인지 확인
    if (!file.data.mimeType?.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: `"${file.data.name}"은(는) 이미지 파일이 아닙니다 (${file.data.mimeType}).`,
      });
    }

    // 공개 권한이 있는지 확인 후 없으면 설정
    const hasPublicPermission = file.data.permissions?.some(
      (p) => p.type === 'anyone' && p.role === 'reader'
    );

    if (!hasPublicPermission) {
      await drive.permissions.create({
        fileId: parsed.fileId,
        resource: { role: 'reader', type: 'anyone' },
        fields: 'id',
      });
    }

    const imageUrl = `https://drive.google.com/thumbnail?id=${parsed.fileId}&sz=w600`;

    return res.status(200).json({
      success: true,
      url: imageUrl,
      fileName: file.data.name,
    });
  } catch (err) {
    if (err.code === 404) {
      return res.status(404).json({ success: false, error: '파일을 찾을 수 없습니다. 공유 설정을 확인해주세요.' });
    }
    if (err.code === 403) {
      return res.status(403).json({ success: false, error: '파일에 접근할 권한이 없습니다.' });
    }
    console.error('Drive URL Error:', err.message || err);
    return res.status(500).json({ success: false, error: 'Google Drive 변환 실패' });
  }
}
