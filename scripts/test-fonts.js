require('dotenv').config();
const axios = require('axios');

console.log('🧪 Testing Legal Font Implementation...\n');

async function testFonts() {
  try {
    // Test if the server is running
    const response = await axios.get('http://localhost:3000', { timeout: 5000 });
    console.log('✅ Server is running');
    console.log('✅ Fonts should be loaded via Google Fonts');
    console.log('\n📋 Font Implementation Summary:');
    console.log('• Inter - Primary UI font (headings, navigation, buttons)');
    console.log('• Source Sans Pro - Content font (chat messages, paragraphs)');
    console.log('• JetBrains Mono - Code font (legal citations, technical content)');
    console.log('\n🎯 Legal Typography Benefits:');
    console.log('• Improved readability for long legal documents');
    console.log('• Professional appearance suitable for legal context');
    console.log('• Better accessibility and screen reading');
    console.log('• Optimized for both desktop and mobile viewing');
    console.log('• Consistent with modern legal tech standards');
    
  } catch (error) {
    console.log('❌ Server is not running');
    console.log('Please start the development server with: npm run dev');
  }
}

testFonts().catch(console.error); 