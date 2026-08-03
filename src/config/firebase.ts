import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = path.resolve(__dirname, 'serviceAccountKey.json');
let firebaseApp: App | null = null;

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  if (!getApps().length) {
    firebaseApp = initializeApp({
      credential: cert(serviceAccount),
    });
    console.log('🔥 Firebase Admin SDK initialized successfully');
  } else {
    firebaseApp = getApps()[0];
  }
} else {
  console.warn('⚠️ serviceAccountKey.json not found in src/config. Firebase Admin features will be disabled.');
}

export default firebaseApp;
