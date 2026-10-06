import { parsePlanMarkdown } from '../lib/planParser.js';

const MAX_BYTES = 200 * 1024; // 200KB

function getRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  return null;
}

// multipart/form-data에서 file 파트 추출 (의존성 없는 최소 파서)
function extractFilePart(req, raw) {
  const ct = req.headers['content-type'] || '';
  const m = ct.match(/boundary=(.+)$/);
  if (!m) return null;
  const boundary = '--' + m[1].trim().replace(/^"|"$/g, '');
  const parts = raw.toString('binary').split(boundary);
  for (const part of parts) {
    if (!part.includes('filename=')) continue;
    const nameM = part.match(/filename="([^"]*)"/);
    const filename = nameM ? nameM[1] : 'upload.md';
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd < 0) continue;
    let content = part.slice(headerEnd + 4);
    if (content.endsWith('\r\n')) content = content.slice(0, -2);
    // JSON 전송 시 이 경로 안 탐. multipart만 처리
    return { filename, buffer: Buffer.from(content, 'binary') };
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    let mdText = '';
    let filename = 'plan.md';

    const raw = getRawBody(req);
    if (raw) {
      const file = extractFilePart(req, raw);
      if (!file) {
        return res.status(400).json({ success: false, error: '.md 파일을 업로드해주세요.' });
      }
      filename = file.filename || filename;
      if (!/\.md$/i.test(filename)) {
        return res.status(400).json({ success: false, error: 'md 파일만 업로드할 수 있습니다.' });
      }
      if (file.buffer.length > MAX_BYTES) {
        return res.status(400).json({ success: false, error: '파일이 너무 큽니다. (200KB 이하)' });
      }
      mdText = file.buffer.toString('utf-8');
    } else if (req.body && typeof req.body === 'object') {
      // JSON 폴백: { content, filename }
      mdText = req.body.content || '';
      filename = req.body.filename || filename;
      if (!mdText) {
        return res.status(400).json({ success: false, error: '.md 내용을 입력해주세요.' });
      }
      if (Buffer.byteLength(mdText) > MAX_BYTES) {
        return res.status(400).json({ success: false, error: '파일이 너무 큽니다. (200KB 이하)' });
      }
    } else {
      return res.status(400).json({ success: false, error: '.md 파일을 업로드해주세요.' });
    }

    // 프로젝트 디렉토리명 힌트 (업로드 파일이 packageinfo.md일 때 제목 폴백용)
    const projectHint = typeof req.query?.projectHint === 'string' ? req.query.projectHint : '';
    const { data, warnings } = parsePlanMarkdown(mdText, filename, projectHint);

    return res.status(200).json({ success: true, data, warnings });
  } catch (err) {
    console.error('PlanParse API Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
