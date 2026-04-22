import { google } from 'googleapis';
import { requireAdmin } from '../lib/auth.js';
import { put, del } from '@vercel/blob';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || null;

function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function getMimeType(ext) {
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp',
  };
  return map[ext] || 'application/octet-stream';
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
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  } catch {
    return null;
  }
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  let start = 0;
  while (true) {
    const headerEnd = buffer.indexOf(boundaryBuffer, start);
    if (headerEnd === -1) break;
    const partStart = headerEnd + boundaryBuffer.length;
    const nextBoundary = buffer.indexOf(boundaryBuffer, partStart);
    if (nextBoundary === -1) break;
    const partData = buffer.slice(partStart, nextBoundary);
    const headerEndInPart = partData.indexOf('\r\n\r\n');
    if (headerEndInPart !== -1) {
      const headerStr = partData.slice(0, headerEndInPart).toString('utf-8');
      const data = partData.slice(headerEndInPart + 4, partData.length - 2);
      const filenameMatch = headerStr.match(/filename="([^"]+)"/);
      const nameMatch = headerStr.match(/name="([^"]+)"/);
      parts.push({
        name: nameMatch ? nameMatch[1] : null,
        filename: filenameMatch ? filenameMatch[1] : null,
        data,
      });
    }
    start = nextBoundary;
  }
  return parts;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  if (!requireAdmin(req, res)) return;

  const auth = getDriveAuth();
  if (!auth) {
    return res.status(500).json({ success: false, error: 'Google Drive 인증 설정이 필요합니다.' });
  }

  try {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ success: false, error: 'multipart/form-data required' });
    }

    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
    const parts = parseMultipart(buffer, boundaryMatch[1]);
    const filePart = parts.find((p) => p.name === 'file');

    if (!filePart || !filePart.filename) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const ext = getExtension(filePart.filename);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(400).json({
        success: false,
        error: `지원하지 않는 확장자입니다. 허용: ${[...ALLOWED_EXTENSIONS].join(', ')}`,
      });
    }

    if (filePart.data.length > MAX_SIZE) {
      return res.status(400).json({ success: false, error: '파일 크기는 5MB를 초과할 수 없습니다.' });
    }

    const drive = google.drive({ version: 'v3', auth });
    const filename = `${Date.now()}-${filePart.filename}`;

    const fileMetadata = {
      name: filename,
      mimeType: getMimeType(ext),
    };
    if (DRIVE_FOLDER_ID) {
      fileMetadata.parents = [DRIVE_FOLDER_ID];
    }

    const uploadRes = await drive.files.create({
      resource: fileMetadata,
      media: { body: filePart.data, mimeType: getMimeType(ext) },
      fields: 'id, webContentLink, thumbnailLink',
    });

    const fileId = uploadRes.data.id;

    // 공개 권한 설정 (anyone with link)
    await drive.permissions.create({
      fileId,
      resource: { role: 'reader', type: 'anyone' },
      fields: 'id',
    });

    const imageUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`;

    return res.status(200).json({
      success: true,
      url: imageUrl,
      fileId,
      webContentLink: uploadRes.data.webContentLink,
    });
  } catch (err) {
    console.error('Drive Upload Error:', err.message || err);
    return res.status(500).json({ success: false, error: 'Google Drive 업로드 실패' });
  }
}
