import dotenv from 'dotenv';
import { processSlackMention, getCredential } from './botManager.js';

dotenv.config();

async function runTests() {
  console.log('🚀 Starting Slack app_mention event handler tests...');

  const geminiKey = await getCredential('gemini_api_key') || 'mock';

  // Helper to create a mock Slack client
  function createMockClient(repliesMessages: any[], channelName: string) {
    const postedMessages: any[] = [];
    return {
      postedMessages,
      conversations: {
        replies: async (args: any) => {
          return { messages: repliesMessages };
        },
        info: async (args: any) => {
          return { channel: { name: channelName } };
        }
      },
      chat: {
        postMessage: async (args: any) => {
          postedMessages.push(args);
          console.log(`   [Mock Slack Post] Channel: ${args.channel}, Text: "${args.text.replace(/\n/g, ' ')}"`);
          return {};
        }
      }
    };
  }

  // --- CASE 1: Valid Ticket Creation in #general (p1, read_write) ---
  console.log('\n--- Case 1: Valid Ticket Creation in #general (read_write) ---');
  const mockClient1 = createMockClient(
    [
      { user: 'U123', text: 'Hey, please create a ticket: "Fix header alignment on Safari" with the description "The headers of the Kanban columns are shifted 5px to the left in Safari browsers due to an flex-start offset. Needs padding alignment."' }
    ],
    'general'
  );

  await processSlackMention(
    {
      channel: 'general',
      ts: '123456.789',
      thread_ts: '123456.789',
      bot_id: 'B123',
      user: 'U123',
      text: 'Hey, please create a ticket: "Fix header alignment on Safari" with the description "The headers of the Kanban columns are shifted 5px to the left in Safari browsers due to an flex-start offset. Needs padding alignment."'
    },
    mockClient1,
    'B123',
    geminiKey
  );

  const hasSuccessMessage = mockClient1.postedMessages.some(m => m.text.includes('Ticket Created Successfully'));
  if (hasSuccessMessage) {
    console.log('✅ Case 1 passed: Ticket was successfully created!');
  } else {
    console.error('❌ Case 1 failed: Ticket creation message not found.');
  }

  // --- CASE 2: Clarification in #general (p1, read_write) ---
  console.log('\n--- Case 2: Incomplete Info (Clarification Request) in #general ---');
  const mockClient2 = createMockClient(
    [
      { user: 'U123', text: 'Hey, can we look into the checkout button?' },
      { user: 'U123', text: 'It is not working properly. We should do something.' }
    ],
    'general'
  );

  await processSlackMention(
    {
      channel: 'general',
      ts: '123456.789',
      thread_ts: '123456.789',
      bot_id: 'B123',
      user: 'U123',
      text: 'It is not working properly. We should do something.'
    },
    mockClient2,
    'B123',
    geminiKey
  );

  const hasClarificationMessage = mockClient2.postedMessages.some(m => m.text.includes('🤔') || m.text.includes('specify') || m.text.includes('clarification'));
  if (hasClarificationMessage) {
    console.log('✅ Case 2 passed: Clarification requested!');
  } else {
    console.error('❌ Case 2 failed: Clarification message not found.');
  }

  // --- CASE 3: Read-Only Privilege in #database-logs (p2, read_only) ---
  console.log('\n--- Case 3: Read-only Privilege in #database-logs ---');
  const mockClient3 = createMockClient(
    [
      { user: 'U123', text: 'create ticket: "test" with description "test desc"' }
    ],
    'database-logs'
  );

  await processSlackMention(
    {
      channel: 'database-logs',
      ts: '123456.789',
      thread_ts: '123456.789',
      bot_id: 'B123',
      user: 'U123',
      text: 'create ticket: "test" with description "test desc"'
    },
    mockClient3,
    'B123',
    geminiKey
  );

  const hasReadOnlyWarning = mockClient3.postedMessages.some(m => m.text.includes('Read-Only') && m.text.includes('disabled'));
  if (hasReadOnlyWarning) {
    console.log('✅ Case 3 passed: Warning posted for read-only channel!');
  } else {
    console.error('❌ Case 3 failed: Read-only warning not found.');
  }

  // --- CASE 4: Unlinked Channel ---
  console.log('\n--- Case 4: Unlinked Channel ---');
  const mockClient4 = createMockClient(
    [
      { user: 'U123', text: 'create ticket: "test" with description "test desc"' }
    ],
    'random-channel'
  );

  await processSlackMention(
    {
      channel: 'random-channel',
      ts: '123456.789',
      thread_ts: '123456.789',
      bot_id: 'B123',
      user: 'U123',
      text: 'create ticket: "test" with description "test desc"'
    },
    mockClient4,
    'B123',
    geminiKey
  );

  const hasUnlinkedWarning = mockClient4.postedMessages.some(m => m.text.includes('not associated with any project'));
  if (hasUnlinkedWarning) {
    console.log('✅ Case 4 passed: Warning posted for unlinked channel!');
  } else {
    console.error('❌ Case 4 failed: Unlinked channel warning not found.');
  }

  console.log('\n🏁 Mention handler tests completed.');
  process.exit(0);
}

runTests().catch(console.error);
