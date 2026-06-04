import pg from 'pg';
import dotenv from 'dotenv';
import { decrypt } from './crypto.js';

dotenv.config();

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  connectionString: process.env.DATABASE_URL
});

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface AiResponse {
  text?: string;
  toolCalls?: Array<{
    id?: string;
    name: string;
    arguments: any;
  }>;
}

export interface AiConnector {
  generate(messages: ChatMessage[], tools: ToolDefinition[], systemPrompt: string): Promise<AiResponse>;
}

// Helper to get decrypted settings from the database
export async function getSettings(): Promise<Record<string, string>> {
  try {
    const dbRes = await pool.query('SELECT * FROM settings');
    const settings: Record<string, string> = {};
    dbRes.rows.forEach(row => {
      const decrypted = decrypt(row.value);
      if (decrypted) {
        settings[row.key] = decrypted;
      } else {
        settings[row.key] = row.value;
      }
    });
    return settings;
  } catch (error) {
    console.error('Failed to load settings from DB:', error);
    return {};
  }
}

// Gemini API Connector
export class GeminiConnector implements AiConnector {
  async generate(messages: ChatMessage[], tools: ToolDefinition[], systemPrompt: string): Promise<AiResponse> {
    const settings = await getSettings();
    const apiKey = settings['gemini_api_key'];
    const model = settings['gemini_model'] || 'gemini-2.0-flash';

    if (!apiKey) {
      throw new Error('Gemini API key is not configured in settings.');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Convert messages to Gemini format
    const contents: any[] = [];
    
    // Gemini roles: 'user' or 'model'
    // For tool responses, Gemini v1beta expects role: 'function' with functionResponse part
    messages.forEach(msg => {
      if (msg.role === 'system') return; // Handled separately

      if (msg.role === 'tool') {
        contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: msg.name,
              response: { output: msg.content }
            }
          }]
        });
      } else {
        const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
        const parts: any[] = [];
        
        if (msg.content) {
          parts.push({ text: msg.content });
        }

        // Include any function calls that model sent previously
        if (msg.role === 'assistant' && msg.toolCallId) {
          // If we had tool calls, add them to the parts
          // Note: In a multi-turn conversation, model parts must match what Gemini outputted
          try {
            const parsedArgs = JSON.parse(msg.content);
            parts.push({
              functionCall: {
                name: msg.name,
                args: parsedArgs
              }
            });
          } catch {
            // Treat as text if not parseable
          }
        }

        contents.push({
          role: geminiRole,
          parts
        });
      }
    });

    const body: any = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    if (tools && tools.length > 0) {
      body.tools = [{
        functionDeclarations: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }))
      }];
    }

    console.log(`[Gemini Request] Sending request to model ${model}...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    const responseContent = candidate?.content;
    const parts = responseContent?.parts || [];

    let text = '';
    const toolCalls: any[] = [];

    parts.forEach((part: any) => {
      if (part.text) {
        text += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          name: part.functionCall.name,
          arguments: part.functionCall.args
        });
      }
    });

    return { text: text || undefined, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }
}

// OpenAI API Connector
export class OpenAiConnector implements AiConnector {
  async generate(messages: ChatMessage[], tools: ToolDefinition[], systemPrompt: string): Promise<AiResponse> {
    const settings = await getSettings();
    const apiKey = settings['openai_api_key'];
    const model = settings['openai_model'] || 'gpt-4o';

    if (!apiKey) {
      throw new Error('OpenAI API key is not configured in settings.');
    }

    const url = 'https://api.openai.com/v1/chat/completions';

    // Map messages
    const openAiMessages: any[] = [{ role: 'system', content: systemPrompt }];
    
    // We need to maintain consistent tool call IDs across assistants and tool roles
    messages.forEach(msg => {
      if (msg.role === 'system') return;

      if (msg.role === 'tool') {
        openAiMessages.push({
          role: 'tool',
          tool_call_id: msg.toolCallId || 'call_default',
          content: msg.content
        });
      } else if (msg.role === 'assistant') {
        const messageObj: any = {
          role: 'assistant',
          content: msg.content || null
        };
        if (msg.toolCallId) {
          messageObj.tool_calls = [{
            id: msg.toolCallId,
            type: 'function',
            function: {
              name: msg.name,
              arguments: msg.content // For tool calls in our chat message representation, content is the serialized arguments
            }
          }];
          messageObj.content = null;
        }
        openAiMessages.push(messageObj);
      } else {
        openAiMessages.push({
          role: 'user',
          content: msg.content
        });
      }
    });

    const body: any = {
      model,
      messages: openAiMessages
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }
      }));
    }

    console.log(`[OpenAI Request] Sending request to model ${model}...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const responseMsg = choice?.message;

    const text = responseMsg?.content || '';
    const toolCalls: any[] = [];

    if (responseMsg?.tool_calls) {
      responseMsg.tool_calls.forEach((tc: any) => {
        if (tc.type === 'function') {
          let args = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch (e) {
            console.error('Failed to parse OpenAI tool arguments:', tc.function.arguments);
          }
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: args
          });
        }
      });
    }

    return { text: text || undefined, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }
}

// Anthropic API Connector
export class AnthropicConnector implements AiConnector {
  async generate(messages: ChatMessage[], tools: ToolDefinition[], systemPrompt: string): Promise<AiResponse> {
    const settings = await getSettings();
    const apiKey = settings['anthropic_api_key'];
    const model = settings['anthropic_model'] || 'claude-3-5-sonnet-20240620';

    if (!apiKey) {
      throw new Error('Anthropic API key is not configured in settings.');
    }

    const url = 'https://api.anthropic.com/v1/messages';

    // Map messages (Anthropic does not support 'system' message in array)
    const anthropicMessages: any[] = [];
    
    messages.forEach(msg => {
      if (msg.role === 'system') return;

      if (msg.role === 'tool') {
        // Find or create last user message to append tool results, or insert as a user message
        // Anthropic requires tool responses to be in a message with role 'user'
        anthropicMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId || 'call_default',
              content: msg.content
            }
          ]
        });
      } else if (msg.role === 'assistant') {
        const content: any[] = [];
        if (msg.content && !msg.toolCallId) {
          content.push({ type: 'text', text: msg.content });
        }
        if (msg.toolCallId) {
          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(msg.content);
          } catch {}
          content.push({
            type: 'tool_use',
            id: msg.toolCallId,
            name: msg.name,
            input: parsedArgs
          });
        }
        anthropicMessages.push({
          role: 'assistant',
          content
        });
      } else {
        anthropicMessages.push({
          role: 'user',
          content: msg.content
        });
      }
    });

    const body: any = {
      model,
      system: systemPrompt,
      messages: anthropicMessages,
      max_tokens: 4000
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema
      }));
    }

    console.log(`[Anthropic Request] Sending request to model ${model}...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const textParts: string[] = [];
    const toolCalls: any[] = [];

    if (data.content) {
      data.content.forEach((item: any) => {
        if (item.type === 'text') {
          textParts.push(item.text);
        } else if (item.type === 'tool_use') {
          toolCalls.push({
            id: item.id,
            name: item.name,
            arguments: item.input
          });
        }
      });
    }

    return {
      text: textParts.join('\n') || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }
}

// Ollama API Connector
export class OllamaConnector implements AiConnector {
  async generate(messages: ChatMessage[], tools: ToolDefinition[], systemPrompt: string): Promise<AiResponse> {
    const settings = await getSettings();
    const baseUrl = settings['ollama_base_url'] || 'http://localhost:11434';
    const model = settings['ollama_model'] || 'llama3.1';

    const url = `${baseUrl}/api/chat`;

    // Ollama chat formats are very similar to OpenAI
    const ollamaMessages: any[] = [{ role: 'system', content: systemPrompt }];
    
    messages.forEach(msg => {
      if (msg.role === 'system') return;

      if (msg.role === 'tool') {
        ollamaMessages.push({
          role: 'tool',
          tool_call_id: msg.toolCallId || 'call_default',
          content: msg.content
        });
      } else if (msg.role === 'assistant') {
        const messageObj: any = {
          role: 'assistant',
          content: msg.content || null
        };
        if (msg.toolCallId) {
          messageObj.tool_calls = [{
            id: msg.toolCallId,
            type: 'function',
            function: {
              name: msg.name,
              arguments: msg.content
            }
          }];
          messageObj.content = null;
        }
        ollamaMessages.push(messageObj);
      } else {
        ollamaMessages.push({
          role: 'user',
          content: msg.content
        });
      }
    });

    const body: any = {
      model,
      messages: ollamaMessages,
      stream: false
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema
        }
      }));
    }

    console.log(`[Ollama Request] Sending request to Ollama endpoint ${url} using model ${model}...`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const responseMsg = data.message;

    const text = responseMsg?.content || '';
    const toolCalls: any[] = [];

    if (responseMsg?.tool_calls) {
      responseMsg.tool_calls.forEach((tc: any) => {
        if (tc.type === 'function' || tc.function) {
          const fn = tc.function || tc;
          let args = fn.arguments;
          if (typeof args === 'string') {
            try {
              args = JSON.parse(args);
            } catch {}
          }
          toolCalls.push({
            id: tc.id || 'call_default',
            name: fn.name,
            arguments: args
          });
        }
      });
    }

    return { text: text || undefined, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  }
}

// Registry map of connectors
const registry: Record<string, new () => AiConnector> = {
  gemini: GeminiConnector,
  openai: OpenAiConnector,
  anthropic: AnthropicConnector,
  ollama: OllamaConnector
};

export async function getAiConnector(provider?: string): Promise<AiConnector> {
  let activeProvider = provider;
  
  if (!activeProvider) {
    const settings = await getSettings();
    activeProvider = settings['active_ai_connector'] || 'gemini';
  }

  const ConnectorClass = registry[activeProvider.toLowerCase()];
  if (!ConnectorClass) {
    console.warn(`Unknown AI provider "${activeProvider}", falling back to Gemini.`);
    return new GeminiConnector();
  }

  return new ConnectorClass();
}
