import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  DeleteTalkHistory,
  FindTalkHistory,
  PostMessage,
} from "../utils/slack.ts";

const msg_help = `\`\`\`
- /show_history: これまでの会話履歴を表示する
- /clear_history: これまでの会話履歴を忘れる
\`\`\``;
const msg_show_history = (history: unknown) => {
  return `\`\`\`
${JSON.stringify(history, null, 2)}
\`\`\``;
};
const msg_delete_history = "あれ、なんの話をしていましたっけ？";
const msg_default = `\`/\` から始めるときはコマンドを入力してください
コマンドは \`/help\` で確認できます`;

export const commandFunction = DefineFunction({
  callback_id: "command_function",
  title: "Command",
  description: "commandset.",
  source_file: "functions/command.ts",
  input_parameters: {
    properties: {
      channel_id: {
        type: Schema.slack.types.channel_id,
        description: "Channel ID",
      },
      user_id: {
        type: Schema.slack.types.user_id,
        description: "User ID",
      },
      message: {
        type: Schema.types.string,
        description: "Mentioned Message",
      },
    },
    required: ["channel_id", "user_id", "message"],
  },
  output_parameters: {
    properties: {
      is_aborted: {
        type: Schema.types.boolean,
        description: "Aborts Workflow",
      },
    },
    required: [],
  },
});

/**
 * コマンド('/'から始まるメンション)に対応するFunction
 */
export default SlackFunction(
  commandFunction,
  async ({ inputs, client }) => {
    // メッセージからメンションを削除
    const content = inputs.message.replaceAll(/\<\@.+?\>/g, " ").trim();
    if (!content.startsWith("/")) return { outputs: {} };

    console.log("accepted command: ", content);
    // コマンド分岐
    switch (content) {
      case "/help":
        await PostMessage(client, inputs.channel_id, msg_help);
        break;
      case "/show_history": {
        const history = await FindTalkHistory(client, inputs.user_id);
        await PostMessage(
          client,
          inputs.channel_id,
          msg_show_history(history),
        );
        break;
      }
      case "/clear_history":
        await DeleteTalkHistory(client, inputs.user_id);
        await PostMessage(
          client,
          inputs.channel_id,
          msg_delete_history,
        );
        break;
      default:
        await PostMessage(
          client,
          inputs.channel_id,
          msg_default,
        );
    }
    return { outputs: { is_aborted: true } };
  },
);