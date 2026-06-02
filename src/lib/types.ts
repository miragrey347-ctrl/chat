export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking_content?: string | null;
  model_used?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_status?: string | null;
  cached_tokens?: number | null;
  tool_calls?: Array<{ name: string; arguments: string }> | null;
  search_sources?: Array<{ title: string; snippet: string; url: string }> | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  assistant_id: string | null;
  title: string;
  is_starred: boolean;
  current_model: string;
  created_at: string;
  updated_at: string;
}

export interface Assistant {
  id: string;
  name: string;
  tags: string;
  avatar_url: string | null;
  default_model: string;
  stream_enabled: boolean;
  system_prompt: string;
  quick_messages: { name: string; content: string }[];
  memory_enabled: boolean;
  memory_system_instruction?: string | null;
  history_reference_enabled?: boolean;
  history_reference_count?: number;
  created_at: string;
  updated_at: string;
}
