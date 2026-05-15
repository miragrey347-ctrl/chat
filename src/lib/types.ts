export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  createdAt: Date;
}

export interface ChatRequest {
  messages: { role: string; content: string }[];
  model: string;
  stream: boolean;
}
