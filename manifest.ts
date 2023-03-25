import { Manifest } from "deno-slack-sdk/mod.ts";
import ChaboWorkflow from "./workflows/chabo.ts";
import { TalkHistoriesDatastore } from "./datastores/talkHistory.ts";

/**
 * The app manifest contains the app's configuration. This
 * file defines attributes like app name and description.
 * https://api.slack.com/future/manifest
 */
export default Manifest({
  name: "chabo",
  description: "話し相手になります",
  icon: "assets/chabo_icon.png",
  functions: [],
  workflows: [
    ChaboWorkflow,
  ],
  datastores: [
    TalkHistoriesDatastore,
  ],
  outgoingDomains: [
    "api.openai.com",
  ],
  botScopes: [
    "commands",
    "app_mentions:read",
    "chat:write",
    "chat:write.public",
    "channels:read",
    "datastore:read",
    "datastore:write",
  ],
});
