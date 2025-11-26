// src/utils/merkleTree.js
import SHA256 from 'crypto-js/sha256';

/**
 * Merkle Tree Implementation for EcoSort Blockchain
 * Provides efficient batch verification of transactions
 */

class MerkleTree {
  constructor(transactions) {
    this.transactions = transactions;
    this.tree = [];
    this.root = null;
    if (transactions.length > 0) {
      this.buildTree();
    }
  }

  /**
   * Hash a single transaction/data element
   */
  hashData(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return SHA256(dataString).toString();
  }

  /**
   * Combine two hashes
   */
  combineHashes(left, right) {
    return SHA256(left + right).toString();
  }

  /**
   * Build the Merkle tree from bottom up
   */
  buildTree() {
    // Level 0: Hash all transactions (leaf nodes)
    let currentLevel = this.transactions.map(tx => this.hashData(tx));
    this.tree.push([...currentLevel]);

    // Build tree levels until we reach the root
    while (currentLevel.length > 1) {
      const nextLevel = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          // Pair exists - combine both hashes
          const combined = this.combineHashes(currentLevel[i], currentLevel[i + 1]);
          nextLevel.push(combined);
        } else {
          // Odd number - duplicate the last hash
          const combined = this.combineHashes(currentLevel[i], currentLevel[i]);
          nextLevel.push(combined);
        }
      }
      
      this.tree.push(nextLevel);
      currentLevel = nextLevel;
    }

    this.root = currentLevel[0];
  }

  /**
   * Get the Merkle root
   */
  getRoot() {
    return this.root;
  }

  /**
   * Generate a proof for a specific transaction
   * Returns the sibling hashes needed to reconstruct the root
   */
  getProof(transactionIndex) {
    if (transactionIndex < 0 || transactionIndex >= this.transactions.length) {
      throw new Error('Invalid transaction index');
    }

    const proof = [];
    let currentIndex = transactionIndex;

    // Traverse from leaf to root
    for (let level = 0; level < this.tree.length - 1; level++) {
      const levelData = this.tree[level];
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < levelData.length) {
        proof.push({
          hash: levelData[siblingIndex],
          position: isRightNode ? 'left' : 'right'
        });
      }

      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verify a transaction is in the tree using its proof
   */
  verifyProof(transaction, proof, root) {
    let hash = this.hashData(transaction);

    for (const { hash: siblingHash, position } of proof) {
      if (position === 'left') {
        hash = this.combineHashes(siblingHash, hash);
      } else {
        hash = this.combineHashes(hash, siblingHash);
      }
    }

    return hash === root;
  }

  /**
   * Get tree visualization for debugging
   */
  visualize() {
    console.log('Merkle Tree Structure:');
    this.tree.forEach((level, i) => {
      console.log(`Level ${i}:`, level.map(h => h.substring(0, 8) + '...'));
    });
    console.log('Root:', this.root);
  }
}

/**
 * Create a Merkle root for a batch of blocks
 * Used for efficient batch verification in EcoSort
 */
export function createMerkleRootForBlocks(blocks) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  const tree = new MerkleTree(blocks.map(block => ({
    index: block.index,
    hash: block.hash,
    timestamp: block.timestamp,
    userId: block.userId,
    actionType: block.actionType,
    points: block.points
  })));

  return {
    root: tree.getRoot(),
    blockCount: blocks.length,
    tree: tree
  };
}

/**
 * Verify a specific block is part of a Merkle tree
 */
export function verifyBlockInMerkleTree(block, proof, merkleRoot) {
  const tree = new MerkleTree([]);
  const blockData = {
    index: block.index,
    hash: block.hash,
    timestamp: block.timestamp,
    userId: block.userId,
    actionType: block.actionType,
    points: block.points
  };
  
  return tree.verifyProof(blockData, proof, merkleRoot);
}

/**
 * Create Merkle proof for a block in a batch
 */
export function createMerkleProofForBlock(blocks, blockIndex) {
  if (blockIndex < 0 || blockIndex >= blocks.length) {
    throw new Error('Block index out of range');
  }

  const tree = new MerkleTree(blocks.map(block => ({
    index: block.index,
    hash: block.hash,
    timestamp: block.timestamp,
    userId: block.userId,
    actionType: block.actionType,
    points: block.points
  })));

  return {
    proof: tree.getProof(blockIndex),
    root: tree.getRoot(),
    blockIndex: blockIndex
  };
}

export default MerkleTree;