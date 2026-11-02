import { useEffect, useState } from "react";
import { getRetrievalStatus } from "../services/api";
import type { RetrievalStatusView } from "../interfaces";

/** Which retrieval server answers queries, and whether it is up. Hidden when unknown. */
export function RetrievalStatus() {
  const [status, setStatus] = useState<RetrievalStatusView | null>(null);

  useEffect(() => {
    let alive = true;
    getRetrievalStatus().then(
      (r) => {
        if (alive) setStatus(r);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, []);

  if (!status) return null;
  const host = status.url.replace(/^\w+:\/\//, "");
  return (
    <span
      className={`route-pill${status.ok ? "" : " route-pill--degraded"}`}
      title={status.embedded ? `Served in-process at ${status.url}` : status.url}
    >
      retrieval · {status.embedded ? "embedded" : host} · {status.ok ? "up" : "down"}
    </span>
  );
}
