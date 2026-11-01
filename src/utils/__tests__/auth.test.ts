import { afterEach, describe, expect, it, vi } from "vitest";
import { clearCredential, isLogin } from "../auth";
import { accountCleared, loadAccount } from "../../store/account";
import { store } from "../../store";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => {
  vi.unstubAllGlobals();
  store.dispatch(accountCleared());
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
    await store.dispatch(loadAccount());
    expect(isLogin()).toBe(true);

    clearCredential();
    expect(isLogin()).toBe(false);
  });
});
