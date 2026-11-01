const assert = require('node:assert/strict');
const { test } = require('node:test');
const config = require('../webpack.config.cjs');

test('development proxies API calls while keeping page navigations local', () => {
  const dev = config({}, { mode: 'development' });
  const matches = dev.devServer.proxy[0].context;
  for (const path of ['/api/search-domains', '/auth/login', '/me', '/admin/tools', '/analytics/flow', '/health', '/ready', '/tool/invoke', '/chat/send', '/search/send', '/tools/discover']) {
    assert.equal(matches(path, { headers: { accept: 'application/json' } }), true, path);
  }
  for (const path of ['/assist', '/chat', '/search', '/tools', '/chat/session']) {
    assert.equal(matches(path, { headers: { accept: 'text/html' } }), false, path);
  }
  assert.equal(matches('/src/main.tsx', { headers: {} }), false);
  assert.equal(dev.devServer.static, false);
});

test('production emits assets into dist and has no development login middleware', () => {
  const prod = config({}, { mode: 'production' });
  assert.equal(prod.output.path.endsWith('/dist'), true);
  assert.equal(prod.output.publicPath, '/');
  assert.equal(prod.output.clean, true);
  assert.equal(prod.devServer, undefined);
  assert.equal(prod.devtool, false);
  assert.match(prod.output.filename, /contenthash/);
});

test('SCSS is compiled before CSS injection or extraction in both modes', () => {
  for (const mode of ['development', 'production']) {
    const rules = config({}, { mode }).module.rules;
    const scss = rules.find((rule) => rule.test.test('styles.scss'));
    assert.ok(scss, `${mode}: SCSS loader rule`);
    assert.deepEqual(scss.use.slice(-2), ['css-loader', 'sass-loader']);
    assert.equal(scss.use[0], mode === 'development' ? 'style-loader' : require('mini-css-extract-plugin').loader);
  }
});

test('a named environment loads its backend URL without changing development mode', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { execFileSync } = require('node:child_process');
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'search-ui-env-'));
  try {
    fs.writeFileSync(path.join(cwd, '.env.keepghost'), 'BACKEND_URL=http://keepghost.example:7860\n');
    const script = `const config = require(${JSON.stringify(require.resolve('../webpack.config.cjs'))})({ keepghost: true }, { mode: 'development' }); console.log(JSON.stringify({ mode: config.mode, target: config.devServer.proxy[0].target }));`;
    const env = { ...process.env };
    delete env.BACKEND_URL;
    const result = JSON.parse(execFileSync(process.execPath, ['-e', script], { cwd, env, encoding: 'utf8' }));
    assert.deepEqual(result, { mode: 'development', target: 'http://keepghost.example:7860' });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('mock flag works alongside named environments and is development-only', () => {
  const dev = config({ keepghost: true, mock: true }, { mode: 'development' });
  const middlewares = dev.devServer.setupMiddlewares([]);
  assert.equal(middlewares[0].name, 'mock-api');
  assert.equal(config({}, { mode: 'development' }).devServer.setupMiddlewares([]).some((m) => m.name === 'mock-api'), false);
  assert.equal(config({ mock: true }, { mode: 'production' }).devServer, undefined);
});

test('mock middleware returns JSON, errors and SSE, and passes unmatched requests through', async () => {
  const { createMockMiddleware } = await import('../mocks/middleware.js');
  const http = require('node:http');
  const mock = createMockMiddleware([
    { method: 'GET', path: '/api/example', response: { ok: true } },
    { method: 'GET', path: '/api/failure', status: 503, response: { detail: 'Sample failure' } },
    { method: 'POST', path: '/chat/example', events: [{ type: 'answer', text: 'Mock answer' }, { type: 'done', session_id: 'mock' }] },
  ]);
  const server = http.createServer((req, res) => mock(req, res, () => { res.statusCode = 418; res.end('fallback'); }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.deepEqual(await (await fetch(`${base}/api/example?query=ignored`)).json(), { ok: true });
    assert.equal((await fetch(`${base}/api/example`, { method: 'POST' })).status, 418);
    assert.equal((await fetch(`${base}/search`, { headers: { Accept: 'text/html' } })).status, 418);
    const failure = await fetch(`${base}/api/failure`);
    assert.equal(failure.status, 503);
    assert.deepEqual(await failure.json(), { detail: 'Sample failure' });
    const stream = await fetch(`${base}/chat/example`, { method: 'POST' });
    assert.match(stream.headers.get('content-type'), /text\/event-stream/);
    assert.match(await stream.text(), /data: {"type":"answer","text":"Mock answer"}\n\ndata: {"type":"done"/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('sample history mocks serve audit, pagination and feedback filters without a backend', async () => {
  const { default: routes } = await import('../mocks/config.js');
  const { createMockMiddleware } = await import('../mocks/middleware.js');
  const http = require('node:http');
  const mock = createMockMiddleware(routes);
  const server = http.createServer((req, res) => mock(req, res, () => { res.statusCode = 502; res.end('unexpected backend request'); }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (path) => {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('x-mock-api'), 'true');
    return response.json();
  };
  try {
    const page = await get('/admin/chat-session-history?page_num=0&page_size=20');
    assert.ok(page.items.length > 1);
    assert.equal(page.total_items, page.items.length);
    const audit = await get('/admin/query-history/audit');
    assert.equal(audit.total_sessions, page.total_items);
    assert.equal(audit.total_messages, page.items.reduce((total, item) => total + item.conversation_length, 0));
    assert.ok(Array.isArray(audit.top_disliked_queries));
    const first = await get('/admin/chat-session-history?page_num=0&page_size=1');
    const second = await get('/admin/chat-session-history?page_num=1&page_size=1');
    assert.equal(first.items.length, 1);
    assert.notEqual(first.items[0].id, second.items[0].id);
    for (const feedback of ['like', 'dislike']) {
      const filtered = await get(`/admin/chat-session-history?page_num=0&page_size=20&feedback_type=${feedback}`);
      assert.ok(filtered.items.length > 0);
      assert.ok(filtered.items.every((item) => item.feedback_type === feedback));
    }
    const empty = await get('/admin/chat-session-history?page_num=999&page_size=20');
    assert.deepEqual(empty.items, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
