import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { SYSTEM_PROMPT } from "../constants/chatGPT.ts";
import { THINKING_MESSAGE } from "../constants/slack.ts";
import { FindTalkHistory, PostMessage } from "../utils/slack.ts";
import { green } from "https://deno.land/std@0.181.0/fmt/colors.ts";

const systemPrompt = {
  role: "system",
  content: SYSTEM_PROMPT,
};

export const askGPTFunction = DefineFunction({
  callback_id: "askgpt_function",
  title: "Ask ChatGPT",
  description: "Ask questions to ChatGPT.",
  source_file: "functions/askGPT.ts",
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
        description: "Question to AI",
      },
      is_aborted: {
        type: Schema.types.boolean,
        description: "Aborted Workflow",
        default: false,
      },
    },
    required: ["channel_id", "user_id", "message"],
  },
});

export default SlackFunction(
  askGPTFunction,
  async ({ inputs, client, env }) => {
    if (inputs.is_aborted) return { outputs: {} };

    // 受理を送信
    const reply = await PostMessage(
      client,
      inputs.channel_id,
      THINKING_MESSAGE,
    );

    // ユーザプロンプトの生成
    const content = inputs.message.replaceAll(/\<\@.+?\>/g, " ").trim(); // メンションの削除
    const userPrompt = {
      role: "user",
      content,
    };

    // データストアから会話履歴を取得
    const history = await FindTalkHistory(client, inputs.user_id);
    const historyRetentionCount = parseInt(env.CHABO_HISTORY_RETENTION_COUNT) ||
      0;

    // 声帯へリクエスト
    const req = {
      callback: env.CALLBACK_URI,
      channel_id: inputs.channel_id,
      user_id: inputs.user_id,
      message_ts: reply.ts,
      openai_api_key: env.OPENAI_API_KEY,
      prompt: [
        ...history.slice(historyRetentionCount * -2),
        systemPrompt,
        userPrompt,
      ],
    };
    fetch(
      env.VOCAL_CORDS_URI,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req),
      },
    );
    console.log(green("request to VocalCords."));
    await sleep();
    return { outputs: {} };
  },
);

const sleep = () => {
  return new Promise((r) => setTimeout(r, 3000));
};
