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
