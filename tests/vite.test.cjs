const assert = require("node:assert/strict");
const { test } = require("node:test");
const path = require("node:path");

test("Vite keeps SPA navigations local, proxies APIs, and serves mock JSON and SSE", async () => {
  const { createServer } = await import("vite");
  const http = require("node:http");
  const backend = http.createServer((req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ backend: req.url }));
  });
  await new Promise((resolve) => backend.listen(0, "127.0.0.1", resolve));
  const previous = process.env.BACKEND_URL;
  process.env.BACKEND_URL = `http://127.0.0.1:${backend.address().port}`;
  let server;
  try {
    server = await createServer({
      configFile: path.resolve("vite.config.js"),
      server: { port: 0 },
      logLevel: "error",
    });
    await server.listen();
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    for (const route of [
      "/chat",
      "/chat/session",
      "/search",
      "/tools",
      "/admin",
      "/auth/login",
      "/space/apps",
    ]) {
      const response = await fetch(base + route, { headers: { Accept: "text/html" } });
      assert.match(await response.text(), /src=.{0,2}\/src\/main.tsx/, route);
    }
    for (const route of [
      "/api/example",
      "/api-tools?current_page=2&search_word=maps",
      "/api-tools/maps",
      "/admin/tools",
      "/auth/register",
      "/health",
      "/ready",
      "/tool/invoke",
    ]) {
      assert.deepEqual(await (await fetch(base + route)).json(), { backend: route });
    }
    assert.deepEqual(await (await fetch(base + "/auth/login", { method: "POST" })).json(), {
      backend: "/auth/login",
    });
    assert.match(await (await fetch(base + "/dev-login.html")).text(), /<html/);
    await server.close();
    server = await createServer({
      configFile: path.resolve("vite.config.js"),
      mode: "mock",
      server: { port: 0 },
      logLevel: "error",
    });
    await server.listen();
    const mockBase = `http://127.0.0.1:${server.httpServer.address().port}`;
    const me = await fetch(mockBase + "/me");
    assert.equal(me.headers.get("x-mock-api"), "true");
    assert.equal(me.status, 200);
    assert.match(
      await (await fetch(mockBase + "/chat", { headers: { Accept: "text/html" } })).text(),
      /src\/main.tsx/,
    );
  } finally {
    await server?.close();
    await new Promise((resolve) => backend.close(resolve));
    if (previous === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = previous;
  }
});

test("VITE_API_BASE_URL must be a bare backend origin", async () => {
  const { default: config } = await import("../vite.config.js");
  const withBase = (value) => {
    const previous = process.env.VITE_API_BASE_URL;
    process.env.VITE_API_BASE_URL = value;
    try {
      return config({ mode: "development", command: "serve" });
    } finally {
      if (previous === undefined) delete process.env.VITE_API_BASE_URL;
      else process.env.VITE_API_BASE_URL = previous;
    }
  };
  for (const value of ["", "http://127.0.0.1:7860", "https://api.example.com/"]) {
    assert.doesNotThrow(() => withBase(value), value);
  }
  for (const value of ["/api", "127.0.0.1:7860", "http://127.0.0.1:7860/api"]) {
    assert.throws(() => withBase(value), /must be an origin/, value);
  }
});

test("mock middleware returns JSON, errors and SSE, and passes unmatched requests through", async () => {
  const { createMockMiddleware } = await import("../mocks/middleware.js");
  const http = require("node:http");
  const mock = createMockMiddleware([
    { method: "GET", path: "/api/example", response: { ok: true } },
    { method: "GET", path: "/api/failure", status: 503, response: { detail: "Sample failure" } },
    {
      method: "POST",
      path: "/chat/example",
      events: [
        { type: "answer", text: "Mock answer" },
        { type: "done", session_id: "mock" },
      ],
    },
  ]);
  const server = http.createServer((req, res) =>
    mock(req, res, () => {
      res.statusCode = 418;
      res.end("fallback");
    }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.deepEqual(await (await fetch(`${base}/api/example?query=ignored`)).json(), { ok: true });
    assert.equal((await fetch(`${base}/api/example`, { method: "POST" })).status, 418);
    assert.equal((await fetch(`${base}/search`, { headers: { Accept: "text/html" } })).status, 418);
    const failure = await fetch(`${base}/api/failure`);
    assert.equal(failure.status, 503);
    assert.deepEqual(await failure.json(), { detail: "Sample failure" });
    const stream = await fetch(`${base}/chat/example`, { method: "POST" });
    assert.match(stream.headers.get("content-type"), /text\/event-stream/);
    assert.match(
      await stream.text(),
      /data: {"type":"answer","text":"Mock answer"}\n\ndata: {"type":"done"/,
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("sample history mocks serve audit, pagination and feedback filters without a backend", async () => {
  const { default: routes } = await import("../mocks/config.js");
  const { createMockMiddleware } = await import("../mocks/middleware.js");
  const http = require("node:http");
  const mock = createMockMiddleware(routes);
  const server = http.createServer((req, res) =>
    mock(req, res, () => {
      res.statusCode = 502;
      res.end("unexpected backend request");
    }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const get = async (path) => {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get("x-mock-api"), "true");
    return response.json();
  };
  try {
    const page = await get("/admin/chat-session-history?page_num=0&page_size=20");
    assert.ok(page.items.length > 1);
    assert.equal(page.total_items, page.items.length);
    const audit = await get("/admin/query-history/audit");
    assert.equal(audit.total_sessions, page.total_items);
    assert.equal(
      audit.total_messages,
      page.items.reduce((total, item) => total + item.conversation_length, 0),
    );
    assert.ok(Array.isArray(audit.top_disliked_queries));
    const first = await get("/admin/chat-session-history?page_num=0&page_size=1");
    const second = await get("/admin/chat-session-history?page_num=1&page_size=1");
    assert.equal(first.items.length, 1);
    assert.notEqual(first.items[0].id, second.items[0].id);
    for (const feedback of ["like", "dislike"]) {
      const filtered = await get(
        `/admin/chat-session-history?page_num=0&page_size=20&feedback_type=${feedback}`,
      );
      assert.ok(filtered.items.length > 0);
      assert.ok(filtered.items.every((item) => item.feedback_type === feedback));
    }
    const empty = await get("/admin/chat-session-history?page_num=999&page_size=20");
    assert.deepEqual(empty.items, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Tailwind generates a utility used by the app without introducing Preflight", async () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const postcss = require("postcss");
  const { default: settings } = await import("../postcss.config.mjs");
  const plugins = Object.entries(settings.plugins).map(([name, options]) => require(name)(options));
  const stylesheet = path.resolve(__dirname, "../src/assets/styles/tailwind.css");
  const result = await postcss(plugins).process(fs.readFileSync(stylesheet, "utf8"), {
    from: stylesheet,
  });
  assert.match(result.css, /\.min-w-0\s*\{\s*min-width:\s*0/);
  assert.doesNotMatch(result.css, /box-sizing:\s*border-box/);
  assert.doesNotMatch(result.css, /@import\s+["']tailwindcss/);
});

test("mock session signs out until the next sign-in", async () => {
  const { default: routes } = await import("../mocks/config.js");
  const { createMockMiddleware } = await import("../mocks/middleware.js");
  const http = require("node:http");
  const mock = createMockMiddleware(routes);
  const server = http.createServer((req, res) =>
    mock(req, res, () => {
      res.statusCode = 502;
      res.end("unexpected backend request");
    }),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const status = async (method, path) => (await fetch(base + path, { method })).status;
  try {
    assert.equal(await status("GET", "/me"), 200);
    assert.equal(await status("POST", "/auth/logout"), 204);
    assert.equal(await status("GET", "/me"), 401);
    assert.equal(await status("GET", "/me/permissions"), 401);
    assert.equal(await status("POST", "/auth/login"), 200);
    assert.equal(await status("GET", "/me"), 200);
  } finally {
    server.close();
  }
});

test("named environments load backend settings without exposing them to the browser", async () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const { default: config } = await import("../vite.config.js");
  const cwd = process.cwd();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "vite-profile-"));
  const previous = process.env.BACKEND_URL;
  try {
    fs.writeFileSync(
      path.join(directory, ".env.keepghost"),
      "BACKEND_URL=http://keepghost.example:7860\nMOCK_API=true\n",
    );
    delete process.env.BACKEND_URL;
    process.chdir(directory);
    const settings = config({ mode: "keepghost", command: "serve" });
    assert.equal(Object.values(settings.server.proxy)[0].target, "http://keepghost.example:7860");
    assert.deepEqual(settings.envPrefix, ["VITE_DEBUG_PANELS", "VITE_API_BASE_URL"]);
    assert.deepEqual(settings.preview.proxy, {});
  } finally {
    process.chdir(cwd);
    if (previous === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = previous;
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
