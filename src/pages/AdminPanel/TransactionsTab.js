// src/pages/AdminPanel/TransactionsTab.js

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs
} from 'firebase/firestore';
import { useTheme } from "../../contexts/ThemeContext";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  User, 
  Loader2, 
  DollarSign, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
// Import the External Integrity Check function
import { verifyPointTransactions } from '../../utils/blockchainService'; 

// Helper function from original component, modified for Firebase Timestamp
const formatTimestamp = (timestamp) => {
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleString();
    }
    // Handle ISO strings or other date formats if they slip through
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'N/A';
    }
};

const capitalizeWords = (str) =>
    str
      ? str.replace(/\\_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "";


export default function TransactionsTab() {
  const { isDark } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // States for Integrity Check
  const [verification, setVerification] = useState(null); 
  const [verifying, setVerifying] = useState(false);

  // --- Verification Logic ---
  const runVerification = async () => {
    setVerifying(true);
    try {
        // Call the function that compares point_transactions total against ledger total
        const result = await verifyPointTransactions();
        setVerification(result);
    } catch (error) {
        console.error("Error running point transaction verification:", error);
        setVerification({ 
            valid: false, 
            reason: "Verification failed due to a system error.",
            ledgerTotal: 'N/A',
            transactionsTotal: 'N/A'
        });
    } finally {
      setVerifying(false);
    }
  };


  // --- Data Fetching Effect ---
  useEffect(() => {
    // Fetch users for display mapping
    const fetchUsers = async () => {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const userData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(userData);
    };

    // Fetch transactions in real-time
    const q = query(collection(db, "point_transactions"), orderBy("timestamp", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTransactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(newTransactions);
      setLoading(false);
      
      // Run verification after initial load/update
      runVerification();
    });

    fetchUsers();

    return () => unsubscribe();
  }, []);

  // --- Memoized Helpers ---
  const getUserEmail = useCallback(
    (userId) => {
      const user = users.find((u) => u.id === userId);
      return user ? user.email : "Unknown User";
    },
    [users]
  );

  const filteredSortedTransactions = useMemo(() => {
    let filtered = transactions;

    if (filterType === "awarded") {
      filtered = transactions.filter(
        (t) => t.points > 0
      );
    } else if (filterType === "redeemed") {
      filtered = transactions.filter((t) =>
        t.points < 0
      );
    }
    
    if (searchTerm) {
      filtered = filtered.filter(t => 
        (t.type || t.actionType).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.userId && getUserEmail(t.userId).toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.metadata?.message || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sorting logic 
    return filtered.sort((a, b) => {
      const aTime = a.timestamp?.seconds ?? 0;
      const bTime = b.timestamp?.seconds ?? 0;
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [transactions, filterType, sortOrder, searchTerm, getUserEmail]);

  const getPointsColor = (points) => {
    if (points > 0) return isDark ? 'text-green-500' : 'text-green-600';
    if (points < 0) return isDark ? 'text-red-500' : 'text-red-600';
    return isDark ? 'text-gray-400' : 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
        <span className={`ml-3 text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Loading Point Transactions...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className={`text-3xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>Point Transactions Log</h1>

      {/* INTEGRITY STATUS BANNER */}
      <div className={`p-4 rounded-xl shadow-md mb-6 ${
          verification?.valid === true 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
      } ${isDark ? (verification?.valid ? 'bg-green-900/30 border-green-700' : 'bg-red-900/30 border-red-700') : ''}`}>
          <div className="flex items-center gap-4">
              {verifying ? (
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin flex-shrink-0" />
              ) : verification?.valid ? (
                  <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                  <h3 className={`font-bold ${verification?.valid ? 'text-green-700' : 'text-red-700'}`}>
                      External Data Integrity Check
                  </h3>
                  <p className={`text-sm mt-0.5 ${verification?.valid ? 'text-green-600' : 'text-red-600'}`}>
                      {verification?.reason}
                  </p>
                  <div className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      **Blockchain Ledger Total:** <strong className="font-mono">{verification?.ledgerTotal}</strong> | 
                      **Transactions Collection Total:** <strong className="font-mono">{verification?.transactionsTotal}</strong>
                  </div>
              </div>
              <button
                onClick={runVerification}
                disabled={verifying}
                className={`flex-shrink-0 flex items-center px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                  isDark ? 'bg-indigo-700 hover:bg-indigo-800 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } disabled:opacity-50`}
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
          </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className={`flex justify-between items-center mb-4 p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex items-center gap-4">
          <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Filter Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`px-3 py-1 border rounded-lg text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          >
            <option value="all">All</option>
            <option value="awarded">Awarded (Credit)</option>
            <option value="redeemed">Redeemed/Spent (Debit)</option>
          </select>
        </div>
        
        <div className="flex items-center gap-4">
            <input
                type="text"
                placeholder="Search Type or User Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-48 py-1.5 px-3 border rounded-lg text-sm ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
            />
            <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className={`flex items-center gap-1 px-3 py-1 border rounded-lg text-sm font-medium transition-colors ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
                Date
                {sortOrder === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            </button>
        </div>
      </div>


      {/* Transaction Table */}
      <div className={`shadow-md rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <tr>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  Timestamp
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  Type
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  User
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  Amount
                </th>
                <th scope="col" className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                  Description
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredSortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className={`px-6 py-4 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No matching transactions found.</td>
                </tr>
              ) : (
                filteredSortedTransactions.map((transaction) => {
                  const amount = transaction.points ?? 0;
                  const isAwarded = amount > 0;
                  const typeStr = capitalizeWords(transaction.type || transaction.actionType || 'N/A');
                  const userEmail = getUserEmail(transaction.userId);
                  const description = transaction.metadata?.message || transaction.metadata?.type || 'N/A';
                  
                  const badgeClass = isAwarded
                    ? (isDark ? "bg-green-900 text-green-300" : "bg-green-100 text-green-800")
                    : (isDark ? "bg-red-900 text-red-300" : "bg-red-100 text-red-800");

                  return (
                    <tr key={transaction.id} className={`${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                      <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-300" : "text-slate-600"}`}>
                        {formatTimestamp(transaction.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${badgeClass}`}
                        >
                          {typeStr}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium ${isDark ? "text-gray-100" : "text-slate-800"}`}>
                        {userEmail}
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-bold ${
                          isAwarded
                            ? isDark
                              ? "text-emerald-400"
                              : "text-emerald-600"
                            : isDark
                            ? "text-red-400"
                            : "text-red-600"
                        }`}
                      >
                        {amount.toLocaleString()} pts
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDark ? "text-gray-400" : "text-slate-600"}`}>
                        {description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}