import { SESSION_CLEARED_EVENT } from "../config/session";
import { selectAccount } from "../store/account";
import { store } from "../store";

// The credential is the backend's HttpOnly session cookie: the browser sends it
// and JavaScript never sees it. The account loaded with it stands in for it.

/** True once this page load has confirmed the session cookie with /me. */
export const isLogin = () => selectAccount(store.getState()) !== null;

/**
 * The cookie no longer works: the account store forgets the user and a
 * signed-in page sends them to sign in (both listen for the event).
 */
export const clearCredential = () => window.dispatchEvent(new Event(SESSION_CLEARED_EVENT));
