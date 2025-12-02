// src/pages/AdminPanel/LedgerTab.js

import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Link as LinkIcon, 
  Hash, 
  Clock, 
  User, 
  Loader2, 
  Search,
  Box,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Database,
  Recycle, 
  Gift,
  Info // Added Info icon for clarification note
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
// Import the central verification function
import { runAllIntegrityChecks } from '../../utils/blockchainService';

const LedgerTab = () => {
  const { isDark } = useTheme();
  const [blocks, setBlocks] = useState([]);
  const [integrityStatus, setIntegrityStatus] = useState("Verifying...");
  const [isValid, setIsValid] = useState(true);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedBlock, setExpandedBlock] = useState(null);
  const [chainVerification, setChainVerification] = useState(null);
  const [externalDataStatus, setExternalDataStatus] = useState(null); 

  // Helper function for display
  const formatTimestamp = (timestamp) => {
    if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleString();
    }
    return new Date(timestamp).toLocaleString();
  };

  const runVerification = useCallback(async () => {
    setVerifying(true);
    setIntegrityStatus("Running full integrity checks...");
    try {
        const fullVerification = await runAllIntegrityChecks();

        // Update overall status
        setIsValid(fullVerification.valid);
        setIntegrityStatus(fullVerification.message);
        
        // Store detailed results
        setChainVerification(fullVerification.chainVerification);
        setExternalDataStatus(fullVerification.dataVerification);

    } catch (error) {
        setIsValid(false);
        setIntegrityStatus(`Verification Error: ${error.message}`);
        console.error("Verification failed:", error);
    } finally {
        setVerifying(false);
    }
  }, []); 

  useEffect(() => {
    const q = query(collection(db, "ledger"), orderBy("index", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const newBlocks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBlocks(newBlocks);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching ledger blocks:", error);
        setIntegrityStatus("Error loading blocks.");
        setLoading(false);
    });

    runVerification(); // Initial verification call

    return () => unsubscribe();
  }, [runVerification]);

  const filteredBlocks = blocks.filter(block => 
    String(block.index).includes(searchTerm) ||
    block.hash.includes(searchTerm) ||
    block.prevHash.includes(searchTerm) ||
    (block.userId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (block.actionType || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className={`text-3xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>Immutable Ledger (Blockchain)</h1>

      {/* INTEGRITY STATUS BANNER (Primary Status) */}
      <div className={`p-4 rounded-xl shadow-md mb-6 ${
          isValid
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
      } ${isDark ? (isValid ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700') : ''}`}>
          <div className="flex items-center gap-4">
              {verifying ? (
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin flex-shrink-0" />
              ) : isValid ? (
                  <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                  <h3 className={`font-bold ${isValid ? 'text-green-700' : 'text-red-700'}`}>
                      System Integrity Status: {isValid ? "SECURE" : "COMPROMISED"}
                  </h3>
                  <p className={`text-sm mt-0.5 ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {integrityStatus}
                  </p>
                  
                  {/* Detailed Failure Reasons */}
                  {!isValid && (
                      <div className="mt-2 space-y-1">
                          {chainVerification && !chainVerification.valid && (
                              <div className={`text-xs flex items-center gap-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                                  <LinkIcon className="w-3 h-3" /> 
                                  Blockchain Broken at Blocks: {chainVerification.invalidBlocks.join(', ')}
                              </div>
                          )}
                          {externalDataStatus && !externalDataStatus.valid && (
                              <div className={`text-xs flex items-center gap-2 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                                  <Database className="w-3 h-3" /> 
                                  External Data Check Failed: {externalDataStatus.reason}
                              </div>
                          )}
                      </div>
                  )}
              </div>
              <button
                onClick={runVerification} 
                disabled={verifying}
                className={`flex-shrink-0 flex items-center px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                  isDark ? 'bg-indigo-700 hover:bg-indigo-800 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } disabled:opacity-50`}
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
              </button>
          </div>
      </div>

      {/* External Data Integrity Status (UPDATED ALERT SECTION) */}
      {externalDataStatus && !externalDataStatus.valid && (
          <div className={`flex items-start p-4 mb-6 rounded-xl border animate-in slide-in-from-top-2 fade-in ${
              isDark ? "bg-red-900/30 border-red-700 text-red-300" : "bg-red-50 border-red-200 text-red-800"
          }`}>
              <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0 mt-1" />
              <div className="flex-1">
                  <h4 className="font-bold">EXTERNAL BREACH ALERT: Ledger Mismatch</h4>
                  <p className="text-sm mb-2">
                      {externalDataStatus.reason}
                  </p>
                  
                  {/* Visual indicators of the monitored collections */}
                  <div className="flex flex-wrap gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${isDark ? "bg-red-800/50 text-red-200 border border-red-700" : "bg-red-100 text-red-800 border border-red-200"}`}>
                        <Database className="w-3 h-3 mr-1"/> Point Transactions
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${isDark ? "bg-red-800/50 text-red-200 border border-red-700" : "bg-red-100 text-red-800 border border-red-200"}`}>
                        <Recycle className="w-3 h-3 mr-1"/> Waste Submissions
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${isDark ? "bg-red-800/50 text-red-200 border border-red-700" : "bg-red-100 text-red-800 border border-red-200"}`}>
                        <Gift className="w-3 h-3 mr-1"/> Redemptions
                      </span>
                  </div>

                  <p className="text-xs font-mono mt-1 opacity-70">
                      Immutable Ledger Total: {externalDataStatus.ledgerTotal} | External DB Total: {externalDataStatus.transactionsTotal}
                  </p>
              </div>
          </div>
      )}

      {/* Search Bar */}
      <div className="mb-4 relative">
          <input
              type="text"
              placeholder="Search by Hash, Index, or User ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full py-2 pl-10 pr-4 border rounded-lg ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          />
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
          <span className={`ml-3 text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loading Ledger...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBlocks.map((block) => (
            <div 
              key={block.id} 
              className={`p-4 rounded-xl shadow-sm border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}
            >
              <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                      <div className={`font-bold w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${isDark ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                          <Box className='w-5 h-5'/>
                      </div>
                      <div>
                          <div className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>
                              Block #{block.index} - {block.actionType}
                          </div>
                          <div className={`text-sm mt-1 flex items-center gap-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {block.userId}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatTimestamp(block.timestamp)}
                            </span>
                          </div>
                      </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                      <div className={`font-bold text-xl ${block.points > 0 ? 'text-green-500' : block.points < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          {block.points > 0 ? `+${block.points}` : block.points} Pts
                      </div>
                      <span className={`text-xs mt-1 px-2 py-0.5 rounded ${block.isValid === false ? 'bg-red-500 text-white' : isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                          {block.isValid === false ? 'INVALID BLOCK' : 'VALID BLOCK'}
                      </span>
                  </div>
              </div>

              {/* Hash Details */}
              <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="text-xs mb-1">
                      <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Hash:</span>
                      <code className={`block break-all font-mono ${isDark ? "text-indigo-300" : "text-indigo-600"}`}>
                          {block.hash}
                      </code>
                  </div>
                  <div className="text-xs mb-3">
                      <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Previous Hash:</span>
                      <code className={`block break-all font-mono ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {block.prevHash}
                      </code>
                  </div>
              </div>

              {/* Metadata Toggle */}
              <button
                onClick={() => setExpandedBlock(expandedBlock === block.id ? null : block.id)}
                className={`text-xs font-medium mt-2 px-3 py-1 rounded-full border flex items-center gap-1 transition-colors ${
                    isDark 
                    ? "border-gray-700 text-gray-200 hover:bg-gray-700/50" 
                    : "border-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {expandedBlock === block.id ? (
                  <>Hide Metadata <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>View Metadata <ChevronDown className="w-3 h-3" /></>
                )}
              </button>

              {/* Metadata Dropdown */}
              {expandedBlock === block.id && block.metadata && (
                  <div className="mt-2">
                      {/* NEW: Explanation for initial status on submission blocks */}
                      {(block.actionType === 'WASTE_SUBMITTED' || block.actionType === 'REWARD_REDEEMED') && (
                          <div className={`p-3 mb-2 rounded-lg border-l-4 animate-in slide-in-from-top-2 fade-in ${isDark ? "bg-yellow-900/20 border-yellow-500 text-yellow-300" : "bg-yellow-50 border-yellow-500 text-yellow-800"}`}>
                              <p className="text-sm font-semibold flex items-center gap-2">
                                  <Info className="w-4 h-4" />
                                  Note on Status in Metadata
                              </p>
                              <p className="text-xs mt-1">
                                  This block records an **immutable snapshot** of the submission's state (*e.g., `pending_approval`*) **at the moment of creation**. The subsequent approval/confirmation is recorded in a **later block** (the points transaction block) and in the live database, but this original record in the chain cannot be altered.
                              </p>
                          </div>
                      )}

                      {/* Existing Metadata Display */}
                      <div className={`p-3 rounded-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs border animate-in slide-in-from-top-2 fade-in ${
                        isDark ? "bg-black/20 border-gray-700" : "bg-gray-50 border-gray-100"
                      }`}>
                          {Object.entries(block.metadata).map(([key, value]) => (
                            <div key={key} className={`px-2 py-1 rounded truncate ${isDark ? "bg-gray-700/50" : "bg-white border border-gray-100"}`}>
                               <span className={`mr-1 capitalize ${isDark ? "text-gray-400" : "text-gray-500"}`}>{key}:</span>
                               <strong className={`${isDark ? "text-white" : "text-gray-800"}`}>{String(value)}</strong>
                            </div>
                          ))}
                      </div>
                  </div>
              )}
            </div>
          ))}
          {!loading && filteredBlocks.length === 0 && (
              <p className={`text-center py-10 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No matching blocks found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default LedgerTab;