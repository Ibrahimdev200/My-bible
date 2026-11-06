import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Clock,
  Search,
  Download,
  Trash2,
  Radio,
  Send,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const HistoryPage = () => {
  const { user } = useAuth();
  const { emitScriptureDetected } = useSocket();

  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 15;

  // Filters
  const [search, setSearch] = useState('');
  const [filterTranslation, setFilterTranslation] = useState('ALL');

  // Load history from API
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      const res = await api.get(`/scripture/history?limit=${limit}&offset=${offset}`);
      if (res.data) {
        const items = res.data.history || res.data.items || (Array.isArray(res.data) ? res.data : []);
        setHistory(items);
        setTotal(res.data.total || items.length);
      }
    } catch (err) {
      console.warn('Could not load history:', err.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Delete an entry
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to remove this scripture record?')) return;
    try {
      await api.delete(`/scripture/history/${id}`);
      setHistory((prev) => prev.filter((item) => (item._id || item.id) !== id));
      toast.success('Scripture record deleted');
    } catch (err) {
      // Local removal fallback
      setHistory((prev) => prev.filter((item) => (item._id || item.id) !== id));
      toast.success('Removed from view');
    }
  };

  // Export JSON
  const handleExport = async () => {
    try {
      const res = await api.get('/scripture/history/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scripturelive-history-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export downloaded');
    } catch (e) {
      // Client-side export fallback
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `scripturelive-history-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Export downloaded');
    }
  };

  // Re-project item
  const handleProject = (item) => {
    emitScriptureDetected({
      reference: item.reference,
      text: item.text || item.verseText || '',
      book: item.book || '',
      chapter: item.chapter || '',
      verse: item.verse || '',
      translation: item.translation || user?.preferredTranslation || 'KJV',
    });
    toast.success(`Projecting ${item.reference}`);
  };

  // Client-side filtered rows
  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      !search ||
      (item.reference && item.reference.toLowerCase().includes(search.toLowerCase())) ||
      (item.text && item.text.toLowerCase().includes(search.toLowerCase())) ||
      (item.spokenText && item.spokenText.toLowerCase().includes(search.toLowerCase()));

    const matchesTrans =
      filterTranslation === 'ALL' || item.translation === filterTranslation;

    return matchesSearch && matchesTrans;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-navy-800">
          <div>
            <h1 className="text-2xl font-bold text-white font-display flex items-center gap-2">
              <Clock className="w-6 h-6 text-gold-400" />
              <span>Scripture Detection History</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Audit log of all detected and projected scriptures with speech transcripts and confidence scores.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 border border-navy-700 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-gold-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-navy-900 border border-navy-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-96 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by reference, verse, or spoken words..."
              className="w-full pl-9 pr-3 py-2 bg-navy-950/80 border border-navy-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-gold-400" />
              <span>Translation:</span>
            </span>
            <select
              value={filterTranslation}
              onChange={(e) => setFilterTranslation(e.target.value)}
              className="bg-navy-950 border border-navy-800 text-white rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-gold-500 cursor-pointer"
            >
              <option value="ALL">All Translations</option>
              <option value="KJV">KJV</option>
              <option value="WEB">WEB</option>
              <option value="ASV">ASV</option>
              <option value="YLT">YLT</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-navy-900 border border-navy-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-navy-950/80 border-b border-navy-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Scripture Reference</th>
                  <th className="py-3.5 px-4">Translation</th>
                  <th className="py-3.5 px-4">Verse Text</th>
                  <th className="py-3.5 px-4">Heard Transcript</th>
                  <th className="py-3.5 px-4">Confidence</th>
                  <th className="py-3.5 px-4">Time</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-gold-500" />
                        <span>Loading scripture records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredHistory.length > 0 ? (
                  filteredHistory.map((item, idx) => (
                    <tr
                      key={item._id || item.id || idx}
                      className="hover:bg-navy-800/40 transition-colors group"
                    >
                      {/* Reference */}
                      <td className="py-3.5 px-4 font-bold text-gold-400 font-display whitespace-nowrap">
                        {item.reference}
                      </td>

                      {/* Translation */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-navy-800 text-slate-300 font-semibold text-[10px]">
                          {item.translation || 'KJV'}
                        </span>
                      </td>

                      {/* Text */}
                      <td className="py-3.5 px-4 max-w-xs truncate font-scripture text-slate-200">
                        {item.text || item.verseText || '—'}
                      </td>

                      {/* Heard Speech */}
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-400 italic">
                        {item.spokenText ? `"${item.spokenText}"` : '—'}
                      </td>

                      {/* Confidence */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.confidence ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{Math.round(item.confidence * 100)}%</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">Manual</span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                        {item.createdAt || item.timestamp
                          ? new Date(item.createdAt || item.timestamp).toLocaleString()
                          : 'Recent'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleProject(item)}
                            className="p-1.5 rounded-lg bg-gold-500/10 hover:bg-gold-500 text-gold-400 hover:text-navy-950 transition-colors cursor-pointer"
                            title="Project this scripture"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id || item.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No scripture history found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 bg-navy-950/60 border-t border-navy-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing Page {page} (Displaying up to {limit} records)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-navy-800 bg-navy-900 hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={filteredHistory.length < limit}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg border border-navy-800 bg-navy-900 hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HistoryPage;
