const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Use the UID you gave
const adminUid = 'Grlx15oNtVPjTthbQG1Zfpc6kOl2';

admin.auth().setCustomUserClaims(adminUid, { admin: true })
  .then(() => {
    console.log(`✅ User ${adminUid} is now an admin!`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting admin claim:', error);
    process.exit(1);
  });
