import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  CHATGPT_API_URL,
  CHATGPT_MODEL,
  SYSTEM_PROMPT,
} from "../constants/chatGPT.ts";
import { FindTalkHistory, UpdateTalkHistory } from "../utils/slack.ts";

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
    required: ["user_id", "message"],
  },
  output_parameters: {
    properties: {
      answer: {
        type: Schema.types.string,
        description: "Answer from AI",
      },
      error: {
        type: Schema.types.string,
        description: "Error Type",
      },
    },
    required: [],
  },
});

export default SlackFunction(
  askGPTFunction,
  async ({ inputs, client, env }) => {
    if (inputs.is_aborted) return { outputs: { answer: "" } };

    // メッセージからメンションを削除
    const content = inputs.message.replaceAll(/\<\@.+?\>/g, " ").trim();
    const userPrompt = {
      role: "user",
      content,
    };

    // データストアから会話履歴を取得
    const history = await FindTalkHistory(client, inputs.user_id);

    // ChatGPTへリクエスト
    const res = await fetch(
      CHATGPT_API_URL,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: CHATGPT_MODEL,
          messages: [
            ...history,
            systemPrompt,
            userPrompt,
          ],
        }),
      },
    );

    if (res.status != 200) {
      const body = await res.text();
      const msg =
        `Failed to call OpenAPI AI. status: ${res.status} body:${body}`;
      console.log(msg);
      return { outputs: { error: msg } };
    }
    const body = await res.json();
    console.log("Success to call OpenAPI AI. response: ", userPrompt, body);

    if (!body.choices || body.choices.length < 1) {
      const msg = `No choices provided. response: ${JSON.stringify(body)}`;
      return { outputs: { error: msg } };
    }

    const answer = body.choices[0].message.content as string;
    // データストアの会話履歴を更新
    const new_histories = [
      ...history,
      userPrompt,
      { role: "assistant", content: answer },
    ];
    await UpdateTalkHistory(client, inputs.user_id, new_histories);
    return { outputs: { answer } };
  },
);
