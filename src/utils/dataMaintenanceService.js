// src/utils/dataMaintenanceService.js (New utility file)
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  query, 
  updateDoc, 
  doc,
  runTransaction 
} from 'firebase/firestore';

/**
 * Reconciles external user point balances and system totals 
 * against the verified, authoritative Ledger (the blockchain).
 */
export const reconcileExternalPoints = async () => {
  const ledgerRef = collection(db, "ledger");
  let totalPointsFromLedger = 0;
  const userPointTotals = {}; // Tracks { userId: totalPoints }

  try {
    // 1. READ: Get ALL verified blocks from the ledger
    console.log("Starting ledger audit...");
    const q = query(ledgerRef);
    const snapshot = await getDocs(q);

    // 2. CALCULATE: Sum points for each user and system total
    snapshot.forEach(doc => {
      const block = doc.data();
      const points = block.points || 0;
      const userId = block.userId;

      totalPointsFromLedger += points;

      if (userId) {
        userPointTotals[userId] = (userPointTotals[userId] || 0) + points;
      }
    });

    // 3. WRITE: Update user balances in the external /users collection
    console.log("Updating individual user balances...");
    for (const [userId, totalPoints] of Object.entries(userPointTotals)) {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        points: totalPoints // Overwrite the possibly tampered points with the verified total
      });
      console.log(`Updated user ${userId} points to ${totalPoints}`);
    }

    // 4. (OPTIONAL) FIX: Update the system-wide total if applicable
    // Note: The /point_transactions table may require deeper logic, 
    // but updating the user totals often fixes the high-level system check.
    // If the External Total check relies on another system-wide total field:
    // const systemTotalRef = doc(db, 'system', 'totals_tracker');
    // await updateDoc(systemTotalRef, { totalPoints: totalPointsFromLedger });


    console.log(`✅ Reconciliation complete. Ledger total is now ${totalPointsFromLedger}.`);
    return { 
      success: true, 
      ledgerTotal: totalPointsFromLedger, 
      userUpdates: Object.keys(userPointTotals).length 
    };

  } catch (error) {
    console.error("Reconciliation failed:", error);
    throw error;
  }
};