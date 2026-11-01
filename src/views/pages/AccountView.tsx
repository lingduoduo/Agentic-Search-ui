import { Form } from "react-router";
import { isAdmin } from "../auth/session";
import { selectAccount } from "../../store/account";
import { useAppSelector } from "../../store";

export function AccountView() {
  const account = useAppSelector(selectAccount);
  return (
    <section className="panel account-details" aria-label="Account details">
      {account && (
        <dl>
          <dt>Email</dt>
          <dd>{account.user.email}</dd>
          <dt>Role</dt>
          <dd>{account.user.role}</dd>
          <dt>Access</dt>
          <dd>{isAdmin(account) ? "Workspaces and Admin panel" : "Workspaces"}</dd>
        </dl>
      )}
      <Form method="post" action="/logout">
        <button type="submit" className="icon-button">
          Sign out
        </button>
      </Form>
    </section>
  );
}
