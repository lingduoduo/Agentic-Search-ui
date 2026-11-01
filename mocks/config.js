// Sample API fixtures used only by webpack-dev-server with --env mock.
// Restart the dev server after editing this file. Unlisted routes use the real backend.
// Each entry supports method, path, status, headers, delayMs, and response OR events.
const answer = 'This is a sample answer from the Webpack mock API.';
const document = {
  title: 'Mock search result',
  url: 'https://example.com/docs',
  content: 'Sample source content for local UI development.',
  score: 0.95,
  metadata: { source: 'mock' },
};
const session = { id: 'mock-session', messages: [], title: 'Mock session', user_id: null };
const chatEvents = [
  { type: 'answer', text: answer },
  { type: 'done', session_id: session.id },
];

export default [
  { method: 'GET', path: '/health', response: { status: 'ok', mock: true } },
  { method: 'GET', path: '/ready', response: { status: 'ready', mock: true } },
  {
    method: 'GET', path: '/api/search-domains',
    response: { domains: [{ name: 'web', description: 'Mock web search' }] },
  },
  {
    method: 'GET', path: '/admin/observability/summary',
    response: { health_label: 'Mock API', health_score: 100, metrics: [], sections: [] },
  },
  ...['llm', 'persona', 'flow'].map((dimension) => ({
    method: 'GET', path: `/analytics/by-${dimension}`,
    response: { dimension, items: [{ label: 'Mock', session_count: 3 }], total_sessions: 3 },
  })),
  { method: 'GET', path: '/admin/tools', response: [] },
  { method: 'POST', path: '/api/sessions', response: session },
  {
    method: 'POST', path: '/search/send-search-message', delayMs: 150,
    response: { all_executed_queries: ['mock query'], search_docs: [document], error: null },
  },
  {
    method: 'POST', path: '/chat/send-chat-message', delayMs: 100,
    events: chatEvents,
  },
  {
    method: 'POST', path: '/tool/send-tool-message', delayMs: 100,
    events: [chatEvents[0], { type: 'done', session_id: session.id, tool_calls: [], num_turns: 1 }],
  },
  {
    method: 'POST', path: '/api/agent/stream', delayMs: 100,
    events: [
      { type: 'answer', text: answer },
      {
        type: 'done', session_id: session.id, citations: ['[D1]'], intent: 'search',
        documents: [{ ...document, id: 'D1', citation: '[D1]' }], tool_calls: [],
      },
    ],
  },
  // Error example: curl -i http://127.0.0.1:5173/api/mock-error
  { method: 'GET', path: '/api/mock-error', status: 503, response: { detail: 'Sample service unavailable' } },
];
