import fs from 'fs';
import path from 'path';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const MAX_SIZE = 1 * 1024 * 1024; // 1MB

function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);

  let start = 0;
  while (true) {
    const headerEnd = buffer.indexOf(boundaryBuffer, start);
    if (headerEnd === -1) break;

    const partStart = headerEnd + boundaryBuffer.length;

    // Check for closing boundary
    const nextLine = buffer.indexOf(boundaryBuffer, partStart);
    if (nextLine === -1) break;

    const partData = buffer.slice(partStart, nextLine);

    // Find header end in part
    const headerEndInPart = partData.indexOf('\r\n\r\n');
    if (headerEndInPart !== -1) {
      const headerStr = partData.slice(0, headerEndInPart).toString('utf-8');
      const data = partData.slice(headerEndInPart + 4, partData.length - 2); // Remove trailing \r\n

      // Parse Content-Disposition
      const nameMatch = headerStr.match(/name="([^"]+)"/);
      const filenameMatch = headerStr.match(/filename="([^"]+)"/);

      parts.push({
        name: nameMatch ? nameMatch[1] : null,
        filename: filenameMatch ? filenameMatch[1] : null,
        data,
      });
    }

    start = nextLine;
  }

  return parts;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
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
      return res.status(400).json({ success: false, error: '파일 크기는 1MB를 초과할 수 없습니다.' });
    }

    const screenshotsDir = path.resolve(process.cwd(), 'public', 'screenshots');
    fs.mkdirSync(screenshotsDir, { recursive: true });

    const filename = `${Date.now()}-${filePart.filename}`;
    const filePath = path.join(screenshotsDir, filename);
    fs.writeFileSync(filePath, filePart.data);

    return res.status(200).json({
      success: true,
      url: `/screenshots/${filename}`,
    });
  } catch (err) {
    console.error('Upload Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
