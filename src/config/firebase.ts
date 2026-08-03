import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');
let firebaseApp: App | null = null;
let credential: any = null;

// 1. First try to load from individual environment variables
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  credential = cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Replace literal '\n' characters in the env var string with actual newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  });
}
// 2. Try the old full JSON object env var (just in case)
else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = cert(serviceAccount);
  } catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env variable');
  }
} 
// 3. Fallback to local file (For Local Development)
else if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  credential = cert(serviceAccount);
}

// 4. Initialize Firebase
if (credential) {
  if (!getApps().length) {
    firebaseApp = initializeApp({
      credential,
    });
    console.log('🔥 Firebase Admin SDK initialized successfully');
  } else {
    firebaseApp = getApps()[0];
  }
} else {
  console.warn('⚠️ Firebase credentials not found (no env var or local file). Firebase Admin features will be disabled.');
}

export default firebaseApp;
