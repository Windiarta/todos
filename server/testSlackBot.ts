import dotenv from 'dotenv';
import { getCredential, runAiTicketExtractor } from './botManager.js';
import { executeTool } from './mcpServer.js';

dotenv.config();

async function runTests() {
  console.log('🚀 Starting Slack/AI Bot integration tests...');

  // 1. Fetch Gemini API key
  const geminiKey = await getCredential('gemini_api_key');
  if (!geminiKey) {
    console.error('❌ Gemini API key not found in database settings. Make sure settings are saved.');
    process.exit(1);
  }
  console.log('✅ Gemini API key successfully retrieved and decrypted.');

  // Project ID to use
  const projectId = 'p1'; // Linear Integration project

  // --- CASE A: Clear Title and Description (Should Create Ticket) ---
  console.log('\n--- Test Case A: Clear Title & Description ---');
  const transcriptA = `
Win (You): Hey, we need to fix the alignment of the headers in the Kanban board.
Alex River: Oh right, they are slightly offset to the left in Safari. Let's make a ticket for this.
Win (You): Yes, please create a ticket: "Fix header alignment on Safari" with the description "The headers of the Kanban columns are shifted 5px to the left in Safari browsers due to an flex-start offset. Needs padding alignment."
`;
  console.log('Input Transcript:\n', transcriptA.trim());

  try {
    const functionCallA = await runAiTicketExtractor(transcriptA, projectId, geminiKey);
    console.log('Gemini Function Call Response:', JSON.stringify(functionCallA, null, 2));

    if (functionCallA.name === 'create_ticket') {
      console.log('✅ Success: Gemini identified create_ticket call.');
      
      // Let's execute the ticket creation tool to verify DB inserts
      const result = await executeTool('create_ticket', {
        ...functionCallA.args,
        projectId
      });
      console.log('DB Execution Result:', JSON.stringify(result, null, 2));
      if (result.success && result.ticketId) {
        console.log(`🎉 Ticket ${result.ticketId} successfully created in PostgreSQL database!`);
      } else {
        console.log('❌ Failed to execute create_ticket tool.');
      }
    } else {
      console.log('❌ Failed: Gemini did not call create_ticket. Called:', functionCallA.name);
    }
  } catch (err: any) {
    console.error('❌ Case A error:', err.message);
  }

  // --- CASE B: Missing/Incomplete Information (Should Clarify) ---
  console.log('\n--- Test Case B: Incomplete Information (Should Ask Clarification) ---');
  const transcriptB = `
Win (You): Hey, can we look into the checkout button?
Alex River: Sure, what about it?
Win (You): It is not working properly. We should do something.
`;
  console.log('Input Transcript:\n', transcriptB.trim());

  try {
    const functionCallB = await runAiTicketExtractor(transcriptB, projectId, geminiKey);
    console.log('Gemini Function Call Response:', JSON.stringify(functionCallB, null, 2));

    if (functionCallB.name === 'ask_for_clarification') {
      console.log('✅ Success: Gemini identified ask_for_clarification call.');
      console.log('Clarification Question:', functionCallB.args.question);
    } else {
      console.log('❌ Failed: Gemini did not call ask_for_clarification. Called:', functionCallB.name);
    }
  } catch (err: any) {
    console.error('❌ Case B error:', err.message);
  }

  console.log('\n🏁 Tests completed.');
  process.exit(0);
}

runTests();
