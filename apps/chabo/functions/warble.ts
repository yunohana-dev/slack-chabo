import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  FindTalkHistory,
  UpdateMessage,
  UpdateTalkHistory,
} from "../utils/slack.ts";

export const warbleFunction = DefineFunction({
  callback_id: "warble_function",
  title: "Warble",
  description: "VoiceCordsの応答をslackへ流す.",
  source_file: "functions/warble.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.types.string,
      },
      user_id: {
        type: Schema.types.string,
      },
      message_ts: {
        type: Schema.types.string,
      },
      user_prompt: {
        type: Schema.types.object,
      },
      answer_prompt: {
        type: Schema.types.object,
      },
      is_finished: {
        type: Schema.types.boolean,
      },
    },
    required: [
      "channel_id",
      "user_id",
      "message_ts",
      "user_prompt",
      "answer_prompt",
      "is_finished",
    ],
  },
});

export default SlackFunction(
  warbleFunction,
  async ({ inputs, client }) => {
    await UpdateMessage(
      client,
      inputs.channel_id,
      `${inputs.message_ts}`,
      `${inputs.answer_prompt["content"]}${inputs.is_finished ? "✅" : ""}`,
    );
    if (!inputs.is_finished) {
      return { outputs: {} };
    }

    const history = await FindTalkHistory(client, inputs.user_id);
    history.push(inputs.user_prompt);
    history.push(inputs.answer_prompt);
    await UpdateTalkHistory(
      client,
      inputs.user_id,
      history,
    );
    // console.log("history count is now ", history.length);

    return { outputs: {} };
  },
);
