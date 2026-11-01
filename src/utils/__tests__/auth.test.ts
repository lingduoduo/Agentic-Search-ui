import { afterEach, describe, expect, it, vi } from "vitest";
import { clearCredential, isLogin } from "../auth";
import { clearAccount, loadAccount } from "../../store/account";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => {
  vi.unstubAllGlobals();
  clearAccount();
});

describe("auth", () => {
  it("is signed in once the account loads, and signed out after clearCredential", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) =>
        input.endsWith("/permissions")
          ? json([])
          : json({ id: "u1", email: "a@example.test", role: "basic", is_active: true }),
      ),
    );
    expect(isLogin()).toBe(false);
    await loadAccount();
    expect(isLogin()).toBe(true);

    clearCredential();
    expect(isLogin()).toBe(false);
  });
});
