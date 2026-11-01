import { Link } from "react-router";
import { isAdmin } from "../auth/session";
import type { Route } from "../config/routes";
import { useAccount } from "../store/account";

const workspaces: { to: Route; title: string; description: string }[] = [
  {
    to: "/assist",
    title: "Assistant",
    description: "Ask a question, search your sources, and follow the answer trail.",
  },
  {
    to: "/search",
    title: "Search",
    description: "Find relevant documents and explore the sources behind each result.",
  },
  { to: "/chat", title: "Chat", description: "Start a conversation with your model." },
  {
    to: "/tools",
    title: "Tools",
    description: "Ask the tool agent to complete a task and inspect its results.",
  },
];

/** The landing page after sign-in. */
export function HomePage() {
  const account = useAccount();
  const cards = isAdmin(account)
    ? [
        ...workspaces,
        {
          to: "/admin" as const,
          title: "Admin",
          description: "Operational health and usage analytics across the deployment.",
        },
      ]
    : workspaces;
  return (
    <section className="home-page" aria-label="Home">
      {account && <p className="home-page__greeting">Signed in as {account.user.email}</p>}
      <ul className="home-page__cards">
        {cards.map((card) => (
          <li key={card.to}>
            <Link to={card.to} className="home-card">
              <strong>{card.title}</strong>
              <span>{card.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
