import { verifyToken } from '../lib/auth.js';
import * as store from '../lib/store-v2.js';
import { syncAll } from '../lib/githubSync.js';
import { parsePlanMarkdown } from '../lib/planParser.js';

// 지시서 요구: 비로그인 403 (requireAdmin의 401이 아님)
function adminOr403(req, res) {
  if (!process.env.ADMIN_PASSWORD) {
    res.status(503).json({ success: false, error: '관리자 인증이 설정되지 않았습니다.' });
    return false;
  }
  if (!verifyToken(req)) {
    res.status(403).json({ success: false, error: '관리자 전용입니다.' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (!adminOr403(req, res)) return;

    if (req.method === 'GET') {
      await store.ensureSyncLogTable();
      const logs = await store.listSyncLogs(10);
      return res.status(200).json({ success: true, data: logs });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    const token = process.env.GITHUB_TOKEN || null;
    const startedAt = new Date().toISOString();
    await store.ensureSyncLogTable();

    // 기존 수동 행의 Live 링크를 힌트로 전달 (없어도 등록)
    const serviceLinksByRepo = {};
    try {
      const rows = await store.findAllWithRepo();
      for (const r of rows) {
        if (r.repoFullName && Array.isArray(r.serviceLinks) && r.serviceLinks.length > 0) {
          serviceLinksByRepo[r.repoFullName] = r.serviceLinks;
        }
      }
    } catch { /* 힌트 없이 진행 */ }

    const warnings = [];
    const stats = await syncAll({
      token,
      store,
      parsePlanMarkdown,
      users: ['@me'],
      serviceLinksByRepo,
      log: (m) => warnings.push(m),
    });
    const finishedAt = new Date().toISOString();

    await store.insertSyncLog({
      startedAt,
      finishedAt,
      created: stats.created || 0,
      updated: stats.updated || 0,
      skipped: stats.skipped || 0,
      archived: stats.archived || 0,
      manual: stats.manual || 0,
      ok: !!stats.ok,
      errors: { errors: stats.errors || [], warnings },
    });

    return res.status(200).json({
      success: true,
      data: {
        created: stats.created || 0,
        updated: stats.updated || 0,
        skipped: stats.skipped || 0,
        archived: stats.archived || 0,
        manual: stats.manual || 0,
        ok: !!stats.ok,
        reason: stats.reason || null,
        rateLimited: !!stats.rateLimited,
        errors: stats.errors || [],
      },
    });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
