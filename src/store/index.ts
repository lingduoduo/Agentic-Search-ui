import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { SESSION_CLEARED_EVENT } from "../config/session";
import account, { accountCleared } from "./account";

export const store = configureStore({ reducer: { account } });

export type RootState = ReturnType<typeof store.getState>;

export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppDispatch = useDispatch.withTypes<typeof store.dispatch>();

// The cookie no longer works, so neither does the account loaded with it.
window.addEventListener(SESSION_CLEARED_EVENT, () => store.dispatch(accountCleared()));
