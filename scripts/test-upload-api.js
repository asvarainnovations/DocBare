require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

console.log('🧪 Testing Upload API...\n');

// Create a test file
const testFilePath = path.join(__dirname, 'test-file.txt');
fs.writeFileSync(testFilePath, 'This is a test file for upload functionality.');

async function testUpload() {
  try {
    console.log('📤 Testing file upload...');
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath), 'test-file.txt');
    formData.append('userId', 'test-user-id');
    
    const response = await axios.post('http://localhost:3000/api/upload', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000,
    });
    
    console.log('✅ Upload successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Upload failed!');
    console.log('Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  } finally {
    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  }
}

// Test if server is running
async function testServer() {
  try {
    console.log('🔍 Testing if server is running...');
    const response = await axios.get('http://localhost:3000/api/query', {
      timeout: 5000,
    });
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('Error:', error.message);
    return false;
  }
}

async function main() {
  const serverRunning = await testServer();
  if (serverRunning) {
    await testUpload();
  } else {
    console.log('\n💡 Please start the development server with: npm run dev');
  }
}

main().catch(console.error); 