import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { PostMessage } from "../utils/slack.ts";

const serverErrorMessage = "ちょっと今調子悪いみたい";

export const answerFunction = DefineFunction({
  callback_id: "answer_function",
  title: "Answer",
  description: "Answer to Slack.",
  source_file: "functions/answer.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Channel ID",
      },
      answer: {
        type: Schema.types.string,
        description: "Answer from AI",
      },
      error: {
        type: Schema.types.string,
        description: "iDetected Error",
      },
      is_aborted: {
        type: Schema.types.boolean,
        description: "Aborted Workflow",
        default: false,
      },
    },
    required: ["channel_id"],
  },
});

export default SlackFunction(
  answerFunction,
  async ({ inputs, client }) => {
    if (inputs.is_aborted) return { outputs: {} };

    if (!!inputs.error || !inputs.answer) {
      await PostMessage(client, inputs.channel_id, serverErrorMessage);
      return { outputs: {} };
    }
    await PostMessage(client, inputs.channel_id, inputs.answer);
    return { outputs: {} };
  },
);
