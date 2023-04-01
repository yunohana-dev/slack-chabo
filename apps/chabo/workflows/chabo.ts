import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { askGPTFunction } from "../functions/askGPT.ts";
import { commandFunction } from "../functions/command.ts";

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
    required: ["channel_id", "user_id", "message"],
  },
});

const commandStep = ChaboWorkflow.addStep(
  commandFunction,
  {
    channel_id: ChaboWorkflow.inputs.channel_id,
    user_id: ChaboWorkflow.inputs.user_id,
    message: ChaboWorkflow.inputs.message,
  },
);

ChaboWorkflow.addStep(
  askGPTFunction,
  {
    channel_id: ChaboWorkflow.inputs.channel_id,
    user_id: ChaboWorkflow.inputs.user_id,
    message: ChaboWorkflow.inputs.message,
    is_aborted: commandStep.outputs.is_aborted,
  },
);

export default ChaboWorkflow;
