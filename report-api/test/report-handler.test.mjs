import assert from 'node:assert/strict';
import test from 'node:test';
import { createReportHandler } from '../lib/report-handler.mjs';

const env = { GITHUB_ISSUE_TOKEN: 'github-token' };
const silentLogger = { error() {} };

function responseMock() {
  return {
    headers: {},
    statusCode: null,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

function request(body, overrides = {}) {
  return {
    method: 'POST',
    body,
    headers: {
      'user-agent': 'rosewater-test',
      'x-forwarded-for': overrides.ip ?? '192.0.2.1',
    },
    socket: {},
    ...overrides,
  };
}

test('creates a narrowly scoped GitHub issue', async () => {
  const calls = [];
  const fetchFn = async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options.body) });
    return {
      ok: true,
      status: 201,
      json: async () => ({ number: 42, html_url: 'https://github.com/example/issues/42' }),
    };
  };
  const handler = createReportHandler({
    fetchFn,
    env,
    now: () => 1_800_000_000_000,
    logger: silentLogger,
  });
  const response = responseMock();

  await handler(
    request({
      title: '  Calendar loses an entry  ',
      description: 'An entry disappears after I change its date. @maintainer',
      appVersion: '1.1.0',
      platform: 'android',
      osVersion: '36',
    }),
    response
  );

  assert.equal(response.statusCode, 201);
  assert.deepEqual(response.payload, {
    issue: { number: 42, url: 'https://github.com/example/issues/42' },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer github-token');
  assert.equal(calls[0].body.title, '[User report] Calendar loses an entry');
  assert.match(calls[0].body.body, /@\u200bmaintainer/);
  assert.match(calls[0].body.body, /Rosewater version: 1\.1\.0/);
  assert.match(calls[0].body.body, /No hair care records, photos/);
});

test('rejects invalid reports before calling GitHub', async () => {
  let called = false;
  const handler = createReportHandler({
    fetchFn: async () => {
      called = true;
      throw new Error('should not be called');
    },
    env,
    now: () => 1_800_000_000_000,
    logger: silentLogger,
  });
  const response = responseMock();

  await handler(
    request({ title: 'No', description: 'Too short' }, { ip: '192.0.2.2' }),
    response
  );

  assert.equal(response.statusCode, 400);
  assert.equal(called, false);
});

test('limits repeated reports from the same client', async () => {
  const fetchFn = async () => ({
    ok: true,
    status: 201,
    json: async () => ({ number: 1, html_url: 'https://github.com/example/issues/1' }),
  });
  const handler = createReportHandler({
    fetchFn,
    env,
    now: () => 1_800_000_100_000,
    logger: silentLogger,
  });
  const body = { title: 'Valid issue', description: 'This report contains enough detail.' };

  for (let index = 0; index < 3; index += 1) {
    const response = responseMock();
    await handler(request(body, { ip: '192.0.2.3' }), response);
    assert.equal(response.statusCode, 201);
  }
  const blocked = responseMock();
  await handler(request(body, { ip: '192.0.2.3' }), blocked);
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
});

test('does not expose GitHub failures to the client', async () => {
  const handler = createReportHandler({
    fetchFn: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Bad credentials' }),
    }),
    env,
    now: () => 1_800_000_200_000,
    logger: silentLogger,
  });
  const response = responseMock();

  await handler(
    request(
      { title: 'Valid issue', description: 'This report contains enough detail.' },
      { ip: '192.0.2.4' }
    ),
    response
  );

  assert.equal(response.statusCode, 502);
  assert.deepEqual(response.payload, { error: 'GitHub could not create the issue.' });
});

test('fails safely when the GitHub token is missing', async () => {
  let called = false;
  const handler = createReportHandler({
    fetchFn: async () => {
      called = true;
      throw new Error('should not be called');
    },
    env: {},
    now: () => 1_800_000_300_000,
    logger: silentLogger,
  });
  const response = responseMock();

  await handler(
    request(
      { title: 'Valid issue', description: 'This report contains enough detail.' },
      { ip: '192.0.2.5' }
    ),
    response
  );

  assert.equal(response.statusCode, 502);
  assert.equal(called, false);
});
