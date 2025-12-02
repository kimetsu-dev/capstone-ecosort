// src/pages/AdminPanel/BlockchainTab.js

import React, { useEffect, useState } from 'react';

import { 
  createGenesisBlock,
  getChainStatus,
  // verifyBlockchain, // Removed unused import based on context
  runAllIntegrityChecks, 
  getAllBlocks,
  createPublicAnchor,
  getAllAnchors,
  generateAuditProof,
  repairChain 
} from '../../utils/blockchainService';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Hash, 
  Clock, 
  Loader2, 
  Anchor, 
  // Globe, // Removed unused
  CheckCircle2, 
  // XCircle, // Removed unused
  RefreshCw, 
  FileText, 
  Copy, 
  Check, 
  // Download, // Removed unused
  Plus, 
  Wrench,
  Database,
  Recycle, // Added for Waste Submissions
  Gift     // Added for Redemptions
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const BlockchainTab = () => {
  const { isDark } = useTheme();
  const [blocks, setBlocks] = useState([]);
  const [anchors, setAnchors] = useState([]);
  const [chainStatus, setChainStatus] = useState({ valid: null, message: "Initializing...", blockCount: 0, latestIndex: -1, latestHash: null, initialized: false });
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [creatingGenesis, setCreatingGenesis] = useState(false);
  const [latestHash, setLatestHash] = useState(null);
  const [blockCount, setBlockCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState(null); 
  const [externalDataStatus, setExternalDataStatus] = useState(null); 
  const [repairResult, setRepairResult] = useState(null);

  // Helper function for display
  const formatTimestamp = (timestamp) => {
    if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleString();
    }
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  // Function to load the chain's integrity status
  const loadChainStatus = async (initial = false) => {
    setLoading(true);
    setRepairResult(null); 
    try {
      // 1. Get basic status
      const status = await getChainStatus(); //
      setChainStatus(status);
      setLatestHash(status.latestHash);
      setBlockCount(status.blockCount);

      if (status.initialized) {
        // 2. Run full integrity check (Structural + External Data Reconciliation)
        const fullVerification = await runAllIntegrityChecks(); //

        setChainStatus({ 
          ...status, 
          valid: fullVerification.valid, 
          message: fullVerification.message 
        });

        // Store detailed results
        setVerificationDetails(fullVerification.chainVerification); 
        setExternalDataStatus(fullVerification.dataVerification); //

        // 3. Load latest blocks and anchors
        const latestBlocks = await getAllBlocks();
        setBlocks(latestBlocks);
        const allAnchors = await getAllAnchors();
        setAnchors(allAnchors);
      } else {
        setVerificationDetails({ valid: false, message: "Blockchain is not initialized (No Genesis Block)." });
        setExternalDataStatus(null); 
        setBlocks([]);
        setAnchors([]);
      }

    } catch (error) {
      console.error("Error loading chain status:", error);
      setChainStatus(prev => ({ ...prev, valid: false, message: `Error: ${error.message}` }));
      setVerificationDetails({ valid: false, message: `Error during structural verification: ${error.message}` });
      setExternalDataStatus({ valid: false, reason: `Error during external data verification: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGenesis = async () => {
    setCreatingGenesis(true);
    try {
        await createGenesisBlock();
        await loadChainStatus();
    } catch (error) {
        alert("Failed to create Genesis Block: " + error.message);
    } finally {
        setCreatingGenesis(false);
    }
  }

  const handlePublishAnchor = async () => {
    setPublishing(true);
    try {
        const result = await createPublicAnchor();
        alert(`Anchor Published! Hash: ${result.latestHash.substring(0, 10)}...`);
        await loadChainStatus();
    } catch (error) {
        alert("Failed to publish anchor: " + error.message);
    } finally {
        setPublishing(false);
    }
  }

  const handleGenerateAuditProof = async () => {
    try {
      const proof = await generateAuditProof();
      const blob = new Blob([JSON.stringify(proof, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ecosort-audit-proof-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to generate audit proof: " + error.message);
    }
  }
  
  const handleRepairChain = async () => {
    if (window.confirm("WARNING: This will attempt to correct prevHash links and re-calculate block hashes for the ENTIRE chain. Only run this if integrity checks fail. Continue?")) {
        setLoading(true);
        try {
            const result = await repairChain();
            setRepairResult(result);
            alert(`Chain Repair Complete! Repaired ${result.repairedCount} blocks. New Latest Hash: ${result.latestHash.substring(0, 10)}...`);
            await loadChainStatus();
        } catch (error) {
            alert("Chain Repair Failed: " + error.message);
        } finally {
            setLoading(false);
        }
    }
  }

  useEffect(() => {
    loadChainStatus(true);
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className={`p-6 ${isDark ? "text-gray-100" : "text-gray-800"}`}>
      <h2 className="text-3xl font-bold mb-6">Blockchain Admin Panel</h2>

      {/* Main Controls Row */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Refresh Button */}
        <button
          onClick={loadChainStatus}
          disabled={loading || publishing || creatingGenesis}
          className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
            loading
              ? isDark ? "bg-gray-700 text-gray-400" : "bg-gray-300 text-gray-600"
              : isDark ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "bg-indigo-500 hover:bg-indigo-600 text-white"
          }`}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          Refresh Status
        </button>

        {/* Generate Genesis Block */}
        {!chainStatus.initialized && (
            <button
              onClick={handleCreateGenesis}
              disabled={loading || creatingGenesis}
              className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                creatingGenesis
                  ? isDark ? "bg-gray-700 text-gray-400" : "bg-gray-300 text-gray-600"
                  : isDark ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }`}
            >
              {creatingGenesis ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Create Genesis Block
            </button>
        )}
        
        {/* Publish Anchor Button */}
        {chainStatus.initialized && (
            <button
                onClick={handlePublishAnchor}
                disabled={loading || publishing}
                className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                    publishing
                    ? isDark ? "bg-gray-700 text-gray-400" : "bg-gray-300 text-gray-600"
                    : isDark ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-purple-500 hover:bg-purple-600 text-white"
                }`}
            >
                {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Anchor className="w-5 h-5" />}
                Publish New Anchor
            </button>
        )}
        
        {/* Generate Audit Proof */}
        {chainStatus.initialized && (
            <button
                onClick={handleGenerateAuditProof}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                    loading
                    ? isDark ? "bg-gray-700 text-gray-400" : "bg-gray-300 text-gray-600"
                    : isDark ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"
                }`}
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                Generate Audit Proof (JSON)
            </button>
        )}

        {/* Repair Chain Button */}
        {chainStatus.initialized && verificationDetails && !verificationDetails.valid && (
             <button
                onClick={handleRepairChain}
                disabled={loading}
                className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors ${
                    loading
                    ? isDark ? "bg-gray-700 text-gray-400" : "bg-gray-300 text-gray-600"
                    : isDark ? "bg-red-600 hover:bg-red-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"
                }`}
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wrench className="w-5 h-5" />}
                Repair Chain
            </button>
        )}
      </div>
      
      {/* Repair Result Status */}
      {repairResult && (
        <div className={`mt-4 p-4 rounded-xl shadow-lg ${
            repairResult.success 
                ? isDark ? "bg-emerald-900/30 border border-emerald-700 text-emerald-300" : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : isDark ? "bg-red-900/30 border border-red-700 text-red-300" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
            <p className="font-semibold">{repairResult.success ? `✅ Repair Successful!` : `❌ Repair Failed`}</p>
            <p className="text-sm">Repaired Blocks: {repairResult.repairedCount}. Latest Hash: {repairResult.latestHash.substring(0, 15)}...</p>
        </div>
      )}

      {/* Chain Status Card */}
      <div className={`mt-6 p-6 rounded-xl shadow-2xl ${isDark ? "bg-gray-800" : "bg-white border border-gray-200"}`}>
        <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Database className="w-6 h-6" />
            Chain Overview
        </h3>
        
        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Status</p>
                <p className={`font-bold text-lg ${
                    chainStatus.initialized 
                    ? isDark ? "text-emerald-400" : "text-emerald-600"
                    : isDark ? "text-red-400" : "text-red-600"
                }`}>
                    {chainStatus.initialized ? "Initialized" : "Uninitialized"}
                </p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Total Blocks</p>
                <p className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
                    {blockCount.toLocaleString()}
                </p>
            </div>
            <div className={`p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-100"}`}>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>Latest Index</p>
                <p className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-800"}`}>
                    {chainStatus.latestIndex > -1 ? `#${chainStatus.latestIndex.toLocaleString()}` : 'N/A'}
                </p>
            </div>
        </div>
        
        {/* Latest Hash */}
        {latestHash && (
          <div className="mb-4">
            <p className={`text-sm font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Latest Block Hash
            </p>
            <div className="flex items-center gap-2">
                <code className={`text-sm break-all font-mono p-2 rounded-lg ${isDark ? "bg-black/20 text-indigo-300" : "bg-gray-100 text-indigo-600"}`}>
                    {latestHash}
                </code>
                <button
                    onClick={() => copyToClipboard(latestHash)}
                    className={`p-2 rounded-lg transition-colors ${
                        isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    } ${copied ? (isDark ? "text-emerald-400" : "text-emerald-600") : (isDark ? "text-gray-400" : "text-gray-600")}`}
                    title="Copy Hash"
                >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
          </div>
        )}

        {/* Overall Status and Actions Row */}
        <div className="flex flex-wrap gap-4 mt-4">
            {/* 1. Overall Blockchain Structural Integrity Card */}
            {verificationDetails && (
                <div 
                    className={`flex-1 p-4 rounded-xl shadow-lg transition-colors border ${
                        verificationDetails.valid
                            ? isDark ? "bg-emerald-900/30 border-emerald-700" : "bg-emerald-50 border-emerald-200"
                            : isDark ? "bg-red-900/30 border-red-700" : "bg-red-50 border-red-200"
                    }`}
                >
                    <div className="flex items-start gap-4">
                        {verificationDetails.valid 
                            ? <ShieldCheck className={`w-6 h-6 flex-shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                            : <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${isDark ? "text-red-400" : "text-red-600"}`} />}
                        <div>
                            <h3 className={`font-bold text-lg mb-1 ${isDark ? "text-white" : "text-gray-800"}`}>
                                Blockchain Structural Integrity
                            </h3>
                            <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                                {verificationDetails.message}
                            </p>
                            {!verificationDetails.valid && (
                                <p className="text-xs mt-1 italic">
                                    Click 'Repair Chain' to attempt an automated fix.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* 2. External Data Integrity Card (UPDATED) */}
            {externalDataStatus && (
                <div 
                    className={`flex-1 p-4 rounded-xl shadow-lg transition-colors border ${
                        externalDataStatus.valid
                            ? isDark ? "bg-emerald-900/30 border-emerald-700" : "bg-emerald-50 border-emerald-200"
                            : isDark ? "bg-red-900/30 border-red-700" : "bg-red-50 border-red-200"
                    }`}
                >
                    <div className="flex items-start gap-4">
                        {externalDataStatus.valid 
                            ? <CheckCircle2 className={`w-6 h-6 flex-shrink-0 ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                            : <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${isDark ? "text-red-400" : "text-red-600"}`} />}
                        <div>
                            <h3 className={`font-bold text-lg mb-1 ${isDark ? "text-white" : "text-gray-800"}`}>
                                External Data Integrity
                            </h3>
                            {/* NEW: Explicitly list monitored collections */}
                            <div className="flex flex-wrap gap-2 mb-2">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${isDark ? "bg-blue-900/40 text-blue-300 border-blue-700" : "bg-blue-100 text-blue-700 border-blue-200"}`}>
                                    <Database className="w-3 h-3 mr-1"/> Transactions
                                </span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${isDark ? "bg-green-900/40 text-green-300 border-green-700" : "bg-green-100 text-green-700 border-green-200"}`}>
                                    <Recycle className="w-3 h-3 mr-1"/> Waste
                                </span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${isDark ? "bg-orange-900/40 text-orange-300 border-orange-700" : "bg-orange-100 text-orange-700 border-orange-200"}`}>
                                    <Gift className="w-3 h-3 mr-1"/> Redemptions
                                </span>
                            </div>

                            <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                                {externalDataStatus.reason} 
                            </p>
                            {!externalDataStatus.valid && (
                                <p className="text-xs mt-1">
                                    <strong className={isDark ? "text-red-300" : "text-red-800"}>Ledger Total: {externalDataStatus.ledgerTotal}</strong> | 
                                    <strong className={isDark ? "text-red-300" : "text-red-800"}> Ext. Total: {externalDataStatus.transactionsTotal}</strong>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        
        {/* Global Integrity Message */}
        {chainStatus.valid !== null && (
            <div className={`mt-4 p-4 rounded-xl border-l-4 ${
                chainStatus.valid 
                ? isDark ? "bg-emerald-900/20 border-emerald-500 text-emerald-300" : "bg-emerald-50 border-emerald-500 text-emerald-800"
                : isDark ? "bg-red-900/20 border-red-500 text-red-300" : "bg-red-50 border-red-500 text-red-800"
            }`}>
                <p className="font-semibold">{chainStatus.valid ? "System Status: OK" : "System Status: ALERT"}</p>
                <p className="text-sm">{chainStatus.message}</p>
            </div>
        )}

      </div>
      
      {/* Anchors Section */}
      <div className={`mt-8 p-6 rounded-xl shadow-2xl ${isDark ? "bg-gray-800" : "bg-white border border-gray-200"}`}>
        <h3 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Anchor className="w-6 h-6" />
            Public Anchors
        </h3>
        
        {anchors.length === 0 && !loading ? (
            <p className={`text-center py-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                No public anchors have been published yet.
            </p>
        ) : (
          <div className="space-y-3">
            {anchors.map((anchor, idx) => (
              <div 
                key={anchor.id}
                className={`p-4 rounded-lg border transition-colors ${idx === 0 ? isDark ? "bg-purple-900/30 border-purple-800" : "bg-purple-50 border-purple-200" : isDark ? "bg-gray-700/50 border-gray-600" : "bg-gray-50 border-gray-100"}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {idx === 0 && <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDark ? "bg-purple-700 text-purple-200" : "bg-purple-200 text-purple-800"}`}>LATEST</span>}
                      <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}><Clock className="w-3 h-3 inline mr-1" />{anchor.publishedAt ? new Date(anchor.publishedAt).toLocaleString() : "Unknown"}</span>
                    </div>
                    <code className={`text-xs font-mono ${isDark ? "text-indigo-300" : "text-indigo-600"}`}>{anchor.latestHash}</code>
                  </div>
                  <div className={`flex items-center gap-4 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    <span><strong className={isDark ? "text-white" : "text-gray-800"}>{anchor.blockCount}</strong> blocks</span>
                    <span>Index: <strong className={isDark ? "text-white" : "text-gray-800"}>#{anchor.latestBlockIndex}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className={`mt-8 p-4 rounded-xl border-l-4 ${
        isDark ? "bg-blue-900/20 border-blue-500 text-blue-300" : "bg-blue-50 border-blue-500 text-blue-800"
      }`}>
        <h4 className="font-bold mb-1">How This Works</h4>
        <p className={`text-sm ${isDark ? "text-blue-200" : "text-blue-700"}`}>
          Every transaction creates a cryptographic hash linked to the previous one. Publishing an "anchor" 
          saves the current state publicly. Anyone can verify the ledger by recalculating hashes.
        </p>
      </div>
      
      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loader2 className="w-10 h-10 text-white animate-spin" />
        </div>
      )}
    </div>
  );
};

export default BlockchainTab;