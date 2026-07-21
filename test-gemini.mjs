import { readFileSync } from 'fs';

async function test() {
  try {
    const envFile = readFileSync('./.env', 'utf-8');
    const keyMatch = envFile.match(/GEMINI_API_KEY="([^"]+)"/);
    if (!keyMatch || !keyMatch[1]) {
      console.log('No API key found in .env');
      return;
    }
    const key = keyMatch[1];
    
    console.log('Fetching models...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    console.log('Models available:', data.models?.map(m => m.name).join(', '));
  } catch (err) {
    console.error('API Error:', err);
  }
}

test();
