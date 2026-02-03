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
  ShieldCheck, AlertTriangle, Hash, Clock, Loader2, CheckCircle, 
  XCircle, Copy, Check, Anchor, Box, Link as LinkIcon, 
  ChevronDown, ChevronUp, Info, FileText, Activity, Database, 
  Recycle, Gift, BookOpen, Globe // Added BookOpen and Globe icons
} from 'lucide-react';

// --- 1. TRANSLATION DICTIONARY ---
const TRANSLATIONS = {
  en: {
    title: "Transparency Dashboard",
    subtitle: "This is the public record of all points and waste. It proves that no data has been faked or changed.",
    btn_health: "System Health",
    btn_anchors: "Saved Checkpoints",
    btn_ledger: "Digital Logbook",
    status_safe: "System is Safe & Secure",
    status_risk: "Security Alert Detected",
    status_desc_safe: "All records are intact. No one has tampered with the point system.",
    status_desc_risk: "We detected a mismatch in the records.",
    guide_btn: "How does this work?",
    guide_title: "Understanding the Public Ledger",
    loading: "Checking records...",
    ledger_empty: "The logbook is empty right now.",
    block: "Page",
    prev: "Connected To",
    curr: "Page Seal",
    view_data: "See What's Written Inside",
    hide_data: "Close Details"
  },
  tl: { // Tagalog / Localized
    title: "Publikong Listahan",
    subtitle: "Ito ang opisyal na listahan ng lahat ng puntos at basura. Pinapatunayan nito na walang daya ang sistema.",
    btn_health: "Kalusugan ng Sistema",
    btn_anchors: "Mga Naka-save na Checkpoint",
    btn_ledger: "Digital na Listahan",
    status_safe: "Ligtas at Walang Daya",
    status_risk: "May Nakitang Problema",
    status_desc_safe: "Ang lahat ng record ay tama. Walang nagbago o nandaya sa mga puntos.",
    status_desc_risk: "May nakita kaming hindi tugma sa record.",
    guide_btn: "Paano ito gumagana?",
    guide_title: "Paano Intindihin ang Listahan?",
    loading: "Sinusuri ang mga record...",
    ledger_empty: "Wala pang laman ang listahan.",
    block: "Pahina",
    prev: "Dugtong sa",
    curr: "Selyo ng Pahina",
    view_data: "Tingnan ang Nakasulat",
    hide_data: "Isara ang Detalye"
  }
};

// --- 2. EDUCATIONAL GUIDE COMPONENT ---
const GuideModal = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;

  const steps = [
    {
      icon: <BookOpen className="w-12 h-12 text-blue-500" />,
      title: lang === 'en' ? "The Community Logbook" : "Ang Listahan ng Bayan",
      desc: lang === 'en' 
        ? "Imagine a notebook inside a glass box in the town plaza. Everyone can see it, but no one can erase what is written. This website is that glass box."
        : "Isipin ang isang notebook na nasa loob ng salaming kahon sa gitna ng plaza. Lahat ay pwedeng tumingin, pero walang pwedeng magbura. Ang website na ito ang salaming kahon."
    },
    {
      icon: <LinkIcon className="w-12 h-12 text-purple-500" />,
      title: lang === 'en' ? "The Chain of Pages" : "Ang Kadena ng Pahina",
      desc: lang === 'en'
        ? "Every time you submit waste, we write a new 'Page' (Block). We glue this page to the previous one. If someone tries to tear a page out, the glue breaks, and we all know it was tampered with."
        : "Tuwing nagbibigay ka ng basura, nagsusulat kami ng bagong 'Pahina'. Idinidikit namin ito sa naunang pahina. Kapag may nagtangkang punitin ito, masisira ang dikit at malalaman nating may nandaya."
    },
    {
      icon: <ShieldCheck className="w-12 h-12 text-green-500" />,
      title: lang === 'en' ? "Why You Should Check" : "Bakit Dapat Mong Bantayan",
      desc: lang === 'en'
        ? "Your points are money. Checking this page ensures that your hard-earned points are safe and the system is being honest with everyone."
        : "Ang iyong puntos ay pera. Ang pagbisita dito ay paninigurado na ligtas ang iyong pinaghirapan at tapat ang sistema sa lahat."
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h3 className="text-xl font-bold text-gray-800">{lang === 'en' ? "Simple Guide" : "Gabay"}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><XCircle /></button>
        </div>
        
        <div className="space-y-8">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-4">
              <div className="flex-shrink-0 bg-gray-50 p-3 rounded-xl h-fit">
                {step.icon}
              </div>
              <div>
                <h4 className="font-bold text-lg text-gray-900">{step.title}</h4>
                <p className="text-gray-600 text-sm leading-relaxed mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
        >
          {lang === 'en' ? "I Understand" : "Naiintindihan Ko Na"}
        </button>
      </div>
    </div>
  );
};

// --- HELPER COMPONENT (Unchanged essentially, simplified styling) ---
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
  
  // NEW STATES
  const [showGuide, setShowGuide] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en' or 'tl'
  const t = TRANSLATIONS[language]; // Helper for current language

  useEffect(() => {
    loadPublicData();
  }, []);

  const loadPublicData = async () => {
    setLoading(true);
    try {
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

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'tl' : 'en');
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
              {isOverallSecure ? t.status_safe : t.status_risk}
            </h3>
            <p className="text-gray-600 mt-1">
              {isOverallSecure ? t.status_desc_safe : verification?.message || t.status_desc_risk}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderLedger = () => (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <span className="px-2 py-1 rounded bg-green-100 text-green-700 font-bold border border-green-200">WASTE</span>
        <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 font-bold border border-orange-200">REWARD</span>
      </div>
      
      {blocks.length === 0 ? (
         <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <Box className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">{t.ledger_empty}</p>
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

                {/* Hash Visualization - Simplified Labels */}
                <div className="w-full md:w-auto bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs font-mono flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-gray-400">
                      <LinkIcon className="w-3 h-3" /> 
                      <span className="w-16 font-bold uppercase">{t.prev}:</span>
                      <span className="truncate w-32 md:w-48 opacity-75">{block.prevHash?.substring(0, 15)}...</span>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-600">
                      <Hash className="w-3 h-3" /> 
                      <span className="w-16 font-bold uppercase">{t.curr}:</span>
                      <span className="truncate w-32 md:w-48 font-semibold">{block.hash?.substring(0, 15)}...</span>
                  </div>
                </div>
              </div>

              {/* Toggle Details */}
              <button 
                  onClick={() => toggleBlock(block.id)}
                  className="w-full mt-3 pt-2 flex items-center justify-center gap-1 text-xs font-bold uppercase tracking-wider border-t border-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
              >
                  {expandedBlock === block.id 
                    ? <>{t.hide_data} <ChevronUp className="w-3 h-3"/></> 
                    : <>{t.view_data} <ChevronDown className="w-3 h-3"/></>
                  }
              </button>

              {expandedBlock === block.id && block.metadata && (
                  <div className="mt-2 p-4 bg-slate-50 rounded-lg text-xs border border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {Object.entries(block.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between border-b border-slate-200 pb-1 last:border-0">
                            <span className="font-semibold text-slate-600 capitalize">{key}:</span> 
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
        <h2 className="text-xl font-bold text-gray-800">{t.loading}</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 relative">
      
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={toggleLanguage}
          className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 text-sm font-bold flex items-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <Globe className="w-4 h-4 text-indigo-600" />
          {language === 'en' ? 'Filipino / Tagalog' : 'English'}
        </button>
      </div>

      <GuideModal isOpen={showGuide} onClose={() => setShowGuide(false)} lang={language} />

      <div className="max-w-5xl mx-auto px-4">
        
        {/* Main Header */}
        <div className="text-center mb-10 pt-8">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-full mb-4">
             <ShieldCheck className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">{t.title}</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            {t.subtitle}
          </p>
          
          <button 
            onClick={() => setShowGuide(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold shadow-lg shadow-indigo-200 transition-all hover:scale-105"
          >
            <BookOpen className="w-4 h-4" /> {t.guide_btn}
          </button>
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
              <Activity className="w-4 h-4" /> {t.btn_health}
            </button>
            <button
              onClick={() => setActiveTab('anchors')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'anchors' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Anchor className="w-4 h-4" /> {t.btn_anchors}
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'ledger' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <FileText className="w-4 h-4" /> {t.btn_ledger}
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="animate-in fade-in duration-500">
          
          {/* --- TAB: SYSTEM HEALTH --- */}
          {activeTab === 'status' && (
            <>
              {verification && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Chain Check */}
                    <div className={`p-5 rounded-xl border shadow-sm ${
                        verification.chainVerification?.valid ? "bg-white border-green-200" : "bg-red-50 border-red-200"
                    }`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${verification.chainVerification?.valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <LinkIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-lg">
                                  {language === 'en' ? "Chain Continuity" : "Pagkadugtong ng Kadena"}
                                </h4>
                                <p className={`text-sm font-medium mt-1 ${verification.chainVerification?.valid ? 'text-green-600' : 'text-red-600'}`}>
                                    {verification.chainVerification?.valid 
                                      ? (language === 'en' ? "Passed: The chain is unbroken." : "Ayos: Walang putol ang listahan.") 
                                      : (language === 'en' ? "Failed: Broken links detected." : "Bigo: May putol ang kadena.")}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Database Check */}
                    <div className={`p-5 rounded-xl border shadow-sm ${
                        verification.dataVerification?.valid ? "bg-white border-green-200" : "bg-red-50 border-red-200"
                    }`}>
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${verification.dataVerification?.valid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                <Database className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-lg">
                                  {language === 'en' ? "Database Check" : "Pagsuri sa Database"}
                                </h4>
                                <p className={`text-sm font-medium mt-1 ${verification.dataVerification?.valid ? 'text-green-600' : 'text-red-600'}`}>
                                    {verification.dataVerification?.valid 
                                      ? (language === 'en' ? "Passed: Records match perfectly." : "Ayos: Tugma ang lahat ng records.") 
                                      : (language === 'en' ? "Failed: Data discrepancy found." : "Bigo: May maling datos.")}
                                </p>
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
                    <Activity className="w-5 h-5 text-gray-400"/> {language === 'en' ? "Technical Stats" : "Teknikal na Stats"}
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">{language === 'en' ? "Total Blocks Mined" : "Kabuuang Pahina"}</span>
                      <span className="text-2xl font-bold text-indigo-600">{stats?.totalBlocks}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 text-sm block mb-1">
                        {language === 'en' ? "Latest Global Hash (Fingerprint)" : "Pinakahuling Selyo (Hash)"}
                      </span>
                      <div className="flex items-center gap-2">
                         <code className="bg-gray-100 p-2 rounded text-xs block w-full truncate border border-gray-200 text-gray-600">
                            {stats?.latestHash}
                         </code>
                         <button 
                            onClick={() => copyHash(stats?.latestHash)} 
                            className="p-2 hover:bg-gray-100 rounded text-gray-400 hover:text-indigo-600 transition-colors"
                         >
                            {copied ? <Check className="w-4 h-4 text-green-500"/> : <Copy className="w-4 h-4"/>}
                         </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Anchor Validation Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                    <Anchor className="w-5 h-5 text-gray-400"/> {language === 'en' ? "Public Verification" : "Pampublikong Beripikasyon"}
                  </h3>
                  {latestAnchor ? (
                    <div className="space-y-3">
                       <p className="text-sm text-gray-600">
                         {language === 'en' 
                           ? "Comparing live data against the last known safe checkpoint." 
                           : "Kinukumpara ang live data sa huling ligtas na checkpoint."}
                       </p>
                       <div className={`p-4 rounded-lg border text-sm ${anchorVerification?.valid ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                          <div className="flex items-center gap-2 mb-2">
                             {anchorVerification?.valid 
                                ? <CheckCircle className="w-5 h-5 text-green-600" /> 
                                : <XCircle className="w-5 h-5 text-red-600" />}
                             <span className={`font-bold ${anchorVerification?.valid ? 'text-green-800' : 'text-red-800'}`}>
                                {anchorVerification?.valid 
                                  ? (language === 'en' ? "Signatures Match" : "Tugma ang Pirma") 
                                  : (language === 'en' ? "Signature Mismatch" : "Hindi Tugma")}
                             </span>
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500 italic text-sm">
                      No anchors yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'anchors' && (
            <div className="space-y-4">
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
                          {anchor.publishedAt ? new Date(anchor.publishedAt).toLocaleString() : "Unknown"}
                        </span>
                      </div>
                      <code className="block bg-gray-50 p-2 rounded border border-gray-100 text-xs font-mono text-gray-600 break-all">
                        {anchor.latestHash}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'ledger' && renderLedger()}
        </div>
      </div>
    </div>
  );
}

export default PublicVerification;