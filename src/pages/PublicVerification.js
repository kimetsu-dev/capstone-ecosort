// src/pages/PublicVerification.js
import React, { useState, useEffect } from 'react';
import { 
  runAllIntegrityChecks, 
  getLatestAnchor, 
  getBlockchainStats, 
  getAllBlocks,
  getAllAnchors,
  verifyAgainstAnchor 
} from '../utils/blockchainService';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Hash, 
  Clock, 
  Loader2,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Anchor,
  Box,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Database 
} from 'lucide-react';

function PublicVerification() {
  // Data State
  const [verification, setVerification] = useState(null); // Full result from runAllIntegrityChecks
  const [stats, setStats] = useState(null);
  const [latestAnchor, setLatestAnchor] = useState(null);
  const [anchorHistory, setAnchorHistory] = useState([]); // List of all public anchors
  const [blocks, setBlocks] = useState([]); // The actual ledger blocks
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [anchorVerification, setAnchorVerification] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [activeTab, setActiveTab] = useState('status'); // 'status', 'ledger', 'anchors'

  useEffect(() => {
    loadPublicData();
  }, []);

  const loadPublicData = async () => {
    setLoading(true);
    try {
      // 1. Run all integrity checks. The service now handles permission errors correctly.
      const fullVerification = await runAllIntegrityChecks();
      setVerification(fullVerification);

      // 2. Fetch all other required data in parallel
      const [statsData, latestAnchorData, blocksData, anchorsList] = await Promise.all([
        getBlockchainStats(),
        getLatestAnchor(),
        getAllBlocks(50), // Fetch last 50 blocks for the visual ledger
        getAllAnchors(20), // Fetch last 20 anchors for history
      ]);

      setStats(statsData);
      setLatestAnchor(latestAnchorData);
      setBlocks(blocksData);
      setAnchorHistory(anchorsList);

      // 3. Perform Anchor Verification ONLY if valid data exists
      if (latestAnchorData && statsData?.latestHash && statsData.latestHash !== "GENESIS_PENDING") {
        await handleVerifyAgainstAnchor(latestAnchorData.latestHash, latestAnchorData.blockCount);
      } else {
        // Handle edge cases (Fresh DB or No Anchors)
        setAnchorVerification({
          valid: false,
          reason: statsData?.latestHash ? 'No public anchor found yet.' : 'Waiting for blockchain initialization...',
          currentHash: statsData?.latestHash
        });
      }

    } catch (error) {
      console.error("Error loading public data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAgainstAnchor = async (anchorHash, blockCount) => {
    try {
      const result = await verifyAgainstAnchor(anchorHash, blockCount);
      setAnchorVerification(result);
    } catch (error) {
      console.error("Verification failed:", error);
      setAnchorVerification({ valid: false, reason: 'System error during verification.' });
    }
  };

  const copyHash = (hash) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleBlock = (id) => {
    setExpandedBlock(expandedBlock === id ? null : id);
  };

  // --- UI RENDERERS ---

  const renderStatusCard = () => {
    // With the backend fix, the top-level `verification.valid` is now reliable.
    const isOverallSecure = verification?.valid;

    return (
      <div className={`p-6 rounded-xl shadow-lg border-t-4 mb-8 ${isOverallSecure ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
        <div className="flex items-center space-x-4">
          {isOverallSecure ? <ShieldCheck className="w-10 h-10 text-green-600" /> : <AlertTriangle className="w-10 h-10 text-red-600" />}
          <div>
            <h3 className="text-2xl font-bold text-gray-800">{isOverallSecure ? "SYSTEM SECURE" : "INTEGRITY ALERT"}</h3>
            <p className={`text-sm ${isOverallSecure ? 'text-green-700' : 'text-red-700'}`}>
              {verification?.message || 'Verifying system status...'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderAnchorHistory = () => (
    <div className="space-y-4">
      <div className="p-4 bg-indigo-50 rounded-lg mb-6 border border-indigo-100">
        <h4 className="font-bold text-indigo-900 flex items-center gap-2">
          <Anchor className="w-5 h-5" /> What are Anchors?
        </h4>
        <p className="text-indigo-800 text-sm mt-1">
          Anchors are public "checkpoints" published by administrators. They serve as immutable proof of the ledger's state at a specific point in time.
        </p>
      </div>

      {anchorHistory.length === 0 ? (
        <div className="text-center py-10 text-gray-500">No public anchors published yet.</div>
      ) : (
        <div className="grid gap-4">
          {anchorHistory.map((anchor, idx) => (
            <div key={anchor.id || idx} className="bg-white p-4 rounded-xl shadow border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold uppercase">
                      Checkpoint #{anchor.latestBlockIndex}
                    </span>
                    <span className="text-gray-500 text-sm flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {anchor.publishedAt ? new Date(anchor.publishedAt).toLocaleString() : "Unknown Date"}
                    </span>
                  </div>
                  <code className="block bg-gray-50 p-2 rounded text-xs font-mono text-gray-600 break-all mt-2">
                    {anchor.latestHash}
                  </code>
                </div>
                <div className="text-right">
                  <span className="block text-sm text-gray-500">Documented Blocks</span>
                  <span className="text-xl font-bold text-gray-800">{anchor.blockCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderLedger = () => (
    <div className="space-y-6">
      <p className="text-gray-600 mb-4">
        This is a live, read-only view of the most recent transactions on the EcoSort blockchain.
      </p>
      
      {blocks.length === 0 ? (
         <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <Box className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Ledger is empty. Waiting for transactions...</p>
         </div>
      ) : (
        blocks.map((block, i) => (
          <div key={block.id || i} className="relative pl-0 sm:pl-4">
            {/* Connector Line (The Visual Chain) */}
            {i !== blocks.length - 1 && (
              <div className="absolute left-4 sm:left-[2.5rem] top-10 bottom-[-40px] w-1 bg-indigo-100 -z-10"></div>
            )}

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                
                {/* Block Index & Action */}
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono font-bold w-14 h-14 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <Box className="w-4 h-4 opacity-50 mb-1" />
                    <span className="text-xs">#{block.index}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${
                          block.actionType?.includes('WASTE') ? 'bg-green-100 text-green-700' :
                          block.actionType?.includes('REDEEM') ? 'bg-orange-100 text-orange-700' :
                          block.actionType === 'GENESIS' ? 'bg-purple-100 text-purple-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {block.actionType || 'SYSTEM'}
                        </span>
                        <span className="font-bold text-gray-800">{block.points} Pts</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {new Date(block.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Hash Data */}
                <div className="w-full md:w-auto bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs font-mono">
                  <div className="flex items-center gap-2 mb-1 text-gray-400">
                      <LinkIcon className="w-3 h-3" /> PREV: 
                      <span className="truncate w-32 md:w-48">{block.prevHash?.substring(0, 20)}...</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                      <Hash className="w-3 h-3" /> HASH: 
                      <span className="truncate w-32 md:w-48">{block.hash?.substring(0, 20)}...</span>
                  </div>
                </div>
              </div>

              {/* Metadata Toggle */}
              <button 
                  onClick={() => toggleBlock(block.id)}
                  className="w-full mt-3 pt-2 flex items-center justify-center gap-1 text-xs font-medium border-t border-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
              >
                  {expandedBlock === block.id ? <>Hide Details <ChevronUp className="w-3 h-3"/></> : <>View Details <ChevronDown className="w-3 h-3"/></>}
              </button>

              {/* Expanded Metadata */}
              {expandedBlock === block.id && block.metadata && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border border-gray-100">
                      {Object.entries(block.metadata).map(([key, value]) => (
                      <div key={key} className="truncate">
                          <span className="font-semibold text-gray-500 capitalize">{key}:</span> {value}
                      </div>
                      ))}
                  </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // --- MAIN RENDER ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700">Verifying Ledger Integrity...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="max-w-5xl mx-auto px-4">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Public Ledger Verification</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            EcoSort uses a transparent, immutable blockchain. Use this tool to audit transactions and verify system integrity against public anchors.
          </p>
        </div>

        {/* Global Status */}
        {renderStatusCard()}

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-xl shadow-sm inline-flex">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'status' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              System Health
            </button>
            <button
              onClick={() => setActiveTab('anchors')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'anchors' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Public Anchors
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Live Ledger
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-500">
          {activeTab === 'status' && (
            <>
              {/* Detailed Check Status Cards */}
              {verification && (
                <>
                  {/* Blockchain Integrity Card */}
                  <div className={`p-4 rounded-xl border shadow-md mt-4 ${
                      verification.chainVerification?.valid
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                  }`}>
                      <div className="flex items-center gap-4">
                          {verification.chainVerification?.valid 
                              ? <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0" />
                              : <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />}
                          <div>
                              <h4 className={`font-bold ${verification.chainVerification?.valid ? 'text-green-800' : 'text-red-800'}`}>
                                  Blockchain Integrity
                              </h4>
                              <p className="text-sm text-gray-600">
                                  {verification.chainVerification?.message || 'Loading...'}
                              </p>
                          </div>
                      </div>
                  </div>

                  {/* External Data Reconciliation Card */}
                  <div className={`p-4 rounded-xl border shadow-md mt-4 ${
                      verification.dataVerification?.valid
                          ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                  }`}>
                      <div className="flex items-center gap-4">
                          {verification.dataVerification?.valid 
                              ? <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0" />
                              : <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />}
                          <div>
                              <h4 className={`font-bold ${verification.dataVerification?.valid ? 'text-green-800' : 'text-red-800'}`}>
                                  External Data Reconciliation
                              </h4>
                              <p className="text-sm text-gray-600">
                                  {verification.dataVerification?.reason || 'Loading...'}
                              </p>
                              {!verification.dataVerification?.valid && verification.dataVerification?.ledgerTotal !== 'N/A' && (
                                  <p className="text-xs text-red-600 mt-1">
                                      Ledger Total: {verification.dataVerification.ledgerTotal} | Transactions Total: {verification.dataVerification.transactionsTotal}
                                  </p>
                              )}
                          </div>
                      </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Chain Stats */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Chain Statistics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Blocks</span>
                      <span className="text-2xl font-bold text-indigo-600">{stats?.totalBlocks}</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-gray-600">Chain Status</span>
                       <span className={`px-2 py-1 rounded text-xs font-bold ${verification?.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {verification?.valid ? 'VALID' : 'INVALID'}
                       </span>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm block mb-1">Latest Global Hash</span>
                      <div className="flex items-center gap-2">
                         <code className="bg-gray-100 p-2 rounded text-xs block w-full truncate">
                            {stats?.latestHash}
                         </code>
                         <button onClick={() => copyHash(stats?.latestHash)} className="text-gray-400 hover:text-indigo-600">
                            {copied ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4"/>}
                         </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Anchor Verification Detail */}
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Anchor Validation</h3>
                  {latestAnchor ? (
                    <div className="space-y-3">
                       <div className="flex items-center justify-between">
                          <span className="text-gray-600">Latest Anchor Index:</span>
                          <span className="font-bold">#{latestAnchor.latestBlockIndex}</span>
                       </div>
                       <div className={`p-3 rounded-lg border text-sm ${anchorVerification?.valid ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                          <div className="flex items-center gap-2 mb-2">
                             {anchorVerification?.valid 
                                ? <CheckCircle className="w-5 h-5 text-green-500" /> 
                                : <XCircle className="w-5 h-5 text-red-500" />}
                             <span className={`font-semibold ${anchorVerification?.valid ? 'text-green-700' : 'text-red-700'}`}>
                                {anchorVerification?.valid ? 'Verified' : 'Verification Failed'}
                             </span>
                          </div>
                          <p className={`text-xs ${anchorVerification?.valid ? 'text-green-600' : 'text-red-600'}`}>
                             {anchorVerification?.valid 
                               ? `The current chain state proves that it is a continuation of the anchor published on ${new Date(latestAnchor.publishedAt).toLocaleDateString()}.`
                               : anchorVerification?.reason || `MISMATCH: The current chain hash does not match the public anchor.`
                             }
                          </p>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500 italic">No public anchors published yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'anchors' && renderAnchorHistory()}
          
          {activeTab === 'ledger' && renderLedger()}
        </div>

      </div>
    </div>
  );
}

export default PublicVerification;