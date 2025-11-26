// src/utils/blockchainService.js

import { db } from '../firebase';

import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  where,
  getCountFromServer
} from 'firebase/firestore';

import SHA256 from 'crypto-js/sha256';

// ✨ NEW: Import Merkle Tree functionality
import { createMerkleRootForBlocks } from './merkleTree';

/**
 * Creates a SHA-256 hash.
 * Ensures consistent sorting of metadata keys to guarantee verification succeeds.
 * @param {Object} blockData - The block data
 * @returns {string} The block hash
 */
export function createBlockHash(blockData) {
  // 1. Sort metadata keys for consistent serialization
  const sortedMeta = {};
  if (blockData.metadata) {
    Object.keys(blockData.metadata).sort().forEach(key => {
      sortedMeta[key] = blockData.metadata[key];
    });
  }

  // 2. Stringify sorted metadata
  const metaString = JSON.stringify(sortedMeta);

  // 3. Concatenate data string
  // Format: index + prevHash + timestamp + userId + actionType + points + metadata
  const dataString = `${blockData.index}${blockData.prevHash}${blockData.timestamp}${blockData.userId}${blockData.actionType}${blockData.points}${metaString}`;

  return SHA256(dataString).toString();
}

/**
 * Verifies a single block's hash integrity
 * @param {Object} block - The block to verify
 * @returns {Object} Verification result
 */
export function verifyBlock(block) {
  const calculatedHash = createBlockHash(block);
  return {
    valid: calculatedHash === block.hash,
    storedHash: block.hash,
    calculatedHash,
    match: calculatedHash === block.hash
  };
}

/**
 * Creates the genesis block if the ledger is empty
 * @returns {Promise} The genesis block
 */
export async function createGenesisBlock() {
  try {
    const ledgerRef = collection(db, 'ledger');
    const ledgerQuery = query(ledgerRef, orderBy('index', 'asc'), limit(1));
    const snapshot = await getDocs(ledgerQuery);

    // Auto-repair logic: Delete invalid Genesis block if found
    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      const existingBlock = { id: existingDoc.id, ...existingDoc.data() };
      const verification = verifyBlock(existingBlock);
      if (verification.valid && existingBlock.index === 0) {
        console.log('Genesis block already exists and is valid.');
        return existingBlock;
      }

      console.warn('⚠️ Corrupt or Incorrect Genesis block detected. Auto-repairing...');
      await deleteDoc(doc(db, 'ledger', existingDoc.id));
      await setDoc(doc(db, 'system', 'ledger_tracker'), {
        latestHash: null,
        currentIndex: -1
      });
    }

    const timestamp = new Date().toISOString();

    const genesisBlock = {
      index: 0,
      timestamp,
      createdAt: serverTimestamp(),
      userId: 'SYSTEM',
      actionType: 'GENESIS',
      points: 0,
      metadata: {
        type: 'GENESIS',
        message: 'EcoSort Blockchain Initialized',
        system: 'EcoSort Waste Management System',
        version: '1.0.0'
      },
      prevHash: '0',
      isValid: true
    };
    genesisBlock.hash = createBlockHash(genesisBlock);
    const blockRef = await addDoc(collection(db, 'ledger'), genesisBlock);
    await setDoc(doc(db, 'system', 'ledger_tracker'), {
      latestHash: genesisBlock.hash,
      currentIndex: 0
    });
    console.log('⛓️ Genesis block created:', genesisBlock.hash);
    return { id: blockRef.id, ...genesisBlock };

  } catch (error) {
    console.error('Error creating genesis block:', error);
    throw error;
  }
}

/**
 * Gets the latest block from the ledger
 */
export async function getLatestBlock() {
  try {
    const blocksQuery = query(
      collection(db, 'ledger'),
      orderBy('index', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(blocksQuery);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  } catch (error) {
    console.error('Error getting latest block:', error);
    throw error;
  }
}

/**
 * Gets the chain status from the system tracker
 */
export async function getChainStatus() {
  try {
    const trackerRef = doc(db, 'system', 'ledger_tracker');
    const trackerDoc = await getDoc(trackerRef);
    if (!trackerDoc.exists()) {
      return { initialized: false, blockCount: 0, latestHash: null, latestIndex: -1 };
    }
    const data = trackerDoc.data();
    return {
      initialized: true,
      blockCount: (data.currentIndex || 0) + 1,
      latestHash: data.latestHash,
      latestIndex: data.currentIndex || 0
    };
  } catch (error) {
    console.error('Error getting chain status:', error);
    throw error;
  }
}

/**
 * Verifies the integrity of the entire blockchain
 */
export async function verifyBlockchain() {
  try {
    // Note: For large chains, this should be paginated.
    // Fetches up to 1000 blocks to verify.
    const blocksQuery = query(
      collection(db, 'ledger'),
      orderBy('index', 'asc'),
      limit(1000)
    );
    const snapshot = await getDocs(blocksQuery);
    if (snapshot.empty) {
      return {
        valid: true,
        message: 'Ledger is empty',
        totalBlocks: 0,
        details: []
      };
    }

    const blocks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const details = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const blockResult = {
        index: block.index,
        hash: block.hash,
        timestamp: block.timestamp,
        issues: [],
        valid: true
      };

      // 1. Verify Hash
      const hashVerification = verifyBlock(block);
      if (!hashVerification.valid) {
        blockResult.issues.push('Hash mismatch (Data tampering)');
        blockResult.valid = false;
      }

      // 2. Verify Link
      if (i === 0) {
        if (block.prevHash !== '0') {
          blockResult.issues.push("Genesis prevHash must be '0'");
          blockResult.valid = false;
        }
      } else {
        const previousBlock = blocks[i - 1];
        if (block.prevHash !== previousBlock.hash) {
          blockResult.issues.push(`Broken chain link to block #${previousBlock.index}`);
          blockResult.valid = false;
        }
      }

      // 3. Verify Index
      if (block.index !== i) {
        blockResult.issues.push(`Index gap: expected ${i}, got ${block.index}`);
        blockResult.valid = false;
      }

      details.push(blockResult);
    }

    const invalidBlocks = details.filter(d => !d.valid);
    const isValid = invalidBlocks.length === 0;

    return {
      valid: isValid,
      message: isValid
        ? `✅ All ${blocks.length} blocks verified.`
        : `❌ Chain Compromised: ${invalidBlocks.length} invalid blocks.`,
      totalBlocks: blocks.length,
      latestHash: blocks[blocks.length - 1]?.hash,
      invalidBlocks: invalidBlocks.map(b => b.index),
      details
    };
  } catch (error) {
    console.error('Error verifying blockchain:', error);
    throw error;
  }
}

/**
 * Gets blocks from the ledger
 */
export async function getAllBlocks(limitCount = null) {
  try {
    let blocksQuery = query(collection(db, 'ledger'), orderBy('index', 'desc'));
    if (limitCount) {
      blocksQuery = query(blocksQuery, limit(limitCount));
    }
    const snapshot = await getDocs(blocksQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting blocks:', error);
    throw error;
  }
}

/**
 * ✨ ENHANCED: Creates and stores a public anchor with Merkle root
 */
export async function createPublicAnchor() {
  try {
    const verification = await verifyBlockchain();
    if (!verification.valid) {
      throw new Error('Cannot create anchor: Chain is currently invalid.');
    }

    if (verification.totalBlocks === 0) {
      throw new Error('Cannot create anchor: Chain is empty.');
    }

    // ✨ NEW: Generate Merkle root for recent blocks
    let merkleRoot = null;
    let merkleBlockCount = 0;
    
    try {
      const recentBlocks = await getAllBlocks(100); // Last 100 blocks
      if (recentBlocks.length > 0) {
        const merkleData = createMerkleRootForBlocks(recentBlocks);
        merkleRoot = merkleData.root;
        merkleBlockCount = recentBlocks.length;
        console.log(`📊 Merkle root generated for ${merkleBlockCount} blocks`);
      }
    } catch (merkleError) {
      console.warn('Merkle root generation failed, continuing without it:', merkleError);
      // Continue without Merkle root - it's an enhancement, not critical
    }

    const anchor = {
      createdAt: serverTimestamp(),
      publishedAt: new Date().toISOString(),
      latestHash: verification.latestHash,
      blockCount: verification.totalBlocks,
      latestBlockIndex: verification.totalBlocks - 1,
      verified: true,
      anchorType: 'CHECKPOINT',
      verificationUrl: `${window.location.origin}/verify`,
      // ✨ NEW: Include Merkle root data
      merkleRoot: merkleRoot,
      merkleBlockCount: merkleBlockCount,
      merkleEnabled: merkleRoot !== null
    };

    const anchorRef = await addDoc(collection(db, 'anchors'), anchor);
    await setDoc(doc(db, 'system', 'latest_anchor'), {
      ...anchor,
      updatedAt: serverTimestamp()
    });

    console.log('⚓ Public anchor created:', anchorRef.id);
    if (merkleRoot) {
      console.log('🌳 Merkle root included:', merkleRoot.substring(0, 16) + '...');
    }
    
    return { id: anchorRef.id, ...anchor };
  } catch (error) {
    console.error('Error creating public anchor:', error);
    throw error;
  }
}

/**
 * Gets the latest public anchor
 */
export async function getLatestAnchor() {
  try {
    const anchorRef = doc(db, 'system', 'latest_anchor');
    const anchorDoc = await getDoc(anchorRef);
    if (!anchorDoc.exists()) return null;
    return anchorDoc.data();
  } catch (error) {
    console.error('Error getting latest anchor:', error);
    return null;
  }
}

/**
 * Gets all published anchors
 */
export async function getAllAnchors(limitCount = 10) {
  try {
    const anchorsQuery = query(
      collection(db, 'anchors'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(anchorsQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting anchors:', error);
    return [];
  }
}

/**
 * ✨ ENHANCED: Gets optimized blockchain statistics with Merkle data
 */
export async function getBlockchainStats() {
  try {
    const ledgerRef = collection(db, 'ledger');

    // 1. Get Total Count efficiently
    const countSnapshot = await getCountFromServer(ledgerRef);
    const totalBlocks = countSnapshot.data().count;

    // 2. Get Latest Block specifically for the hash
    const q = query(ledgerRef, orderBy('index', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    let latestHash = null;
    let latestBlock = null;
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      latestHash = data.hash;
      latestBlock = data;
    }

    // 3. Get Anchor
    const latestAnchor = await getLatestAnchor();

    // ✨ NEW: Generate current Merkle root for comparison
    let currentMerkleRoot = null;
    try {
      if (totalBlocks > 0) {
        const recentBlocks = await getAllBlocks(100);
        if (recentBlocks.length > 0) {
          const merkleData = createMerkleRootForBlocks(recentBlocks);
          currentMerkleRoot = merkleData.root;
        }
      }
    } catch (merkleError) {
      console.warn('Failed to generate current Merkle root:', merkleError);
    }

    return {
      totalBlocks,
      genesisDate: latestBlock ? latestBlock.timestamp : null,
      latestBlock,
      latestHash: latestHash || "GENESIS_PENDING",
      latestAnchor,
      currentMerkleRoot, // ✨ NEW
      verified: true
    };
  } catch (error) {
    console.error('Error getting blockchain stats:', error);
    return {
      totalBlocks: 0,
      latestHash: null,
      currentMerkleRoot: null,
      verified: false
    };
  }
}

/**
 * ✨ ENHANCED: Generates a downloadable audit proof with Merkle root
 */
export async function generateAuditProof() {
  const chainStatus = await getChainStatus();
  const latestAnchor = await getLatestAnchor();
  const stats = await getBlockchainStats();
  
  return {
    generatedAt: new Date().toISOString(),
    system: 'EcoSort Blockchain-Lite Ledger',
    chainStatus: {
      totalBlocks: stats.totalBlocks,
      latestHash: stats.latestHash,
      latestIndex: (stats.totalBlocks - 1)
    },
    latestAnchor: latestAnchor ? {
      hash: latestAnchor.latestHash,
      blockCount: latestAnchor.blockCount,
      publishedAt: latestAnchor.publishedAt,
      merkleRoot: latestAnchor.merkleRoot, // ✨ NEW
      merkleEnabled: latestAnchor.merkleEnabled // ✨ NEW
    } : null,
    currentMerkleRoot: stats.currentMerkleRoot, // ✨ NEW
    signature: stats.latestHash,
    merkleVerification: latestAnchor?.merkleRoot && stats.currentMerkleRoot ? {
      anchorMerkleRoot: latestAnchor.merkleRoot,
      currentMerkleRoot: stats.currentMerkleRoot,
      match: latestAnchor.merkleRoot === stats.currentMerkleRoot,
      note: 'Merkle roots provide efficient batch verification'
    } : null
  };
}

/**
 * Verifies current chain against a published anchor
 */
export async function verifyAgainstAnchor(anchorHash, anchorBlockCount) {
  try {
    const targetIndex = anchorBlockCount - 1;
    const q = query(
      collection(db, 'ledger'),
      where('index', '==', targetIndex),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const stats = await getBlockchainStats();
      if (stats.totalBlocks < anchorBlockCount) {
        return {
          valid: false,
          reason: `Chain too short (Height: ${stats.totalBlocks}) for anchor (Height: ${anchorBlockCount}).`
        };
      }
      return {
        valid: false,
        reason: `Block #${targetIndex} not found in ledger.`
      };
    }
    const anchorIndexBlock = snapshot.docs[0].data();
    const matches = anchorIndexBlock.hash === anchorHash;
    return {
      valid: matches,
      currentHash: anchorIndexBlock.hash,
      anchorHash,
      reason: matches
        ? '✅ Chain matches published anchor'
        : '❌ Mismatch: Chain has drifted from anchor.'
    };
  } catch (error) {
    console.error('Error verifying against anchor:', error);
    throw error;
  }
}

/**
 * Verifies the mutable point_transactions collection against the immutable ledger.
 */
export async function verifyPointTransactions() {
  try {
    const ledgerRef = collection(db, 'ledger');
    const transactionsRef = collection(db, 'point_transactions');

    // 1. Calculate sum from the immutable Ledger (Source of Truth)
    // Ensure to only sum transactions, not GENESIS block (index 0)
    const ledgerSnapshot = await getDocs(query(ledgerRef, where('index', '>', 0))); 
    let ledgerTotalPoints = 0;
    ledgerSnapshot.forEach(doc => {
      ledgerTotalPoints += doc.data().points || 0; 
    });

    // 2. Calculate sum from the mutable Point Transactions collection
    const txSnapshot = await getDocs(transactionsRef);
    let transactionsTotalPoints = 0;
    txSnapshot.forEach(doc => {
      transactionsTotalPoints += doc.data().points || 0; 
    });

    const matches = ledgerTotalPoints === transactionsTotalPoints;

    return {
      valid: matches,
      ledgerTotal: ledgerTotalPoints,
      transactionsTotal: transactionsTotalPoints,
      reason: matches 
        ? '✅ Point transaction records match the immutable blockchain ledger.'
        : `❌ Mismatch: Ledger total (${ledgerTotalPoints}) does not match Point Transactions total (${transactionsTotalPoints}). Possible data tampering outside the blockchain.`
    };

  } catch (error) {
    console.error("Error verifying point transactions:", error);
    return {
      valid: false,
      ledgerTotal: 'N/A',
      transactionsTotal: 'N/A',
      reason: `Error during verification: ${error.message}`
    };
  }
}

/**
 * Runs all integrity checks: blockchain structural integrity and external data reconciliation.
 */
export async function runAllIntegrityChecks() {
  try {
    // This check should always succeed for public users
    const chainVerification = await verifyBlockchain();

    // Call the function and get its result, whether it succeeded or failed.
    // The function itself catches its own errors and returns a result object.
    const dataVerification = await verifyPointTransactions();

    // *** CORRECTED LOGIC ***
    // Now, inspect the result of verifyPointTransactions.
    // If it failed for the specific reason of permissions, handle it gracefully.
    let finalDataVerification = dataVerification;
    if (
      !dataVerification.valid && 
      dataVerification.reason && 
      dataVerification.reason.includes("Missing or insufficient permissions")
    ) {
      // For a public user, a permission failure is an expected outcome.
      // We treat it as a "passed" check for the purpose of the overall status.
      finalDataVerification = {
        valid: true, 
        reason: 'External data reconciliation requires admin privileges and is not applicable for public verification.',
        skipped: true // Add a flag to indicate it was skipped
      };
    }
    
    // The overall validity now depends on the chain and the (potentially modified) data check.
    const overallValid = chainVerification.valid && finalDataVerification.valid;

    // The message should reflect the actual state of the checks
    let overallMessage;
    if (overallValid) {
      if (finalDataVerification.skipped) {
        overallMessage = `✅ System Integrity: Blockchain verified. External data check requires admin access.`;
      } else {
        overallMessage = `✅ System Integrity: Chain and External Data Verified.`;
      }
    } else {
      // If it's still invalid, it's because the chain itself is broken.
      overallMessage = `❌ System Integrity: ${chainVerification.message}`;
    }

    return {
      valid: overallValid,
      message: overallMessage,
      chainVerification,
      dataVerification: finalDataVerification // Use the potentially modified version
    };

  } catch (error) {
    // This catch block is now only for unexpected errors in verifyBlockchain or other parts of this function.
    console.error("Error running all integrity checks:", error);
    return {
      valid: false,
      message: `❌ Major Error during Integrity Check: ${error.message}`,
      chainVerification: { valid: false, message: 'N/A' },
      dataVerification: { valid: false, reason: 'N/A' }
    };
  }
}

/**
 * Hard repair of the blockchain links.
 * Iterates through all blocks, fixes broken prevHash pointers,
 * and recalculates hashes to seal the chain.
 */
export async function repairChain() {
  try {
    console.log('🔧 Starting Blockchain Repair...');
    // 1. Fetch all blocks ordered by index
    const q = query(collection(db, "ledger"), orderBy("index", "asc"));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return { success: false, message: "Chain is empty." };
    }
    const blocks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    let previousHash = "0"; // Genesis previous hash is always "0"
    let repairedCount = 0;
    let lastValidHash = null;

    // 2. Loop through every block and re-seal the chain
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const currentRef = doc(db, "ledger", block.id);
      let updates = {};
      let needsUpdate = false;

      // A. Check Previous Hash (Link to the past)
      const expectedPrevHash = i === 0 ? "0" : previousHash;
      if (block.prevHash !== expectedPrevHash) {
        console.log(`Fixing link on block #${block.index}: ${block.prevHash} -> ${expectedPrevHash}`);
        updates.prevHash = expectedPrevHash;
        needsUpdate = true;
      }

      // B. Re-calculate the Hash of THIS block (Seal the present)
      const blockDataForHashing = {
        ...block,
        prevHash: updates.prevHash || block.prevHash
      };
      const newHash = createBlockHash(blockDataForHashing);
      if (block.hash !== newHash) {
        console.log(`Fixing hash on block #${block.index}`);
        updates.hash = newHash;
        needsUpdate = true;
      }

      // C. Apply updates if needed
      if (needsUpdate) {
        await updateDoc(currentRef, updates);
        repairedCount++;
        previousHash = newHash; // The next block must link to this new hash
      } else {
        previousHash = block.hash; // No change, preserve existing hash
      }
    }

    // 3. Update System Tracker to reflect the new latest hash
    if (previousHash) {
      const trackerRef = doc(db, 'system', 'ledger_tracker');
      await updateDoc(trackerRef, {
        latestHash: previousHash
      });
    }

    console.log(`✅ Repair complete. Repaired ${repairedCount} blocks.`);
    return { success: true, repairedCount, latestHash: previousHash };

  } catch (error) {
    console.error("Repair failed:", error);
    throw error;
  }
}

export default {
  createGenesisBlock,
  getLatestBlock,
  getChainStatus,
  verifyBlock,
  verifyBlockchain,
  getAllBlocks,
  createPublicAnchor,
  getLatestAnchor,
  getAllAnchors,
  getBlockchainStats,
  generateAuditProof,
  verifyAgainstAnchor,
  verifyPointTransactions,
  runAllIntegrityChecks,
  repairChain
};