import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { warbleFunction } from "../functions/warble.ts";

const TalkWorkflow = DefineWorkflow({
  callback_id: "talk_workflow",
  title: "Talk",
  description: "Chaboが応える",
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

TalkWorkflow.addStep(
  warbleFunction,
  {
    channel_id: TalkWorkflow.inputs.channel_id,
    user_id: TalkWorkflow.inputs.user_id,
    message_ts: TalkWorkflow.inputs.message_ts,
    user_prompt: TalkWorkflow.inputs.user_prompt,
    answer_prompt: TalkWorkflow.inputs.answer_prompt,
    is_finished: TalkWorkflow.inputs.is_finished,
  },
);

export default TalkWorkflow;
