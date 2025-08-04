require('dotenv').config();
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Upload Configuration...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('GCS_BUCKET_NAME:', process.env.GCS_BUCKET_NAME || '❌ NOT SET');
console.log('FIRESTORE_PROJECT_ID:', process.env.FIRESTORE_PROJECT_ID || '❌ NOT SET');
console.log('GOOGLE_CLOUD_KEY_FILE:', process.env.GOOGLE_CLOUD_KEY_FILE || '❌ NOT SET');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET');
console.log('');

// Check if service account file exists

const serviceAccountPath = path.join(__dirname, '../secrets/service-account-key.json');
console.log('🔑 Service Account File:');
if (fs.existsSync(serviceAccountPath)) {
  console.log('✅ Found:', serviceAccountPath);
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log('✅ Valid JSON format');
    console.log('   Project ID:', serviceAccount.project_id);
  } catch (error) {
    console.log('❌ Invalid JSON format:', error.message);
  }
} else {
  console.log('❌ Not found:', serviceAccountPath);
}

console.log('');

// Test Firebase Admin initialization
console.log('🔥 Testing Firebase Admin:');
try {
  if (!initializeApp.length) {
    const serviceAccount = require('../secrets/service-account-key.json');
    initializeApp({
      credential: require('firebase-admin').credential.cert(serviceAccount),
      projectId: 'utopian-pride-462008-j4'
    });
    console.log('✅ Firebase Admin initialized successfully');
  }
} catch (error) {
  console.log('❌ Firebase Admin initialization failed:', error.message);
}

console.log('');

// Test GCS configuration
console.log('☁️  Testing Google Cloud Storage:');
try {
  const gcsConfig = {
    projectId: process.env.FIRESTORE_PROJECT_ID || 'utopian-pride-462008-j4',
  };

  if (process.env.GOOGLE_CLOUD_KEY_FILE) {
    gcsConfig.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
  } else if (fs.existsSync(serviceAccountPath)) {
    gcsConfig.keyFilename = serviceAccountPath;
  }

  const storage = new Storage(gcsConfig);
  console.log('✅ Storage client created');
  
  if (process.env.GCS_BUCKET_NAME) {
    const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
    console.log('✅ Bucket reference created:', process.env.GCS_BUCKET_NAME);
  } else {
    console.log('❌ GCS_BUCKET_NAME not set');
  }
} catch (error) {
  console.log('❌ GCS configuration failed:', error.message);
}

console.log('');

// Test Prisma connection
console.log('🗄️  Testing Database Connection:');
try {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  // Test connection
  prisma.$connect().then(() => {
    console.log('✅ Database connection successful');
    
    // Test Document model
    return prisma.document.count();
  }).then((documentCount) => {
    console.log('✅ Document model accessible, count:', documentCount);
    return prisma.$disconnect();
  }).catch((error) => {
    console.log('❌ Database connection failed:', error.message);
  });
} catch (error) {
  console.log('❌ Database connection failed:', error.message);
}

console.log('\n📝 Summary:');
console.log('To fix upload issues, ensure the following environment variables are set:');
console.log('- GCS_BUCKET_NAME: Your Google Cloud Storage bucket name');
console.log('- FIRESTORE_PROJECT_ID: Your Firebase project ID');
console.log('- GOOGLE_CLOUD_KEY_FILE: Path to your service account JSON file');
console.log('- DATABASE_URL: Your PostgreSQL database connection string'); 