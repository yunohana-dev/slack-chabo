import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import {
  CHATGPT_API_URL,
  CHATGPT_MODEL,
  SYSTEM_PROMPT,
} from "../constants/chatGPT.ts";

const systemPrompt = {
  role: "system",
  content: SYSTEM_PROMPT,
};
const serverErrorMessage = "ちょっと今調子悪いみたい";

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
    },
    required: ["user_id", "message"],
  },
  output_parameters: {
    properties: {
      answer: {
        type: Schema.types.string,
        description: "Answer from AI",
      },
    },
    required: ["answer"],
  },
});

export default SlackFunction(
  askGPTFunction,
  async ({ inputs, env }) => {
    // メッセージからメンションを削除
    const content = inputs.message.replaceAll(/\<\@.+?\>/g, " ");
    const userPrompt = {
      role: "user",
      content,
    };

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
            systemPrompt,
            userPrompt,
          ],
        }),
      },
    );
    if (res.status != 200) {
      const body = await res.text();
      console.log(
        `Failed to call OpenAPI AI. status:${res.status} body:${body}`,
      );
      return {
        outputs: { answer: serverErrorMessage },
      };
    }
    const body = await res.json();
    console.log("chatgpt api response", userPrompt, body);
    if (body.choices && body.choices.length >= 0) {
      const answer = body.choices[0].message.content as string;
      return { outputs: { answer } };
    }
    return {
      error: `No choices provided. body:${JSON.stringify(body)}`,
    };
  },
);