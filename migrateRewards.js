/**
 * Migration script to rename `pointCost` → `cost`
 * and `stockQuantity` → `stock` in Firestore `rewards` documents.
 */
const admin = require('firebase-admin');

// Adjust the path below according to your file location:
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateRewards() {
  try {
    const rewardsRef = db.collection('rewards');
    const snapshot = await rewardsRef.get();

    console.log(`Found ${snapshot.size} reward documents.`);

    const batch = db.batch();

    snapshot.forEach(doc => {
      const data = doc.data();
      const updateData = {};
      let needsUpdate = false;

      if ('pointCost' in data) {
        updateData.cost = data.pointCost;
        updateData.pointCost = admin.firestore.FieldValue.delete();
        needsUpdate = true;
      }
      if ('stockQuantity' in data) {
        updateData.stock = data.stockQuantity;
        updateData.stockQuantity = admin.firestore.FieldValue.delete();
        needsUpdate = true;
      }

      // Only update documents that need change
      if (needsUpdate) {
        console.log(`Updating doc ${doc.id}:`, updateData);
        batch.update(doc.ref, updateData);
      }
    });

    await batch.commit();
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateRewards();
