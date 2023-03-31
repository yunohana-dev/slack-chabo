import { green, red } from "https://deno.land/std@0.181.0/fmt/colors.ts";
import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  CHATGPT_API_URL,
  CHATGPT_MODEL,
  SYSTEM_PROMPT,
} from "../constants/chatGPT.ts";
import {
  ERROR_MESSAGE,
  MESSAGE_TRIGGER_CHAR,
  THINKING_MESSAGE,
} from "../constants/slack.ts";
import {
  FindTalkHistory,
  PostMessage,
  UpdateMessage,
  UpdateTalkHistory,
} from "../utils/slack.ts";
import {
  ChunkToResponseArray,
  ResponseArrayToContent,
} from "../utils/chatGpt.ts";

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
            ...history.slice(historyRetentionCount * -2),
            systemPrompt,
            userPrompt,
          ],
          stream: true,
        }),
      },
    );
    if (res.status != 200) {
      const body = await res.text();
      const reason =
        `Failed to call OpenAPI AI. status: ${res.status} body:${body}`;
      console.log(red(reason));
      await UpdateMessage(client, inputs.channel_id, reply.ts, ERROR_MESSAGE);
      return { error: reason };
    }

    let answer = "";
    const decoder = new TextDecoder();
    const reader = (res.body as ReadableStream).getReader();
    const stream = new ReadableStream({
      start(controller) {
        return (function pump(): void | PromiseLike<void> {
          return reader.read().then(
            ({ done, value }) => {
              if (done) {
                return controller.close();
              }
              const raw = decoder.decode(value);
              const res = ChunkToResponseArray(raw);
              if (res.length < 1) {
                controller.enqueue(value);
                return pump();
              }
              const content = ResponseArrayToContent(res);

              answer += content;
              if (content.match(MESSAGE_TRIGGER_CHAR)) {
                UpdateMessage(
                  client,
                  inputs.channel_id,
                  reply.ts,
                  answer,
                );
              }

              controller.enqueue(value);
              return pump();
            },
          );
        })();
      },
    });
    await new Response(stream).text();
    UpdateMessage(
      client,
      inputs.channel_id,
      reply.ts,
      answer,
    );

    const assistantPrompt = { role: "assistant", content: answer };
    console.log(green(`talk with OpenAI:
  user      : ${JSON.stringify(userPrompt)}
  assistant : ${JSON.stringify(assistantPrompt)}`));

    // データストアの会話履歴を更新
    const new_histories = [
      ...history,
      userPrompt,
      assistantPrompt,
    ];
    await UpdateTalkHistory(client, inputs.user_id, new_histories);
    return { outputs: {} };
  },
);
