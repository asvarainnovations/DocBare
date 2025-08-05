#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to .env file
const envPath = path.join(__dirname, '..', '.env');

function readEnvFile() {
  try {
    return fs.readFileSync(envPath, 'utf8');
  } catch (error) {
    console.error('❌ Error reading .env file:', error.message);
    return '';
  }
}

function writeEnvFile(content) {
  try {
    fs.writeFileSync(envPath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('❌ Error writing .env file:', error.message);
    return false;
  }
}

function getCurrentMode() {
  const envContent = readEnvFile();
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('USE_MULTI_AGENT=')) {
      return line.includes('true') ? 'multi-agent' : 'single-agent';
    }
  }
  
  return 'single-agent'; // Default if not found
}

function setMode(mode) {
  const envContent = readEnvFile();
  const lines = envContent.split('\n');
  let found = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('USE_MULTI_AGENT=')) {
      lines[i] = `USE_MULTI_AGENT=${mode === 'multi-agent' ? 'true' : 'false'}`;
      found = true;
      break;
    }
  }
  
  if (!found) {
    lines.push(`USE_MULTI_AGENT=${mode === 'multi-agent' ? 'true' : 'false'}`);
  }
  
  const newContent = lines.join('\n');
  return writeEnvFile(newContent);
}

function showUsage() {
  console.log(`
🎭 DocBare Agent Mode Toggle

Usage:
  node scripts/toggle-agent-mode.js [mode]

Modes:
  single    - Enable single-agent mode (default)
  multi     - Enable multi-agent mode
  status    - Show current mode
  toggle    - Switch between modes

Examples:
  node scripts/toggle-agent-mode.js multi
  node scripts/toggle-agent-mode.js single
  node scripts/toggle-agent-mode.js status
  node scripts/toggle-agent-mode.js toggle
`);
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  console.log('🎭 DocBare Agent Mode Toggle\n');
  
  switch (command.toLowerCase()) {
    case 'multi':
    case 'multi-agent':
      if (setMode('multi-agent')) {
        console.log('✅ Switched to Multi-Agent Mode');
        console.log('🎭 Analysis + Drafting agents will be used');
      } else {
        console.log('❌ Failed to switch to Multi-Agent Mode');
      }
      break;
      
    case 'single':
    case 'single-agent':
      if (setMode('single-agent')) {
        console.log('✅ Switched to Single-Agent Mode');
        console.log('🤖 Standard LLM will be used');
      } else {
        console.log('❌ Failed to switch to Single-Agent Mode');
      }
      break;
      
    case 'toggle':
      const currentMode = getCurrentMode();
      const newMode = currentMode === 'multi-agent' ? 'single-agent' : 'multi-agent';
      
      if (setMode(newMode)) {
        console.log(`✅ Toggled from ${currentMode} to ${newMode} mode`);
        if (newMode === 'multi-agent') {
          console.log('🎭 Analysis + Drafting agents will be used');
        } else {
          console.log('🤖 Standard LLM will be used');
        }
      } else {
        console.log('❌ Failed to toggle mode');
      }
      break;
      
    case 'status':
      const mode = getCurrentMode();
      console.log(`📊 Current Mode: ${mode.toUpperCase()}`);
      if (mode === 'multi-agent') {
        console.log('🎭 Multi-Agent Mode: Analysis + Drafting agents');
        console.log('   - Document analysis with specialized prompts');
        console.log('   - Legal drafting with context awareness');
        console.log('   - Memory integration for continuity');
      } else {
        console.log('🤖 Single-Agent Mode: Standard LLM');
        console.log('   - Direct query processing');
        console.log('   - Standard legal assistance');
      }
      break;
      
    default:
      console.log('❌ Unknown command:', command);
      showUsage();
      process.exit(1);
  }
  
  console.log('\n💡 Restart your development server to apply changes');
  console.log('   npm run dev');
}

main(); 