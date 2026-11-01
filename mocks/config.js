// Sample API fixtures used only by webpack-dev-server with --env mock.
// Restart the dev server after editing this file. Unlisted routes use the real backend.
// Each entry supports method, path, status, headers, delayMs, and response OR events;
// status and response may be functions of the request.
const answer = "This is a sample answer from the Webpack mock API.";
const document = {
  title: "Mock search result",
  url: "https://example.com/docs",
  content: "Sample source content for local UI development.",
  score: 0.95,
  metadata: { source: "mock" },
};
const mockUser = { id: "mock-user", email: "admin@example.test", role: "admin", is_active: true };
const session = { id: "mock-session", messages: [], title: "Mock session", user_id: null };
const chatEvents = [
  { type: "answer", text: answer },
  { type: "done", session_id: session.id },
];

const history = [
  { id: "mock-history-1", first_user_message: "Find the deployment guide", feedback_type: "like" },
  {
    id: "mock-history-2",
    first_user_message: "Explain retrieval ranking",
    feedback_type: "dislike",
  },
  { id: "mock-history-3", first_user_message: "List available tools", feedback_type: null },
].map((item) => ({
  ...item,
  user_id: "mock-user",
  name: "Mock conversation",
  first_ai_message: answer,
  time_created: "2026-10-31T12:00:00Z",
  flow_type: "chat",
  conversation_length: 2,
  llm_name: "mock-model",
}));
const feedbackCount = history.filter((item) => item.feedback_type !== null).length;
const disliked = history.filter((item) => item.feedback_type === "dislike");

// Mock mode starts signed in as an admin so every page is reachable. Signing
// out lasts until the next sign-in (any credentials work), as with the backend.
let signedIn = true;
const unauthorized = { detail: "Unauthorized" };

export default [
  {
    method: "GET",
    path: "/me",
    status: () => (signedIn ? 200 : 401),
    response: () => (signedIn ? mockUser : unauthorized),
  },
  {
    method: "GET",
    path: "/me/permissions",
    status: () => (signedIn ? 200 : 401),
    response: () => (signedIn ? ["basic_access", "full_admin_panel_access"] : unauthorized),
  },
  {
    method: "POST",
    path: "/auth/login",
    response: () => {
      signedIn = true;
      return mockUser;
    },
  },
  {
    method: "POST",
    path: "/auth/logout",
    status: 204,
    response: () => {
      signedIn = false;
    },
  },
  { method: "GET", path: "/health", response: { status: "ok", mock: true } },
  { method: "GET", path: "/ready", response: { status: "ready", mock: true } },
  {
    method: "GET",
    path: "/api/search-domains",
    response: { domains: [{ name: "web", description: "Mock web search" }] },
  },
  {
    method: "GET",
    path: "/admin/observability/summary",
    response: { health_label: "Mock API", health_score: 100, metrics: [], sections: [] },
  },
  ...["llm", "persona", "flow"].map((dimension) => ({
    method: "GET",
    path: `/analytics/by-${dimension}`,
    response: { dimension, items: [{ label: "Mock", session_count: 3 }], total_sessions: 3 },
  })),
  {
    method: "GET",
    path: "/admin/query-history/audit",
    response: {
      total_sessions: history.length,
      total_messages: history.reduce((total, item) => total + item.conversation_length, 0),
      sessions_with_feedback: feedbackCount,
      sessions_with_dislike: disliked.length,
      dislike_rate: feedbackCount ? disliked.length / feedbackCount : 0,
      top_disliked_queries: disliked.map((item) => item.first_user_message),
    },
  },
  {
    method: "GET",
    path: "/admin/chat-session-history",
    response(req) {
      const params = new URL(req.url, "http://localhost").searchParams;
      const feedback = params.get("feedback_type");
      const filtered = feedback
        ? history.filter((item) => item.feedback_type === feedback)
        : history;
      const page = Number(params.get("page_num") ?? 0);
      const size = Number(params.get("page_size") ?? 20);
      const pageNum = Number.isInteger(page) && page >= 0 ? page : 0;
      const pageSize = Number.isInteger(size) && size > 0 ? size : 20;
      const start = pageNum * pageSize;
      return { items: filtered.slice(start, start + pageSize), total_items: filtered.length };
    },
  },
  { method: "GET", path: "/admin/tools", response: [] },
  { method: "POST", path: "/api/sessions", response: session },
  {
    method: "POST",
    path: "/search/send-search-message",
    delayMs: 150,
    response: { all_executed_queries: ["mock query"], search_docs: [document], error: null },
  },
  {
    method: "POST",
    path: "/chat/send-chat-message",
    delayMs: 100,
    events: chatEvents,
  },
  {
    method: "POST",
    path: "/tool/send-tool-message",
    delayMs: 100,
    events: [chatEvents[0], { type: "done", session_id: session.id, tool_calls: [], num_turns: 1 }],
  },
  {
    method: "POST",
    path: "/api/agent/stream",
    delayMs: 100,
    events: [
      { type: "answer", text: answer },
      {
        type: "done",
        session_id: session.id,
        citations: ["[D1]"],
        intent: "search",
        documents: [{ ...document, id: "D1", citation: "[D1]" }],
        tool_calls: [],
      },
    ],
  },
  // Error example: curl -i http://127.0.0.1:5173/api/mock-error
  {
    method: "GET",
    path: "/api/mock-error",
    status: 503,
    response: { detail: "Sample service unavailable" },
  },
];
