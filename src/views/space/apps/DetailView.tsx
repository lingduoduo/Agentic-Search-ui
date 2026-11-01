import { useParams } from "react-router";
import type { AppId } from "../../../config/routes";
import { AssistView } from "./AssistView";
import { ChatView } from "./ChatView";
import { SearchView } from "./SearchView";
import { ToolAgentView } from "./ToolAgentView";

const views: Record<AppId, () => React.JSX.Element> = {
  assist: AssistView,
  search: SearchView,
  chat: ChatView,
  tools: ToolAgentView,
};

/** One app, `/space/apps/:app_id`; the route's loader has checked the id. */
export function DetailView() {
  const appId = useParams().app_id as AppId;
  const View = views[appId];
  // A fresh app on every switch, as separate pages had.
  return <View key={appId} />;
}
