import { put, del } from '@vercel/blob';
import { requireAdmin } from '../lib/auth.js';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const MAX_SIZE = 1 * 1024 * 1024; // 1MB

function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    if (!requireAdmin(req, res)) return;
    try {
      const contentType = req.headers['content-type'] || '';
      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (!boundaryMatch) {
        return res.status(400).json({ success: false, error: 'multipart/form-data required' });
      }

      const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');

      // Parse multipart to extract file
      const boundary = boundaryMatch[1];
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
        return res.status(400).json({ success: false, error: '파일 크기는 1MB를 초과할 수 없습니다.' });
      }

      const filename = `${Date.now()}-${filePart.filename}`;
      const blob = await put(filename, filePart.data, {
        access: 'public',
        addRandomSuffix: true,
      });

      return res.status(200).json({ success: true, url: blob.url });
    } catch (err) {
      console.error('Upload Error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, error: 'url is required' });
      }
      await del(url);
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('Delete Error:', err);
      return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
