/**
 * planParser.js — 기획서 md 파싱 (의존성 없음)
 *
 * 호환 기준 (PLAN-v2 §4.0):
 *  1. 최소 코어만 필수 (제목 + 본문), 나머지 전부 optional
 *  2. 별칭(alias) 매핑표로 3계열 양식 흡수
 *  3. 실패 금지 — 파싱 실패해도 원문 보관, 빈칸은 사용자가 채움
 */

// ── 1. frontmatter 분리 ──

export function splitFrontmatter(mdText) {
  const text = mdText.replace(/^\uFEFF/, '');
  // closing fence 앞 백틱 오타(`---) 관용
  const m = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n`?---\s*(?:\r?\n|$)/);
  if (!m) return { frontmatter: null, body: stripBrokenFrontmatter(text), frontmatterError: startsBrokenFrontmatter(text) };
  try {
    const data = parseYamlSubset(m[1]);
    return { frontmatter: data, body: text.slice(m[0].length), frontmatterError: false };
  } catch {
    // frontmatter 깨짐 (예: 백틱 오타) → 무시하고 본문만
    return { frontmatter: null, body: text, frontmatterError: true };
  }
}

// 깨진 frontmatter(닫는 --- 없음) 감지 + 본문 복구
function startsBrokenFrontmatter(text) {
  return /^---\s*\r?\n/.test(text);
}

function stripBrokenFrontmatter(text) {
  if (!startsBrokenFrontmatter(text)) return text;
  // 첫 `# ` 헤딩부터를 본문으로 복구, 없으면 --- 첫 줄만 제거
  const h = text.search(/^#\s+/m);
  if (h > 0) return text.slice(h);
  return text.replace(/^---\s*\r?\n/, '');
}

// ── 2. YAML 서브셋 파서 ──
// 지원: scalar, 인라인 배열 [a, b], 블록 리스트 `- `, 중첩 맵, 객체 리스트

function parseScalar(raw) {
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~' || s === '') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return splitInlineArray(inner).map((v) => parseScalar(v));
  }
  return s;
}

function splitInlineArray(inner) {
  const out = [];
  let cur = '';
  let quote = null;
  for (const ch of inner) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === ',') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim() !== '') out.push(cur.trim());
  return out;
}

function indentOf(line) {
  const m = line.match(/^(\s*)\S/);
  return m ? m[1].length : 0;
}

function parseYamlSubset(src) {
  const lines = src.split(/\r?\n/);
  const root = {};
  // 스택: { container(Object|Array), indent, pendingKey }
  parseBlock(lines, 0, lines.length, 0, root);
  return root;
}

function parseBlock(lines, start, end, baseIndent, container) {
  let i = start;
  while (i < end) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const ind = indentOf(line);
    if (ind < baseIndent) break;
    const trimmed = line.trim();

    if (trimmed.startsWith('- ')) {
      if (!Array.isArray(container)) throw new Error('list item outside list');
      const itemText = trimmed.slice(2).trim();
      // `- key: value` 형태 → 객체 아이템
      const kv = itemText.match(/^([\w.-]+)\s*:\s*(.*)$/);
      if (kv) {
        const obj = {};
        const v = kv[2].trim();
        if (v === '') {
          // 중첩 블록
          const childIndent = indentOf(lines[i + 1] ?? '');
          const sub = {};
          const next = parseBlock(lines, i + 1, end, childIndent, sub);
          obj[kv[1]] = sub;
          i = next;
        } else {
          obj[kv[1]] = parseScalar(v);
          i++;
          // 같은 indent의 후속 `key: value` 들도 같은 객체에
          while (i < end) {
            const nl = lines[i];
            if (!nl.trim()) { i++; continue; }
            if (indentOf(nl) !== ind + 2 && indentOf(nl) !== ind) break;
            const nm = nl.trim().match(/^([\w.-]+)\s*:\s*(.*)$/);
            if (!nm || nl.trim().startsWith('- ')) break;
            const nv = nm[2].trim();
            if (nv === '') {
              const sub = {};
              i = parseBlock(lines, i + 1, end, indentOf(lines[i + 1] ?? ''), sub);
              obj[nm[1]] = sub;
            } else {
              obj[nm[1]] = parseScalar(nv);
              i++;
            }
          }
        }
        container.push(obj);
      } else {
        container.push(parseScalar(itemText));
        i++;
      }
      continue;
    }

    const kv = trimmed.match(/^([\w.-]+)\s*:\s*(.*)$/);
    if (!kv) { i++; continue; } // 해석 불가 줄은 스킵 (관대한 파싱)
    const key = kv[1];
    const rest = kv[2].trim();
    if (Array.isArray(container)) throw new Error('map key inside list');
    if (rest !== '') {
      container[key] = parseScalar(rest);
      i++;
    } else {
      // 값이 다음 줄 블록에 있음 → 리스트 or 맵 판별
      let j = i + 1;
      while (j < end && !lines[j].trim()) j++;
      if (j >= end) { container[key] = null; i = j; continue; }
      const childIndent = indentOf(lines[j]);
      if (lines[j].trim().startsWith('- ')) {
        const arr = [];
        container[key] = arr;
        i = parseBlock(lines, j, end, childIndent, arr);
      } else {
        const sub = {};
        container[key] = sub;
        i = parseBlock(lines, j, end, childIndent, sub);
      }
    }
  }
  return i;
}

// ── 3. 정규화 헬퍼 ──

function toStringArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === 'object') {
    // object형 tech_stack → "key: value" 펼침
    return Object.entries(v).map(([k, val]) => `${k}: ${val}`.trim());
  }
  // 쉼표 구분 문자열
  return String(v).split(',').map((s) => s.trim()).filter(Boolean);
}

function firstString(...vals) {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

const STATUS_MAP = {
  active: 'active', development: 'development', archived: 'archived',
  complete: 'active', completed: 'active',
  planning: 'development', inactive: 'archived', deactive: 'archived',
};

function normalizeStatus(v) {
  if (typeof v !== 'string') return '';
  // "Phase 0 - 기획" 같은 값에서 키워드 추출
  const low = v.toLowerCase();
  for (const [k, norm] of Object.entries(STATUS_MAP)) {
    if (low.includes(k)) return norm;
  }
  return '';
}

function normalizeServiceLinks(fm) {
  // 1순위: serviceLinks 배열
  if (Array.isArray(fm.serviceLinks)) {
    return fm.serviceLinks
      .filter((l) => l && (l.url || l.href))
      .map((l) => ({ label: String(l.label || l.name || 'Link').slice(0, 30), url: String(l.url || l.href) }))
      .slice(0, 10);
  }
  const links = [];
  // 2순위: serviceUrl 단일 → 승격
  if (typeof fm.serviceUrl === 'string' && fm.serviceUrl.trim()) {
    links.push({ label: 'Live', url: fm.serviceUrl.trim() });
  }
  // 3순위: external_apis[].url
  if (Array.isArray(fm.external_apis)) {
    for (const api of fm.external_apis) {
      if (api && api.url) {
        links.push({ label: String(api.name || 'API').slice(0, 30), url: String(api.url) });
      }
    }
  }
  // 4순위: repository (github 관례) → githubUrl로도 사용하므로 여기선 제외, 호출부에서 처리
  return links.slice(0, 10);
}

// ── 4. 본문 파싱 ──

const GENERIC_HEADINGS = new Set(['기능', 'features', 'feature', '기능 목록', '개요', '소개', '목록']);

function extractH1(body) {
  const h1s = [...body.matchAll(/^#\s+(.+)$/gm)].map((m) => m[1].trim());
  const goodH1 = h1s.find((h) => !GENERIC_HEADINGS.has(h.toLowerCase()));
  if (goodH1) return goodH1.replace(/[*_`]/g, '');
  if (h1s.length > 0) return ''; // H1이 generic뿐이면 제목 없음 취급 (파일명 폴백 방지)
  const subs = [...body.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => m[1].trim());
  const meaningful = subs.find((h) => !GENERIC_HEADINGS.has(h.toLowerCase()));
  return (meaningful ?? '').replace(/[*_`]/g, '');
}

function firstParagraph(body) {
  // 첫 ## 이전 인용/제목 제거 후 첫 단락
  let intro = body;
  const h2idx = intro.search(/\n##\s/);
  if (h2idx > 0) intro = intro.slice(0, h2idx);
  intro = intro.replace(/^#\s+.+$/m, '').replace(/^>\s?/gm, '').replace(/^\|.*$/gm, '').trim();
  const para = intro.split(/\n\s*\n/)[0] || '';
  return para.replace(/\n/g, ' ').replace(/[*_`]/g, '').trim();
}

function extractSectionList(body, headingRes) {
  for (const re of headingRes) {
    const m = body.match(re);
    if (m && m[1]) {
      const items = m[1].match(/^[-*]\s+(.+)$/gm);
      if (items) return items.map((l) => l.replace(/^[-*]\s+/, '').replace(/^[^\w가-힣]+/, '').trim()).filter(Boolean);
      // 리스트 없으면 쉼표 텍스트로
      const t = m[1].trim();
      if (t) return t.split(/[,\n]/).map((s) => s.replace(/^[|\-*\s]+/, '').trim()).filter((s) => s.length > 1 && s.length < 60);
    }
  }
  return [];
}

const FEATURE_HEADINGS = [
  /\n##\s+(?:\d+\.\s*)?(?:주요\s*기능|핵심\s*기능|기능|Features?)[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i,
  // "# 기능" 바로 뒤 본문 + 하위 ### 섹션들을 features로 흡수
  /^#\s+(?:기능)\s*\n([\s\S]*)$/i,
];
const TECH_HEADINGS = [
  /\n##\s+(?:기술\s*스택|기술스택|Tech\s*Stack|Technologies|Tech)\s*\n([\s\S]*?)(?=\n##\s|\n###\s|$)/i,
];

// ── 5. 메인: md → 초안 ──

export function parsePlanMarkdown(mdText, fallbackFilename = '', fallbackDirName = '') {
  const warnings = [];
  const { frontmatter: fm, body, frontmatterError } = splitFrontmatter(mdText);
  if (frontmatterError) warnings.push('frontmatter 파싱 실패 — 본문만 사용합니다.');
  const f = fm || {};

  const h1 = extractH1(body);
  if (!h1 && !firstString(f.name, f.title)) warnings.push('제목을 찾지 못했습니다 — 직접 입력해주세요.');
  const name = firstString(f.name, f.title, h1)
    || fallbackDirName
    || fallbackFilename.replace(/\.md$/i, '')
    || '제목 없음';
  let summary = firstString(f.summary);
  if (!summary && typeof f.description === 'string') {
    summary = f.description.trim().split('\n')[0].slice(0, 300);
  }
  if (!summary) summary = firstParagraph(body).slice(0, 300);

  const techFromFm = toStringArray(f.tech_stack ?? f.techStack ?? f.technologies);
  const techFromBody = extractSectionList(body, TECH_HEADINGS);
  const techStack = techFromFm.length > 0 ? techFromFm : techFromBody;

  const features = extractSectionList(body, FEATURE_HEADINGS);

  const serviceLinks = normalizeServiceLinks(f);
  let githubUrl = '';
  if (typeof f.repository === 'string' && f.repository.trim()) {
    githubUrl = f.repository.trim().startsWith('http')
      ? f.repository.trim()
      : `https://github.com/${f.repository.trim()}`;
  }

  return {
    data: {
      name,
      summary,
      description: firstParagraph(body),
      category: typeof f.category === 'string' ? f.category : 'web',
      status: normalizeStatus(f.status ?? f.serviceStatus ?? f.phase) || 'development',
      techStack,
      features,
      tags: toStringArray(f.tags ?? f.keywords),
      githubUrl,
      serviceLinks,
      version: firstString(String(f.version ?? '')),
      license: firstString(String(f.license ?? '')),
      planContent: mdText,
      planFilename: fallbackFilename,
    },
    warnings,
  };
}
