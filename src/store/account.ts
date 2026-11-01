import { createSlice } from "@reduxjs/toolkit";
import type { Dispatch, PayloadAction } from "@reduxjs/toolkit";
import { getCurrentUser, getPermissions } from "../services/api";
import type { CurrentUser, Permission } from "../interfaces";

export type Account = { user: CurrentUser; permissions: Permission[] };

/** Shown for the signed-in user; kept in the frontend only, not saved to the backend. */
export type Profile = { name: string; email: string; avatar: string };

// Signed out until /me loads.
const initialState: { account: Account | null; profile: Profile } = {
  account: null,
  profile: { name: "", email: "", avatar: "" },
};

// /me has no name or avatar: the name starts as the email's local part.
const profileOf = (account: Account | null): Profile =>
  account
    ? { name: account.user.email.split("@")[0], email: account.user.email, avatar: "" }
    : initialState.profile;

const accountSlice = createSlice({
  name: "account",
  initialState,
  reducers: {
    accountLoaded(state, action: PayloadAction<Account>) {
      state.account = action.payload;
      state.profile = profileOf(action.payload);
    },
    profileUpdated(state, action: PayloadAction<Partial<Profile>>) {
      Object.assign(state.profile, action.payload);
    },
    /** Undoes profile edits, back to what /me gave. */
    profileReset(state) {
      state.profile = profileOf(state.account);
    },
    accountCleared: () => initialState,
  },
  selectors: {
    selectAccount: (state) => state.account,
    selectProfile: (state) => state.profile,
  },
});

export const { accountLoaded, profileUpdated, profileReset, accountCleared } = accountSlice.actions;
export const { selectAccount, selectProfile } = accountSlice.selectors;
export default accountSlice.reducer;

let pending: Promise<Account> | null = null;

/** Loads /me and /me/permissions; concurrent callers share one request. */
export const loadAccount = () => (dispatch: Dispatch) => {
  pending ??= Promise.all([getCurrentUser(), getPermissions()])
    .then(([user, permissions]) => {
      dispatch(accountLoaded({ user, permissions }));
      return { user, permissions };
    })
    .finally(() => {
      pending = null;
    });
  return pending;
};
