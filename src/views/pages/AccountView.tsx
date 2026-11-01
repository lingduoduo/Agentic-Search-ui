import { Form, Link } from "react-router";
import { isAdmin } from "../auth/session";
import { routePath } from "../../config/routes";
import { profileReset, profileUpdated, selectAccount, selectProfile } from "../../store/account";
import { useAppDispatch, useAppSelector } from "../../store";

export function AccountView() {
  const account = useAppSelector(selectAccount);
  const profile = useAppSelector(selectProfile);
  const dispatch = useAppDispatch();
  return (
    <section className="panel account-details" aria-label="Account details">
      {account && (
        <dl>
          <dt>Name</dt>
          <dd>{profile.name}</dd>
          <dt>Email</dt>
          <dd>{profile.email}</dd>
          <dt>Role</dt>
          <dd>{account.user.role}</dd>
          <dt>Access</dt>
          <dd>{isAdmin(account) ? "Workspaces and Admin panel" : "Workspaces"}</dd>
        </dl>
      )}
      <form
        className="account-details__name"
        onSubmit={(event) => {
          event.preventDefault();
          const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
          if (name) dispatch(profileUpdated({ name }));
          event.currentTarget.reset();
        }}
      >
        <input name="name" aria-label="New name" placeholder="New name" maxLength={80} />
        <button type="submit" className="icon-button">
          Update name
        </button>
        <button type="button" className="icon-button" onClick={() => dispatch(profileReset())}>
          Reset
        </button>
        <Link to={routePath("space-apps-list")}>Go to apps</Link>
      </form>
      <Form method="post" action="/logout">
        <button type="submit" className="icon-button">
          Sign out
        </button>
      </Form>
    </section>
  );
}
