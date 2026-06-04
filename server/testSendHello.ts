import dotenv from 'dotenv';
import { sendHelloToChannels } from './botManager.js';

dotenv.config();

async function runTests() {
  console.log('🚀 Starting "Send Hello" integration test...');

  // Mock project with invalid/malformed webhook URLs to test error parsing
  const mockProject = {
    id: 'p_test',
    name: 'Test Project',
    slack_webhook_url: 'invalid-scheme://hooks.slack.com/services/123/456',
    discord_webhook_url: 'invalid-scheme://discord.com/api/webhooks/123/456',
    slack_channel: 'general',
    discord_channel: '1234567890'
  };

  console.log('\n--- Test Case 1: Send Hello with Invalid Webhooks ---');
  console.log('Calling sendHelloToChannels with invalid Webhook URLs...');
  
  try {
    const results = await sendHelloToChannels(mockProject);
    console.log('Results response:', JSON.stringify(results, null, 2));

    // Verify webhook states are failed
    if (results.slackWebhook === 'failed' && results.discordWebhook === 'failed') {
      console.log('✅ Webhooks successfully caught errors and set state to "failed".');
    } else {
      console.error('❌ Failed: Webhooks did not report "failed".');
    }

    // Verify errors are captured
    if (results.errors && results.errors.slackWebhook && results.errors.discordWebhook) {
      console.log('✅ Webhooks successfully reported specific error details:');
      console.log(`   Slack Error: "${results.errors.slackWebhook}"`);
      console.log(`   Discord Error: "${results.errors.discordWebhook}"`);
    } else {
      console.error('❌ Failed: Error details not captured.');
    }

    // Verify bots are failed if tokens are mock/offline
    if (results.slackBot === 'failed' && results.discordBot === 'failed') {
      console.log('✅ Bots successfully reported "failed" due to inactive bot sessions.');
    } else {
      console.log('ℹ️ Bots reported:', { slackBot: results.slackBot, discordBot: results.discordBot });
    }

  } catch (err: any) {
    console.error('❌ Integration test failed with exception:', err);
    process.exit(1);
  }

  console.log('\n🏁 Send Hello test completed.');
  process.exit(0);
}

runTests().catch(console.error);
