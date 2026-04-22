import jwt from 'jsonwebtoken';

const TOKEN_EXPIRY = '24h';

/**
 * 비밀번호 검증 후 JWT 토큰 발급
 */
export function signToken(password) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return null;

  if (password !== adminPassword) return null;

  return jwt.sign(
    { role: 'admin', iat: Math.floor(Date.now() / 1000) },
    adminPassword, // 비밀번호 자체를 시크릿으로 사용
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * 요청에서 토큰을 추출하고 검증. 성공 시 decoded 반환, 실패 시 null.
 */
export function verifyToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) return null;

  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return null;

  try {
    return jwt.verify(token, secret);
  } catch {
    return null;
  }
}

/**
 * 쓰기 API 미들웨어 — 토큰 검증 후 next() 호출
 * @returns {boolean} true면 통과, false면 이미 응답 전송됨
 */
export function requireAdmin(req, res) {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) {
    res.status(503).json({ success: false, error: '관리자 인증이 설정되지 않았습니다.' });
    return false;
  }

  const decoded = verifyToken(req);
  if (!decoded) {
    res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    return false;
  }

  return true;
}
