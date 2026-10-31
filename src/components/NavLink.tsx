import { useCallback } from "react";
import type { MouseEvent, ReactNode } from "react";
import type { Route } from "../config/routes";
import { useRoute } from "../hooks/useRoute";
import { navigate } from "../routes/navigation";

export function NavLink({
  to,
  className,
  children,
}: {
  to: Route;
  className?: string;
  children: ReactNode;
}) {
  const active = useRoute() === to;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      // Anything but a plain left click means the user asked the browser for
      // something we cannot do: a new tab, a new window, a download.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(to);
    },
    [to],
  );

  return (
    <a
      href={to}
      className={`${className ?? ""}${active ? " active" : ""}`.trim()}
      aria-current={active ? "page" : undefined}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
