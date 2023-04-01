import { DefineDatastore, Schema } from "deno-slack-sdk/mod.ts";
import { TALK_HISTORY_DATASTORE } from "../constants/slack.ts";

export const TalkHistoriesDatastore = DefineDatastore({
  name: TALK_HISTORY_DATASTORE,
  primary_key: "id",
  attributes: {
    id: { type: Schema.types.string },
    history: {
      type: Schema.types.array,
      items: {
        type: Schema.types.string,
      },
    },
  },
});
