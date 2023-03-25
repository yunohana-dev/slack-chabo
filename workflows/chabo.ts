import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { askGPTFunction } from "../functions/askGPT.ts";

const ChaboWorkflow = DefineWorkflow({
  callback_id: "chatgpt_workflow",
  title: "Chabo",
  description: "Chaboが応える",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
      },
      user_id: {
        type: Schema.slack.types.user_id,
      },
      message: {
        type: Schema.types.string,
      },
    },
    required: ["channel_id", "message"],
  },
});

ChaboWorkflow.addStep(
  Schema.slack.functions.SendEphemeralMessage,
  {
    channel_id: ChaboWorkflow.inputs.channel_id,
    user_id: ChaboWorkflow.inputs.user_id,
    message: "(考え中)",
  },
);

const askGPTStep = ChaboWorkflow.addStep(
  askGPTFunction,
  {
    user_id: ChaboWorkflow.inputs.user_id,
    message: ChaboWorkflow.inputs.message,
  },
);

ChaboWorkflow.addStep(Schema.slack.functions.SendMessage, {
  channel_id: ChaboWorkflow.inputs.channel_id,
  message: askGPTStep.outputs.answer,
});

export default ChaboWorkflow;
