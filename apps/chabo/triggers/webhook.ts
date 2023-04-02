import { Trigger } from "deno-slack-api/types.ts";
import TalkWorkflow from "../workflows/talk.ts";

const webhookTrigger: Trigger<typeof TalkWorkflow.definition> = {
  type: "webhook",
  name: "Trigger workflow with webhook",
  workflow: `#/workflows/${TalkWorkflow.definition.callback_id}`,
  inputs: {
    channel_id: {
      value: "{{data.channel_id}}",
    },
    user_id: {
      value: "{{data.user_id}}",
    },
    message_ts: {
      value: "{{data.message_ts}}",
    },
    user_prompt: {
      value: "{{data.user_prompt}}",
    },
    answer_prompt: {
      value: "{{data.answer_prompt}}",
    },
    is_finished: {
      value: "{{data.is_finished}}",
    },
  },
};

export default webhookTrigger;
