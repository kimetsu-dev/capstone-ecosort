// src/utils/ledgerService.js

import { db } from '../firebase';
import { 
  collection, 
  runTransaction, 
  doc, 
  serverTimestamp, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from "firebase/firestore";
// CRITICAL: Correctly imports the shared hashing logic
import { createBlockHash } from './blockchainService';

/**
 * Adds a transaction to the immutable ledger.
 * Uses a Firebase Transaction to ensure no two users grab the same 'previous hash' at once.
 */
export const addToLedger = async (userId, actionType, points, metadata = {}) => {
  const ledgerRef = collection(db, "ledger");
  const systemSettingsRef = doc(db, "system", "ledger_tracker");

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Get the latest block info
      const sysDoc = await transaction.get(systemSettingsRef);
      
      let prevHash = "0"; // Genesis hash (start of chain)
      let index = 0;

      if (sysDoc.exists()) {
        const data = sysDoc.data();
        prevHash = data.latestHash || "0"; // Use existing hash or 0 if undefined
        index = (data.currentIndex || 0) + 1;
      }

      // 2. Create the payload for the new block
      const timestamp = new Date().toISOString();
      
      // 3. Generate the Hash (The Fingerprint) using the standard function
      const newBlockData = {
        index,
        prevHash,
        timestamp,
        userId,
        actionType,
        points,
        metadata
      };

      const currentHash = createBlockHash(newBlockData);

      // 4. Create the Block Object
      const newBlock = {
        ...newBlockData,
        createdAt: serverTimestamp(), // Firestore sorting
        hash: currentHash,
        isValid: true 
      };

      // 5. Write to Firestore
      const newBlockRef = doc(ledgerRef); // Auto-ID
      transaction.set(newBlockRef, newBlock);
      
      // Update the system tracker so the next transaction knows the parent
      transaction.set(systemSettingsRef, {
        latestHash: currentHash,
        currentIndex: index
      });
    });
    
    console.log("⛓️ Transaction successfully chained to ledger.");
    return true;

  } catch (e) {
    console.error("❌ Ledger Transaction Failed: ", e);
    throw e;
  }
};

/**
 * Fetch the ledger chain for the Admin Panel or visualizer.
 * Fetches the last 100 blocks ordered by index descending (newest first).
 */
export const getLedgerChain = async () => {
  try {
    const q = query(collection(db, "ledger"), orderBy("index", "desc"), limit(100));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error("Error fetching ledger:", e);
    return [];
  }
};

/**
 * Utility to verify the integrity of the chain manually on the client side.
 */
export const verifyChainIntegrity = (chainData) => {
    if (!chainData || chainData.length === 0) return true;

    // 1. Sort by Index ASC (Genesis -> Latest) to verify links correctly
    const chain = [...chainData].sort((a, b) => a.index - b.index);

    for (let i = 1; i < chain.length; i++) {
        const currentBlock = chain[i];
        const previousBlock = chain[i - 1];

        // 2. Check if previous hash matches
        if (currentBlock.prevHash !== previousBlock.hash) {
            console.error(`Broken Link at Index ${currentBlock.index}: PrevHash '${currentBlock.prevHash}' doesn't match Block #${previousBlock.index} hash '${previousBlock.hash}'`);
            return false; 
        }

        // 3. Re-calculate hash to check for data tampering
        const recalculatedHash = createBlockHash({
            index: currentBlock.index,
            prevHash: currentBlock.prevHash,
            timestamp: currentBlock.timestamp,
            userId: currentBlock.userId,
            actionType: currentBlock.actionType,
            points: currentBlock.points,
            metadata: currentBlock.metadata
        });

        if (currentBlock.hash !== recalculatedHash) {
            console.error(`Data Tampering at Index ${currentBlock.index}`);
            console.log("Stored Hash:", currentBlock.hash);
            console.log("Calculated:", recalculatedHash);
            return false; 
        }
    }
    return true;
};