import pg from 'pg';
import dotenv from 'dotenv';
import pkg from '@slack/bolt';
import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';
import { decrypt } from './crypto.js';
import { executeTool, mcpTools } from './mcpServer.js';
import { getAiConnector, ChatMessage } from './aiConnector.js';

const { App: SlackApp } = pkg;

dotenv.config();

// Postgres Connection Pool
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
  connectionString: process.env.DATABASE_URL
});

// Active instances track
let activeSlackApp: any = null;
let activeDiscordClient: DiscordClient | null = null;

// Helpers to get decrypted credentials from database settings
export async function getCredential(key: string): Promise<string> {
  try {
    const res = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    if (res.rows.length > 0) {
      return decrypt(res.rows[0].value);
    }
  } catch (err) {
    console.error(`Failed to fetch setting ${key}:`, err);
  }
  return '';
}

export async function runAiChatLoop(
  chatMessages: ChatMessage[],
  projectId: string,
  systemPrompt: string
): Promise<string> {
  const connector = await getAiConnector();
  const messages = [...chatMessages];
  
  let iterations = 0;
  const maxIterations = 5;
  
  while (iterations < maxIterations) {
    iterations++;
    console.log(`[AI Chat Loop] Iteration ${iterations}...`);
    
    // Call the connector
    const response = await connector.generate(messages, mcpTools, systemPrompt);
    
    // If there are no tool calls, return the text response
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return response.text || "I've processed your request.";
    }
    
    const toolCall = response.toolCalls[0];
    const toolName = toolCall.name;
    const toolArgs = toolCall.arguments || {};
    
    // If it's ask_for_clarification, return the question
    if (toolName === 'ask_for_clarification') {
      return `🤔 ${toolArgs.question || 'Could you please clarify your request?'}`;
    }
    
    // Inject projectId if missing and relevant
    if (['create_ticket', 'list_issues'].includes(toolName) && !toolArgs.projectId) {
      toolArgs.projectId = projectId;
    }
    
    // Append the assistant's message with tool call
    messages.push({
      role: 'assistant',
      content: JSON.stringify(toolArgs),
      name: toolName,
      toolCallId: toolCall.id || `call_${Date.now()}_${iterations}`
    });
    
    let toolResult: any;
    try {
      toolResult = await executeTool(toolName, toolArgs);
    } catch (err: any) {
      toolResult = { error: err.message || String(err) };
    }
    
    // Append tool response
    messages.push({
      role: 'tool',
      name: toolName,
      toolCallId: toolCall.id || `call_${Date.now()}_${iterations}`,
      content: JSON.stringify(toolResult)
    });
  }
  
  return "I apologize, but I reached my execution limit while processing your request.";
}

// AI ticket extraction logic with Gemini forced tool calls (legacy fallback)
function fallbackParser(transcript: string) {
  console.log('🤖 Running local offline rule-based parser fallback...');
  const createTicketRegex = /(?:create|make|add)\s+(?:a\s+)?(?:ticket|issue|todo)[:\s]+["'“]([^"'“”]+)["'“”]\s+with\s+(?:the\s+)?description\s+["'“]([^"'“”]+)["'“”]/i;
  let match = transcript.match(createTicketRegex);
  
  if (!match) {
    const createTicketRegexNoQuotes = /(?:create|make|add)\s+(?:a\s+)?(?:ticket|issue|todo)[:\s]+([^.]+)\s+with\s+(?:the\s+)?description\s+(.+)/i;
    match = transcript.match(createTicketRegexNoQuotes);
  }
  
  if (match) {
    const title = match[1].trim();
    const description = match[2].trim();
    return {
      name: 'create_ticket',
      args: {
        title,
        description,
        priority: 'medium'
      }
    };
  }
  
  return {
    name: 'ask_for_clarification',
    args: {
      question: "I couldn't automatically extract a clear ticket title and description from the conversation. Could you please specify them? For example: Create ticket: \"[Title]\" with description \"[Description]\"."
    }
  };
}

// ----------------------------------------------------
// Bot Lifecycles
// ----------------------------------------------------

export async function processSlackMention(event: any, client: any, botId: string) {
  try {
    const threadTs = event.thread_ts || event.ts;

    // Fetch thread history
    const history = await client.conversations.replies({
      channel: event.channel,
      ts: threadTs
    });

    if (!history.messages || history.messages.length === 0) return;

    // Build chat messages
    const chatMessages: ChatMessage[] = history.messages.map((m: any) => {
      const isBot = m.user === botId || (m.bot_id && m.bot_id === botId);
      return {
        role: isBot ? 'assistant' : 'user',
        content: m.text || ''
      };
    });

    // Fetch channel info to resolve name
    const channelInfo = await client.conversations.info({ channel: event.channel });
    const channelName = channelInfo.channel?.name || '';

    // Log the incoming message from the Slack user
    console.log(`\n[SLACK INCOMING MESSAGE] User: ${event.user || 'Unknown'}, Channel: #${channelName} (${event.channel}), Message: "${event.text}"`);

    // Look up project associated with this channel
    const projectRes = await pool.query(
      'SELECT * FROM projects WHERE slack_channel = $1 OR slack_channel = $2',
      [event.channel, channelName]
    );

    if (projectRes.rows.length === 0) {
      const replyText = `⚠️ Slack channel "#${channelName}" (${event.channel}) is not associated with any project. Add this channel in your Project settings first.`;
      console.log(`[SLACK AI RESPONSE] Channel: #${channelName}, Action: WARN_UNLINKED, Response: "${replyText}"`);
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: threadTs,
        text: replyText
      });
      return;
    }

    const project = projectRes.rows[0];
    if (project.slack_privilege !== 'read_write') {
      if (project.slack_privilege === 'read_only') {
        const replyText = `⚠️ Channel "#${channelName}" is configured as Read-Only. Direct chatbot assist is disabled.`;
        console.log(`[SLACK AI RESPONSE] Channel: #${channelName}, Action: WARN_READ_ONLY, Response: "${replyText}"`);
        await client.chat.postMessage({
          channel: event.channel,
          thread_ts: threadTs,
          text: replyText
        });
      } else {
        console.log(`[SLACK AI RESPONSE] Channel: #${channelName}, Action: IGNORED (Privilege is disabled)`);
      }
      return;
    }

    console.log(`[SLACK AI PROCESSING] Analyzing conversation thread for project "${project.name}" (ID: ${project.id})...`);
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: threadTs,
      text: `🤖 Analyzing conversation thread for project "${project.name}"...`
    });

    const systemPrompt = `You are a professional project manager AI assistant integrated into this project's Slack channel.
You help manage tasks, issues, and tickets for the project "${project.name}".
You have access to tools to list issues, create tickets, update issues, add comments, and manage subtasks.

Rules:
1. When asked to create a ticket, you MUST have both a clear title and description. If either is missing or unclear, call the 'ask_for_clarification' tool. Do NOT guess or make up fields.
2. If you execute tools, you will see the output of the tool execution. Explain the outcome clearly to the user.
3. Keep responses helpful and concise. Use markdown formatting.
4. The current project ID is: ${project.id}. When calling tools for this channel, default to this project ID.`;

    let replyText = '';
    try {
      replyText = await runAiChatLoop(chatMessages, project.id, systemPrompt);
    } catch (aiErr: any) {
      console.warn(`[SLACK AI ERROR] AI loop failed: ${aiErr.message}. Running fallback...`);
      const transcript = history.messages
        .map((m: any) => `${m.user === botId ? 'AI_Bot' : m.user}: ${m.text}`)
        .join('\n');
      const functionCall = fallbackParser(transcript);
      if (functionCall.name === 'create_ticket') {
        const result = await executeTool('create_ticket', { ...functionCall.args, projectId: project.id });
        const ticketUrl = `http://localhost:5173/`;
        replyText = `✅ *Ticket Created Successfully (Fallback)!*\n\n* *ID:* \`${result.ticketId}\`\n* *Title:* ${result.title}\n* *Priority:* \`${result.priority}\`\n* <${ticketUrl}|View in Workspace>`;
      } else {
        replyText = `🤔 ${functionCall.args.question}`;
      }
    }

    console.log(`[SLACK AI RESPONSE] Channel: #${channelName}, Response: "${replyText.replace(/\n/g, ' ')}"`);
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: threadTs,
      text: markdownToSlack(replyText)
    });
  } catch (err: any) {
    console.error('Error handling Slack app_mention:', err);
    const replyText = `❌ Error processing request: ${err.message}`;
    console.log(`[SLACK AI RESPONSE] Channel: #${event.channel}, Action: ERROR, Response: "${replyText}"`);
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts || event.ts,
      text: markdownToSlack(replyText)
    });
  }
}

export async function processDiscordMention(message: any, botUserId: string) {
  try {
    const channelName = (message.channel as any).name || '';
    
    // Log the incoming message from the Discord user
    console.log(`\n[DISCORD INCOMING MESSAGE] User: ${message.author.username} (${message.author.id}), Channel: #${channelName} (${message.channel.id}), Message: "${message.content}"`);

    // Fetch message history in current channel
    const messages = await message.channel.messages.fetch({ limit: 30 });
    const sorted = [...messages.values()].reverse();
    const chatMessages: ChatMessage[] = sorted.map(m => {
      const isBot = m.author.id === botUserId;
      return {
        role: isBot ? 'assistant' : 'user',
        content: m.content || ''
      };
    });

    // Look up project associated with this channel
    const projectRes = await pool.query(
      'SELECT * FROM projects WHERE discord_channel = $1 OR discord_channel = $2',
      [message.channel.id, channelName]
    );

    if (projectRes.rows.length === 0) {
      const replyText = `⚠️ Discord channel "${channelName}" (${message.channel.id}) is not associated with any project. Add this channel ID in your Project settings first.`;
      console.log(`[DISCORD AI RESPONSE] Channel: #${channelName}, Action: WARN_UNLINKED, Response: "${replyText}"`);
      await message.reply(replyText);
      return;
    }

    const project = projectRes.rows[0];
    if (project.discord_privilege !== 'read_write') {
      if (project.discord_privilege === 'read_only') {
        const replyText = `⚠️ Channel "${channelName}" is configured as Read-Only. Direct chatbot assist is disabled.`;
        console.log(`[DISCORD AI RESPONSE] Channel: #${channelName}, Action: WARN_READ_ONLY, Response: "${replyText}"`);
        await message.reply(replyText);
      } else {
        console.log(`[DISCORD AI RESPONSE] Channel: #${channelName}, Action: IGNORED (Privilege is disabled)`);
      }
      return;
    }

    console.log(`[DISCORD AI PROCESSING] Analyzing conversation thread for project "${project.name}" (ID: ${project.id})...`);
    const loadingMsg = await message.reply(`🤖 Analyzing conversation thread for project "${project.name}"...`);

    const systemPrompt = `You are a professional project manager AI assistant integrated into this project's Discord channel.
You help manage tasks, issues, and tickets for the project "${project.name}".
You have access to tools to list issues, create tickets, update issues, add comments, and manage subtasks.

Rules:
1. When asked to create a ticket, you MUST have both a clear title and description. If either is missing or unclear, call the 'ask_for_clarification' tool. Do NOT guess or make up fields.
2. If you execute tools, you will see the output of the tool execution. Explain the outcome clearly to the user.
3. Keep responses helpful and concise. Use markdown formatting.
4. The current project ID is: ${project.id}. When calling tools for this channel, default to this project ID.`;

    let replyText = '';
    try {
      replyText = await runAiChatLoop(chatMessages, project.id, systemPrompt);
    } catch (aiErr: any) {
      console.warn(`[DISCORD AI ERROR] AI loop failed: ${aiErr.message}. Running fallback...`);
      const transcript = sorted
        .map(m => `${m.author.id === botUserId ? 'AI_Bot' : m.author.username}: ${m.content}`)
        .join('\n');
      const functionCall = fallbackParser(transcript);
      if (functionCall.name === 'create_ticket') {
        const result = await executeTool('create_ticket', { ...functionCall.args, projectId: project.id });
        const ticketUrl = `http://localhost:5173/`;
        replyText = `✅ **Ticket Created Successfully (Fallback)!**\n\n* **ID:** \`${result.ticketId}\`\n* **Title:** ${result.title}\n* **Priority:** \`${result.priority}\`\n* [View in Workspace](${ticketUrl})`;
      } else {
        replyText = `🤔 ${functionCall.args.question}`;
      }
    }

    console.log(`[DISCORD AI RESPONSE] Channel: #${channelName}, Response: "${replyText.replace(/\n/g, ' ')}"`);
    await loadingMsg.edit(replyText);
  } catch (err: any) {
    console.error('Error handling Discord messageCreate:', err);
    const replyText = `❌ Error processing request: ${err.message}`;
    console.log(`[DISCORD AI RESPONSE] Channel: #${message.channel.id}, Action: ERROR, Response: "${replyText}"`);
    await message.reply(replyText).catch(() => {});
  }
}

export async function initializeChatBots() {
  console.log('Initializing chatbot listeners...');

  const slackBotToken = await getCredential('slack_bot_token');
  const slackAppToken = await getCredential('slack_app_token');
  const discordBotToken = await getCredential('discord_bot_token');

  if (!slackBotToken && !slackAppToken && !discordBotToken) {
    console.log('No chatbot tokens are configured.');
    return;
  }

  // 1. Initialize Slack Bolt App in Socket Mode
  if (slackBotToken && slackAppToken) {
    try {
      console.log('Starting Slack Socket Mode Bot...');
      const slackApp = new SlackApp({
        token: slackBotToken,
        appToken: slackAppToken,
        socketMode: true
      });

      slackApp.event('app_mention', async ({ event, client }) => {
        await processSlackMention(event, client, event.bot_id || '');
      });

      await slackApp.start();
      activeSlackApp = slackApp;
      console.log('⚡ Slack Bolt Socket Mode Bot is online!');
    } catch (e) {
      console.error('Failed to start Slack Bot:', e);
    }
  }

  // 2. Initialize Discord Client
  if (discordBotToken) {
    try {
      console.log('Starting Discord Bot Client...');
      const discordClient = new DiscordClient({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ]
      });

      discordClient.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        // Check if bot was mentioned
        const isMentioned = message.mentions.has(discordClient.user?.id || '');
        if (!isMentioned) return;

        await processDiscordMention(message, discordClient.user?.id || '');
      });

      await discordClient.login(discordBotToken);
      activeDiscordClient = discordClient;
      console.log('⚡ Discord Bot is online!');
    } catch (e) {
      console.error('Failed to start Discord Bot:', e);
    }
  }
}

export async function restartChatBots() {
  console.log('Restarting chatbot listeners...');

  // Teardown Slack Bot
  if (activeSlackApp) {
    try {
      await activeSlackApp.stop();
      console.log('Slack Bot stopped.');
    } catch (e) {
      console.error('Error stopping Slack Bot:', e);
    }
    activeSlackApp = null;
  }

  // Teardown Discord Bot
  if (activeDiscordClient) {
    try {
      activeDiscordClient.destroy();
      console.log('Discord Bot stopped.');
    } catch (e) {
      console.error('Error stopping Discord Bot:', e);
    }
    activeDiscordClient = null;
  }

  // Re-initialize
  await initializeChatBots();
}

export async function sendHelloToChannels(project: any) {
  const status: {
    slackBot: string;
    discordBot: string;
    errors?: Record<string, string>;
  } = {
    slackBot: 'not_configured',
    discordBot: 'not_configured',
    errors: {}
  };

  // 1. Slack Bot
  if (activeSlackApp && project.slack_channel) {
    try {
      await activeSlackApp.client.chat.postMessage({
        channel: project.slack_channel,
        text: `👋 *Hello from Linear Clone!* Chatbot socket mode connection successful.`
      });
      status.slackBot = 'success';
    } catch (e: any) {
      status.slackBot = 'failed';
      status.errors!.slackBot = e.message || String(e);
      console.error('Slack bot hello failed:', e);
    }
  } else if (project.slack_channel) {
    // Slack channel configured but activeSlackApp is not initialized
    status.slackBot = 'failed';
    status.errors!.slackBot = 'Slack Bot is not active (check your tokens in Settings)';
  }

  // 4. Discord Bot
  if (activeDiscordClient && project.discord_channel) {
    try {
      const channel = await activeDiscordClient.channels.fetch(project.discord_channel);
      if (channel && channel.isTextBased()) {
        await (channel as any).send(`👋 **Hello from Linear Clone!** Chatbot gateway connection successful.`);
        status.discordBot = 'success';
      } else {
        status.discordBot = 'failed';
        status.errors!.discordBot = 'Channel is not text-based or not found';
      }
    } catch (e: any) {
      status.discordBot = 'failed';
      status.errors!.discordBot = e.message || String(e);
      console.error('Discord bot hello failed:', e);
    }
  } else if (project.discord_channel) {
    // Discord channel configured but activeDiscordClient is not initialized
    status.discordBot = 'failed';
    status.errors!.discordBot = 'Discord Bot is not active (check your token in Settings)';
  }

  // Remove errors field if empty
  if (status.errors && Object.keys(status.errors).length === 0) {
    delete status.errors;
  }

  return status;
}

export async function sendBotNotification(issue: any, projectId: string | null) {
  if (!projectId) return;
  try {
    const projectRes = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectRes.rows.length === 0) return;
    const project = projectRes.rows[0];

    const ticketUrl = `http://localhost:5173/`;

    // Slack Notification via Chatbot Bot Token
    if (activeSlackApp && project.slack_channel && (project.slack_privilege === 'read_only' || project.slack_privilege === 'read_write')) {
      try {
        await activeSlackApp.client.chat.postMessage({
          channel: project.slack_channel,
          text: `*New Ticket Created in "${project.name}":* <${ticketUrl}|${issue.id}: ${issue.title}>\n*Priority:* ${issue.priority} | *Status:* ${issue.status}`
        });
        console.log(`[SLACK BOT NOTIFICATION] Dispatched to #${project.slack_channel} for project "${project.name}"`);
      } catch (err) {
        console.error('Slack Bot notification failed:', err);
      }
    }

    // Discord Notification via Chatbot Bot Client
    if (activeDiscordClient && project.discord_channel && (project.discord_privilege === 'read_only' || project.discord_privilege === 'read_write')) {
      try {
        const channel = await activeDiscordClient.channels.fetch(project.discord_channel);
        if (channel && channel.isTextBased()) {
          await (channel as any).send(`**New Ticket Created in "${project.name}":** [${issue.id}: ${issue.title}](${ticketUrl})\n**Priority:** ${issue.priority} | **Status:** ${issue.status}`);
          console.log(`[DISCORD BOT NOTIFICATION] Dispatched to #${project.discord_channel} for project "${project.name}"`);
        }
      } catch (err) {
        console.error('Discord Bot notification failed:', err);
      }
    }
  } catch (error) {
    console.error('Error dispatching bot notifications:', error);
  }
}

export function markdownToSlack(text: string): string {
  if (!text) return '';

  let formatted = text;

  // 1. Convert bullet points first to clear list asterisks
  formatted = formatted.replace(/^\s*[-*]\s+/gm, '• ');

  // 2. Convert headers to bold placeholders
  formatted = formatted.replace(/^###\s+(.+)$/gm, '\u0001$1\u0001');
  formatted = formatted.replace(/^##\s+(.+)$/gm, '\u0001$1\u0001');
  formatted = formatted.replace(/^#\s+(.+)$/gm, '\u0001$1\u0001');

  // 3. Convert bold syntax to bold placeholders
  formatted = formatted.replace(/(\*\*|__)(.*?)\1/g, '\u0001$2\u0001');

  // 4. Convert italic syntax to italic placeholders
  formatted = formatted.replace(/(?<!\*)\*([^\s*](?:[^*]*[^\s*])?)\*(?!\*)/g, '\u0002$1\u0002');
  formatted = formatted.replace(/_([^_\s](?:[^_]*[^_\s])?)_/g, '\u0002$1\u0002');

  // 5. Replace placeholders with Slack characters
  formatted = formatted.replace(/\u0001/g, '*');
  formatted = formatted.replace(/\u0002/g, '_');

  // 6. Convert links: [text](url) -> <url|text>
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');

  return formatted;
}


