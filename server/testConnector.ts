import { getAiConnector, getSettings } from './aiConnector.js';

async function run() {
  const settings = await getSettings();
  console.log('Settings:', settings);
  const connector = await getAiConnector();
  console.log('Connector:', connector.constructor.name);
  process.exit(0);
}
run().catch(console.error);
