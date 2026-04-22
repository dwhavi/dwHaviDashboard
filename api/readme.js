function extractOwnerRepo(githubUrl) {
  const patterns = [
    /github\.com\/([^/]+)\/([^/\s#?]+)/,
    /github\.com:([^/]+)\/([^/\s#?]+)/,
  ];

  for (const pattern of patterns) {
    const match = githubUrl.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
    }
  }
  return null;
}

function parseReadme(readmeText) {
  const result = {
    summary: '',
    description: readmeText,
    techStack: [],
    features: [],
    architecture: '',
  };

  // Summary: first paragraph before any ##
  const firstHeading = readmeText.indexOf('\n## ');
  if (firstHeading > 0) {
    let intro = readmeText.substring(0, firstHeading).trim();
    // Remove the top-level # heading line
    intro = intro.replace(/^#\s+.+\n?/, '').trim();
    // Take first paragraph (text before first blank line)
    const firstParagraph = intro.split(/\n\s*\n/)[0];
    result.summary = firstParagraph.replace(/\n/g, ' ').trim();
  } else {
    let intro = readmeText.replace(/^#\s+.+\n?/, '').trim();
    const firstParagraph = intro.split(/\n\s*\n/)[0];
    result.summary = firstParagraph.replace(/\n/g, ' ').trim();
  }

  // Tech Stack / Technologies section
  const techPatterns = [
    /\n##\s+(?:Tech\s+Stack|Technologies|기술\s+스택|Tech)\s*\n([\s\S]*?)(?=\n##\s|\n###\s|$)/i,
  ];
  for (const pattern of techPatterns) {
    const match = readmeText.match(pattern);
    if (match) {
      const section = match[1];
      // Extract items from lists, tables, or comma-separated text
      const items = section.match(/[-*|]\s*([A-Za-z0-9+#./_ ]{2,40})/g);
      if (items) {
        result.techStack = items
          .map((item) => item.replace(/^[-*|]\s*/, '').trim())
          .filter((item) => item.length > 1 && item.length < 40);
      }
      break;
    }
  }

  // Features section
  const featuresPattern = /\n##\s+(?:Features|기능|주요\s+기능)\s*\n([\s\S]*?)(?=\n##\s|\n###\s|$)/i;
  const featuresMatch = readmeText.match(featuresPattern);
  if (featuresMatch) {
    const listItems = featuresMatch[1].match(/^[-*]\s+(.+)$/gm);
    if (listItems) {
      result.features = listItems.map((item) => {
        // Remove emoji prefixes and leading symbols
        return item.replace(/^[-*]\s+/, '').replace(/^\s*[^\w\s]+\s*/, '').trim();
      });
    }
  }

  // Architecture section
  const archPattern = /\n##\s+(?:Architecture|아키텍처|구조)\s*\n([\s\S]*?)(?=\n##\s|\n###\s|$)/i;
  const archMatch = readmeText.match(archPattern);
  if (archMatch) {
    result.architecture = archMatch[1].trim();
  }

  return result;
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
    const { githubUrl } = req.body;

    if (!githubUrl) {
      return res.status(400).json({ success: false, error: 'githubUrl이 필요합니다.' });
    }

    const parsed = extractOwnerRepo(githubUrl);
    if (!parsed) {
      return res.status(400).json({ success: false, error: '유효하지 않은 GitHub URL입니다.' });
    }

    const { owner, repo } = parsed;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;

    const headers = {
      'User-Agent': 'dwHaviDashboard',
      Accept: 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ success: false, error: 'README를 찾을 수 없습니다.' });
      }
      return res.status(502).json({
        success: false,
        error: `GitHub API 에러: ${response.status} ${response.statusText}`,
      });
    }

    const data = await response.json();
    const content = data.content || '';
    const encoding = data.encoding || 'base64';
    let readmeText;

    if (encoding === 'base64') {
      readmeText = Buffer.from(content, 'base64').toString('utf-8');
    } else {
      readmeText = content;
    }

    // Regex-based parsing
    const parsedResult = parseReadme(readmeText);

    // AI enhancement if API key is available (future expansion)
    if (process.env.OPENAI_API_KEY) {
      // Placeholder for future OpenAI-based enhancement
      // Could send parsedResult + readmeText to OpenAI for more accurate extraction
    }

    return res.status(200).json({ success: true, data: parsedResult });
  } catch (err) {
    console.error('Readme API Error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}
