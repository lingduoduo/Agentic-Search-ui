import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, it } from "vitest";
import account, { accountCleared, accountLoaded, profileUpdated, selectProfile } from "../account";

const makeStore = () => configureStore({ reducer: { account } });

const alice = {
  user: { id: "u1", email: "alice@example.test", role: "basic", is_active: true },
  permissions: [],
};

describe("account profile", () => {
  it("fills the profile from /me, updates it, and clears it", () => {
    const store = makeStore();
    expect(selectProfile(store.getState())).toEqual({ name: "", email: "", avatar: "" });

    store.dispatch(accountLoaded(alice));
    expect(selectProfile(store.getState())).toEqual({
      name: "alice",
      email: "alice@example.test",
      avatar: "",
    });

    store.dispatch(profileUpdated({ name: "Alice", avatar: "/alice.png" }));
    expect(selectProfile(store.getState())).toEqual({
      name: "Alice",
      email: "alice@example.test",
      avatar: "/alice.png",
    });

    store.dispatch(accountCleared());
    expect(selectProfile(store.getState())).toEqual({ name: "", email: "", avatar: "" });
  });
});
