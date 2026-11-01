import { useLoaderData } from "react-router";
import { AdminOverview } from "../../components/AdminOverview";
import { AnalyticsDashboard } from "../../components/AnalyticsDashboard";
import type { AdminData } from "../auth/session";

/** Admin-only: adminLoader has checked the permission before this mounts. */
export function AdminView() {
  const { summary, byLLM, byPersona, byFlow } = useLoaderData() as AdminData;
  if (!summary && !byLLM && !byPersona && !byFlow) {
    return <p className="empty-state">Admin data is unavailable.</p>;
  }
  return (
    <>
      {summary && <AdminOverview summary={summary} />}
      {(byLLM || byPersona || byFlow) && (
        <AnalyticsDashboard byLLM={byLLM} byPersona={byPersona} byFlow={byFlow} />
      )}
    </>
  );
}
