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
  Info,
  FileText,
  Activity,
  Database,
  Recycle, // Added for Waste Submissions icon
  Gift // Added for Redemptions icon
} from 'lucide-react';

// --- HELPER COMPONENTS ---

// A simple reusable info card to explain technical concepts
const ConceptExplainer = ({ title, icon: Icon, children }) => (
  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
    <div className="flex items-start gap-3">
      <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-0.5">
        <Icon size={18} />
      </div>
      <div>
        <h4 className="font-bold text-blue-900 text-sm mb-1">{title}</h4>
        <div className="text-blue-800 text-sm leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  </div>
);

function PublicVerification() {
  // Data State
  const [verification, setVerification] = useState(null); 
  const [stats, setStats] = useState(null);
  const [latestAnchor, setLatestAnchor] = useState(null);
  const [anchorHistory, setAnchorHistory] = useState([]); 
  const [blocks, setBlocks] = useState([]); 
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [anchorVerification, setAnchorVerification] = useState(null);
  const [copied, setCopied] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [activeTab, setActiveTab] = useState('status');

  useEffect(() => {
    loadPublicData();
  }, []);

  const loadPublicData = async () => {
    setLoading(true);
    try {
      // This function checks BOTH Chain Integrity AND Firestore Data Integrity
      const fullVerification = await runAllIntegrityChecks();
      setVerification(fullVerification);

      const [statsData, latestAnchorData, blocksData, anchorsList] = await Promise.all([
        getBlockchainStats(),
        getLatestAnchor(),
        getAllBlocks(50), 
        getAllAnchors(20), 
      ]);

      setStats(statsData);
      setLatestAnchor(latestAnchorData);
      setBlocks(blocksData);
      setAnchorHistory(anchorsList);

      if (latestAnchorData && statsData?.latestHash && statsData.latestHash !== "GENESIS_PENDING") {
        await handleVerifyAgainstAnchor(latestAnchorData.latestHash, latestAnchorData.blockCount);
      } else {
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
    const isOverallSecure = verification?.valid;

    return (
      <div className={`p-6 rounded-xl shadow-lg border-t-4 mb-8 transition-colors ${isOverallSecure ? 'border-green-500 bg-white' : 'border-red-500 bg-red-50'}`}>
        <div className="flex items-start md:items-center space-x-5">
          {isOverallSecure ? 
            <div className="p-3 bg-green-100 rounded-full">
              <ShieldCheck className="w-8 h-8 text-green-700" /> 
            </div>
            : 
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-700" />
            </div>
          }
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-bold text-gray-800">
              {isOverallSecure ? "System Integrity Verified" : "Integrity Alert Detected"}
            </h3>
            <p className="text-gray-600 mt-1">
              {isOverallSecure 
                ? "All diagnostic checks passed. The blockchain data is consistent, immutable, and matches the public records."
                : verification?.message || 'Warning: Discrepancies detected in the ledger.'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderAnchorHistory = () => (
    <div className="space-y-4">
      <ConceptExplainer title="What is an Anchor?" icon={Anchor}>
        <p>
          Think of an <strong>Anchor</strong> as a digital "Save Point" or a notarized screenshot. 
          Periodically, we publish a cryptographic summary of the entire blockchain to the public. 
          Even if someone tampered with the live database, they couldn't change these historical anchors, 
          proving that our data hasn't been altered since the anchor was created.
        </p>
      </ConceptExplainer>

      {anchorHistory.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-dashed">
          No public anchors published yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {anchorHistory.map((anchor, idx) => (
            <div key={anchor.id || idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-300 transition-all">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                      Checkpoint #{anchor.latestBlockIndex}
                    </span>
                    <span className="text-gray-500 text-sm flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {anchor.publishedAt ? new Date(anchor.publishedAt).toLocaleString() : "Unknown Date"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Anchor Hash (Fingerprint)</div>
                  <code className="block bg-gray-50 p-2 rounded border border-gray-100 text-xs font-mono text-gray-600 break-all">
                    {anchor.latestHash}
                  </code>
                </div>
                <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-6">
                  <div>
                    <span className="block text-xs text-gray-400 uppercase">Blocks Verified</span>
                    <span className="text-2xl font-bold text-gray-800">{anchor.blockCount}</span>
                  </div>
                  <div className="hidden md:block">
                     <CheckCircle className="w-8 h-8 text-green-200" />
                  </div>
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
      <ConceptExplainer title="The Live Ledger" icon={Activity}>
        <p>
          This is the <strong>Immutable Chain</strong>. Every action (Waste Collection, Redemption) creates a "Block." 
          Each block contains a "Previous Hash" link, connecting it to the one before it. 
          <br/><span className="text-xs mt-2 block opacity-80">Tip: Click "View Details" to see the specific data (like weight or location) stored in the block.</span>
        </p>
      </ConceptExplainer>

      {/* --- EXTERNAL DATA INTEGRITY ALERT --- */}
      {/* This specifically checks if database collections match the Ledger */}
      {verification && !verification.dataVerification?.valid && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4 animate-in slide-in-from-top-2 shadow-sm">
            <div className="bg-red-100 p-2 rounded-full text-red-600 flex-shrink-0 mt-1">
                <Database className="w-6 h-6" />
            </div>
            <div>
                <h4 className="font-bold text-red-800 text-lg flex items-center gap-2">
                    External Data Mismatch Detected
                </h4>
                <p className="text-red-700 text-sm mt-1">
                   The immutable blockchain ledger does not match the active database records. 
                   This indicates potential tampering in one of the following collections:
                </p>
                <div className="flex flex-wrap gap-2 mt-2 mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-bold">
                        <Database className="w-3 h-3 mr-1"/> Point Transactions
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-bold">
                        <Recycle className="w-3 h-3 mr-1"/> Waste Submissions
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-bold">
                        <Gift className="w-3 h-3 mr-1"/> Redemptions
                    </span>
                </div>
                <div className="bg-white/50 p-2 rounded text-xs font-mono text-red-800 border border-red-100">
                    System Diagnostic: {verification.dataVerification.reason}
                </div>
            </div>
        </div>
      )}
      {/* ------------------------------------------ */}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-bold border border-green-200">WASTE COLLECTED</span>
        <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 font-bold border border-orange-200">REWARD REDEEMED</span>
        <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 font-bold border border-purple-200">SYSTEM GENESIS</span>
      </div>
      
      {blocks.length === 0 ? (
         <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <Box className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Ledger is empty. Waiting for transactions...</p>
         </div>
      ) : (
        blocks.map((block, i) => (
          <div key={block.id || i} className="relative pl-0 sm:pl-4">
            {/* Visual Chain Connector */}
            {i !== blocks.length - 1 && (
              <div className="absolute left-4 sm:left-[2.5rem] top-10 bottom-[-40px] w-1 bg-indigo-100 -z-10"></div>
            )}

            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                
                {/* Block ID */}
                <div className="flex items-center gap-4">
                  <div className="bg-white text-indigo-600 border-2 border-indigo-50 group-hover:border-indigo-200 font-mono font-bold w-14 h-14 rounded-lg flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                    <Box className="w-4 h-4 mb-1" />
                    <span className="text-xs">#{block.index}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase border ${
                          block.actionType?.includes('WASTE') ? 'bg-green-50 text-green-700 border-green-100' :
                          block.actionType?.includes('REDEEM') ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          block.actionType === 'GENESIS' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
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

                {/* Hash Visualization */}
                <div className="w-full md:w-auto bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs font-mono flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-gray-400" title="The digital fingerprint of the PREVIOUS block. If this doesn't match, the chain is broken.">
                      <LinkIcon className="w-3 h-3" /> 
                      <span className="w-16 font-bold">PREV:</span>
                      <span className="truncate w-32 md:w-48 opacity-75">{block.prevHash?.substring(0, 20)}...</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600" title="The unique digital fingerprint of THIS block.">
                      <Hash className="w-3 h-3" /> 
                      <span className="w-16 font-bold">CURRENT:</span>
                      <span className="truncate w-32 md:w-48 font-semibold">{block.hash?.substring(0, 20)}...</span>
                  </div>
                </div>
              </div>

              {/* Toggle Details */}
              <button 
                  onClick={() => toggleBlock(block.id)}
                  className="w-full mt-3 pt-2 flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider border-t border-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
              >
                  {expandedBlock === block.id ? <>Hide Data Payload <ChevronUp className="w-3 h-3"/></> : <>View Data Payload <ChevronDown className="w-3 h-3"/></>}
              </button>

              {expandedBlock === block.id && block.metadata && (
                  <div className="mt-2 p-4 bg-slate-50 rounded-lg text-xs border border-slate-200">
                      <h5 className="font-bold text-slate-500 mb-2 uppercase flex items-center gap-2">
                        <FileText className="w-3 h-3"/> Stored Data
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {Object.entries(block.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b border-slate-200 pb-1 last:border-0">
                            <span className="font-semibold text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> 
                            <span className="text-slate-800 text-right">{value}</span>
                        </div>
                        ))}
                      </div>
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Running Integrity Checks...</h2>
        <p className="text-gray-500 mt-2 max-w-md">We are recalculating hashes and verifying signatures to ensure data hasn't been tampered with.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4">
        
        {/* Main Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-full mb-4">
             <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">Transparency Dashboard</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Review the live health of the EcoSort blockchain. This tool allows the public to audit transactions and verify that no data has been altered.
          </p>
        </div>

        {/* Global Status Banner */}
        {renderStatusCard()}

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 inline-flex flex-wrap justify-center gap-1">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'status' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Activity className="w-4 h-4" /> System Health
            </button>
            <button
              onClick={() => setActiveTab('anchors')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'anchors' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Anchor className="w-4 h-4" /> Public Anchors
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" /> Live Ledger
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="animate-in fade-in duration-500">
          
          {/* --- TAB: SYSTEM HEALTH --- */}
          {activeTab === 'status' && (
            <>
              <ConceptExplainer title="Understanding System Health" icon={Info}>
                <p>
                  We perform two critical checks. 
                  1. <strong>Chain Continuity:</strong> We recalculate the math for every block to ensure no one deleted a transaction. 
                  2. <strong>Database Sync:</strong> We compare the blockchain total against the active database records to ensure no "fake points" exist.
                </p>
              </ConceptExplainer>

              {verification && (
                <>
                  {/* Detailed Diagnostics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Chain Check */}
                    <div className={`p-5 rounded-xl border shadow-sm ${
                        verification.chainVerification?.valid
                            ? "bg-white border-green-200"
                            : "bg-red-50 border-red-200"
                    }`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${verification.chainVerification?.valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <LinkIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-lg">Chain Continuity</h4>
                                <p className={`text-sm font-medium mt-1 ${verification.chainVerification?.valid ? 'text-green-600' : 'text-red-600'}`}>
                                    {verification.chainVerification?.valid ? "Passed: The chain is unbroken." : "Failed: Broken links detected."}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    {verification.chainVerification?.message}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Database Check */}
                    <div className={`p-5 rounded-xl border shadow-sm ${
                        verification.dataVerification?.valid
                            ? "bg-white border-green-200"
                            : "bg-red-50 border-red-200"
                    }`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${verification.dataVerification?.valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <Database className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-lg">Database Synchronization</h4>
                                <p className={`text-sm font-medium mt-1 ${verification.dataVerification?.valid ? 'text-green-600' : 'text-red-600'}`}>
                                    {verification.dataVerification?.valid ? "Passed: Records match perfectly." : "Failed: Data discrepancy found."}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Checking: <strong>Point Transactions, Waste Submissions, Redemptions.</strong>
                                </p>
                                { !verification.dataVerification?.valid && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Error: {verification.dataVerification?.reason}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Stats Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-gray-400"/> Technical Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Blocks Mined</span>
                      <span className="text-2xl font-bold text-indigo-600">{stats?.totalBlocks}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm block mb-1">Latest Global Hash (Merkle Root)</span>
                      <div className="flex items-center gap-2">
                         <code className="bg-gray-100 p-2 rounded text-xs block w-full truncate border border-gray-200 text-gray-600">
                            {stats?.latestHash}
                         </code>
                         <button 
                            onClick={() => copyHash(stats?.latestHash)} 
                            className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Copy Hash"
                         >
                            {copied ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4"/>}
                         </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">This hash represents the current cumulative state of the entire system.</p>
                    </div>
                  </div>
                </div>

                {/* Anchor Validation Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                    <Anchor className="w-5 h-5 text-gray-400"/> Validation against Public Anchor
                  </h3>
                  {latestAnchor ? (
                    <div className="space-y-3">
                       <p className="text-sm text-gray-600">
                         We compare the live chain against the last known "safe" checkpoint (Anchor #{latestAnchor.latestBlockIndex}).
                       </p>
                       <div className={`p-4 rounded-lg border text-sm ${anchorVerification?.valid ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                          <div className="flex items-center gap-2 mb-2">
                             {anchorVerification?.valid 
                                ? <CheckCircle className="w-5 h-5 text-green-600" /> 
                                : <XCircle className="w-5 h-5 text-red-600" />}
                             <span className={`font-bold ${anchorVerification?.valid ? 'text-green-800' : 'text-red-800'}`}>
                                {anchorVerification?.valid ? 'Signatures Match' : 'Signature Mismatch'}
                             </span>
                          </div>
                          <p className={`text-xs leading-relaxed ${anchorVerification?.valid ? 'text-green-700' : 'text-red-700'}`}>
                             {anchorVerification?.valid 
                               ? `Success: The current chain mathematically proves it is a direct continuation of the public anchor from ${new Date(latestAnchor.publishedAt).toLocaleDateString()}.`
                               : anchorVerification?.reason
                             }
                          </p>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 italic text-sm">
                      No public anchors have been generated yet.
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