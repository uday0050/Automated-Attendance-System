import Firebase from 'firebase';

// Firebase project configuration
// Replace all placeholder values with your actual Firebase credentials.
// Get them from: Firebase Console → Project Settings → Your Apps → Web App
//
// Database structure overview:
//   /students/{uid}          → { name, SRN, branch, profilePic, password, enrolledClasses[], subjects{} }
//   /teachers/{uid}          → { name, employeeId, password, classes[] }
//   /classes/{classId}       → { name, subject, room, teacher, geofence: { lat, lon, radius }, schedule{} }
//   /classes/{classId}/sessions/{sessionId} → { active, startTime, endTime }
//   /classes/{classId}/sessions/{id}/attendance/{studentId} → { markedAt, accuracy, status }

const firebaseConfig = {
  apiKey: '<your-api-key>',
  authDomain: '<your-project-id>.firebaseapp.com',
  databaseURL: 'https://<your-project-id>-default-rtdb.firebaseio.com',
  projectId: '<your-project-id>',
  storageBucket: '<your-project-id>.appspot.com',
  messagingSenderId: '<your-messaging-sender-id>',
  appId: '<your-app-id>',
  measurementId: '<your-measurement-id>',
};

if (!Firebase.apps.length) {
  Firebase.initializeApp(firebaseConfig);
}

export const DB = Firebase.database();
export default Firebase;
