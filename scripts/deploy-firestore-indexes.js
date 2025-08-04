const { execSync } = require('child_process');

console.log('🔧 Deploying Firestore indexes...');

try {
  // Deploy only the Firestore indexes
  execSync('firebase deploy --only firestore:indexes', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('✅ Firestore indexes deployed successfully!');
  console.log('Note: It may take a few minutes for indexes to be fully built.');
  
} catch (error) {
  console.error('❌ Error deploying Firestore indexes:', error.message);
  console.log('\n💡 To deploy manually:');
  console.log('1. Run: firebase login --reauth');
  console.log('2. Run: firebase deploy --only firestore:indexes');
  console.log('\nOr create indexes manually in Firebase Console:');
  console.log('https://console.firebase.google.com/v1/r/project/utopian-pride-462008-j4/firestore/indexes');
} 