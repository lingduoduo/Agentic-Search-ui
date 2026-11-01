import { createSlice } from "@reduxjs/toolkit";
import type { Dispatch, PayloadAction } from "@reduxjs/toolkit";
import { getCurrentUser, getPermissions } from "../services/api";
import type { CurrentUser, Permission } from "../interfaces";

export type Account = { user: CurrentUser; permissions: Permission[] };

const accountSlice = createSlice({
  name: "account",
  initialState: { account: null as Account | null },
  reducers: {
    accountLoaded(state, action: PayloadAction<Account>) {
      state.account = action.payload;
    },
    accountCleared(state) {
      state.account = null;
    },
  },
  selectors: {
    selectAccount: (state) => state.account,
  },
});

export const { accountLoaded, accountCleared } = accountSlice.actions;
export const { selectAccount } = accountSlice.selectors;
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
