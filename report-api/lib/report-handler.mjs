const GITHUB_API_VERSION = '2026-03-10';
const REPOSITORY_OWNER = 'Robertg761';
const REPOSITORY_NAME = 'Rosewater';
const REPORT_LABEL = 'user-report';
const MAX_BODY_BYTES = 12_000;
const MAX_REPORTS_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const rateLimitBuckets = new Map();

function send(response, status, payload, headers = {}) {
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Access-Control-Allow-Origin', '*');
  return response.status(status).json(payload);
}

function githubToken(env) {
  const token = env.GITHUB_ISSUE_TOKEN?.trim();
  if (!token) throw new Error('GitHub issue token is missing');
  return token;
}

function cleanSingleLine(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanDescription(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, 5000)
    .replace(/@(?=[A-Za-z0-9_])/g, '@\u200b');
}

function cleanMetadata(value, fallback) {
  const clean = cleanSingleLine(value, 80);
  return clean === '' ? fallback : clean;
}

function parseReport(body) {
  const title = cleanSingleLine(body?.title, 120);
  const description = cleanDescription(body?.description);
  if (title.length < 4) return { error: 'Add a short title with at least 4 characters.' };
  if (description.length < 10) {
    return { error: 'Describe what happened using at least 10 characters.' };
  }
  return {
    report: {
      title,
      description,
      appVersion: cleanMetadata(body?.appVersion, 'unknown'),
      platform: cleanMetadata(body?.platform, 'unknown'),
      osVersion: cleanMetadata(body?.osVersion, 'unknown'),
    },
  };
}

function clientKey(request) {
  const forwarded =
    request.headers?.['x-vercel-forwarded-for'] ?? request.headers?.['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded ?? '').split(',')[0].trim();
  const remote = request.socket?.remoteAddress ?? 'unknown';
  const userAgent = String(request.headers?.['user-agent'] ?? 'unknown').slice(0, 160);
  return `${ip || remote}|${userAgent}`;
}

function reserveRateLimit(request, nowMs) {
  const key = clientKey(request);
  const recent = (rateLimitBuckets.get(key) ?? []).filter(
    (time) => nowMs - time < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= MAX_REPORTS_PER_WINDOW) {
    const retryAfterMs = RATE_LIMIT_WINDOW_MS - (nowMs - recent[0]);
    return { retryAfter: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  recent.push(nowMs);
  rateLimitBuckets.set(key, recent);

  if (rateLimitBuckets.size > 1000) {
    for (const [bucketKey, times] of rateLimitBuckets) {
      if (times.every((time) => nowMs - time >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitBuckets.delete(bucketKey);
      }
    }
  }
  return { reservation: { key, time: nowMs } };
}

function releaseRateLimit(reservation) {
  if (!reservation) return;
  const recent = rateLimitBuckets.get(reservation.key) ?? [];
  const index = recent.lastIndexOf(reservation.time);
  if (index >= 0) recent.splice(index, 1);
  if (recent.length === 0) rateLimitBuckets.delete(reservation.key);
}

function issueBody(report) {
  return [
    '## User report',
    '',
    report.description,
    '',
    '## App information',
    '',
    `- Rosewater version: ${report.appVersion}`,
    `- Platform: ${report.platform}`,
    `- OS version: ${report.osVersion}`,
    '',
    '_Submitted from Rosewater. No hair care records, photos, or device identifiers were attached._',
  ].join('\n');
}

async function githubRequest(fetchFn, url, token, options = {}) {
  return fetchFn(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'rosewater-report-api',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
      ...options.headers,
    },
  });
}

async function createIssue(fetchFn, token, report) {
  const response = await githubRequest(
    fetchFn,
    `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/issues`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({
        title: `[User report] ${report.title}`,
        body: issueBody(report),
        labels: [REPORT_LABEL],
      }),
    }
  );
  if (!response.ok) throw new Error(`GitHub issue request failed with ${response.status}`);
  const payload = await response.json();
  if (!Number.isInteger(payload.number) || typeof payload.html_url !== 'string') {
    throw new Error('GitHub issue response was invalid');
  }
  return { number: payload.number, url: payload.html_url };
}

export function createReportHandler({
  fetchFn = fetch,
  env = process.env,
  now = Date.now,
  logger = console,
} = {}) {
  return async function reportHandler(request, response) {
    if (request.method === 'OPTIONS') {
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      return send(response, 200, { ok: true });
    }
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST, OPTIONS');
      return send(response, 405, { error: 'Method not allowed.' });
    }

    const contentLength = Number(request.headers?.['content-length'] ?? 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return send(response, 413, { error: 'The report is too large.' });
    }

    const parsed = parseReport(request.body);
    if (parsed.error) return send(response, 400, { error: parsed.error });

    const rateLimit = reserveRateLimit(request, now());
    if (rateLimit.retryAfter != null) {
      return send(
        response,
        429,
        { error: 'Too many reports. Try again later.' },
        { 'Retry-After': String(rateLimit.retryAfter) }
      );
    }

    try {
      const token = githubToken(env);
      const issue = await createIssue(fetchFn, token, parsed.report);
      return send(response, 201, { issue });
    } catch (error) {
      releaseRateLimit(rateLimit.reservation);
      logger.error(
        'Issue submission failed',
        error instanceof Error ? error.message : 'unknown error'
      );
      return send(response, 502, { error: 'GitHub could not create the issue.' });
    }
  };
}

export const __testing = { issueBody, parseReport };
