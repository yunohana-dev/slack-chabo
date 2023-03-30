export type OpenAIPrompt = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAIStreamResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
};

type OpenAIChoice = {
  delta: {
    role?: string;
    content?: string;
  };
  index: number;
  finish_reason?: string;
};

/**
 * Chunkの文字列をOpenAIのStreamResponse型の配列に変換する
 * Chunk内に複数のレスポンスを持つことがあるため配列型としている
 */
export const ChunkToResponseArray = (raw: string) => {
  const lines = raw.split(/\n?data:/g).map((s) => s.trim()).filter((s) => s);
  const result = [];
  for (const l of lines) {
    try {
      const stream = JSON.parse(l) as OpenAIStreamResponse;
      // console.log(JSON.stringify(stream));
      result.push(stream);
    } catch (e) {
      console.log(`"${l}" is not JSON format: `, e);
    }
  }
  return result;
};

/**
 * @return StreamResponseの配列に含まれるcontentを結合した文字列
 */
export const ResponseArrayToContent = (streams: OpenAIStreamResponse[]) => {
  let content = "";
  for (const s of streams) {
    const c = s.choices[0].delta.content;
    if (c) {
      content += `${c}`;
    }
  }
  return content;
};
