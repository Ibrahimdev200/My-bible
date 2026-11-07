import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import StatsCards from './StatsCards';
import ProjectionPreview from '../Projection/ProjectionPreview';
import api from '../../utils/api';
import {
  BookOpen,
  Mic,
  Radio,
  Clock,
  Sparkles,
  ArrowRight,
  Send,
  PlayCircle,
  Activity,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Overview = () => {
  const { user } = useAuth();
  const { isConnected, isMicListening, emitScriptureDetected } = useSocket();
  const navigate = useNavigate();

  const [statsData, setStatsData] = useState({
    todayCount: 0,
    totalCount: 0,
  });
  const [recentScriptures, setRecentScriptures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load stats and recent scriptures from backend
  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        const [historyRes, statsRes] = await Promise.allSettled([
          api.get('/scripture/history?limit=10'),
          api.get('/scripture/history/stats'),
        ]);

        if (historyRes.status === 'fulfilled' && historyRes.value.data) {
          const list = historyRes.value.data.history || historyRes.value.data;
          if (Array.isArray(list) && list.length > 0) {
            setRecentScriptures(list.slice(0, 10));
          } else {
            const localRaw = localStorage.getItem('scripturelive_local_history');
            const localItems = localRaw ? JSON.parse(localRaw) : [];
            setRecentScriptures(localItems.slice(0, 10));
          }
        } else {
          const localRaw = localStorage.getItem('scripturelive_local_history');
          const localItems = localRaw ? JSON.parse(localRaw) : [];
          setRecentScriptures(localItems.slice(0, 10));
        }

        if (statsRes.status === 'fulfilled' && statsRes.value.data) {
          setStatsData({
            todayCount: statsRes.value.data.today || statsRes.value.data.todayCount || 0,
            totalCount: statsRes.value.data.total || statsRes.value.data.totalCount || 0,
          });
        }
      } catch (e) {
        try {
          const localRaw = localStorage.getItem('scripturelive_local_history');
          const localItems = localRaw ? JSON.parse(localRaw) : [];
          setRecentScriptures(localItems.slice(0, 10));
        } catch { }
      } finally {
        setLoading(false);
      }
    };

    loadOverviewData();
  }, []);

  // Quick re-projection
  const handlePushToProjection = (item) => {
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

  // Stats definition
  const stats = [
    {
      icon: Activity,
      label: 'Scriptures Today',
      value: statsData.todayCount || (recentScriptures.length > 0 ? recentScriptures.length : 0),
      subtext: 'Detected in live session',
      color: 'gold',
    },
    {
      icon: Mic,
      label: 'Voice Capture',
      value: isMicListening ? 'Listening' : 'Standby',
      subtext: isMicListening ? 'Live speech tracking' : 'Ready to start',
      color: isMicListening ? 'emerald' : 'blue',
    },
    {
      icon: BookOpen,
      label: 'Bible Translation',
      value: user?.preferredTranslation || 'KJV',
      subtext: 'Active church version',
      color: 'purple',
    },
    {
      icon: Radio,
      label: 'System Link',
      value: isConnected ? 'Connected' : 'Offline',
      subtext: isConnected ? 'Real-time WebSocket' : 'Connecting...',
      color: isConnected ? 'emerald' : 'gold',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 border border-navy-700/60 p-8 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-400 text-xs font-semibold mb-3">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Sanctuary Live Church Projection</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight font-display">
              Welcome, {user?.churchName || 'Faith Fellowship'}
            </h1>
            <p className="text-slate-300 text-sm mt-1.5 max-w-xl leading-relaxed">
              Real-time voice recognition captures scripture references and spoken verses from your
              sermon and displays them on your sanctuary screens.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard/live"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 font-bold text-sm shadow-lg shadow-gold-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Start Listening</span>
            </Link>

            <Link
              to="/dashboard/bible"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-navy-800 hover:bg-navy-700 text-white font-semibold text-sm border border-navy-700 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-gold-400" />
              <span>Browse Bible</span>
            </Link>

            <a
              href="/projection"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-navy-800/80 hover:bg-gold-500/10 text-gold-400 hover:text-gold-300 font-semibold text-sm border border-gold-500/30 transition-colors"
            >
              <Radio className="w-4 h-4" />
              <span>Projector Screen</span>
            </a>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <StatsCards stats={stats} />

      {/* Main Grid: Projection Preview (Right/Left) and Recent Scriptures */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Recent Activity List (7 cols) */}
        <div className="lg:col-span-7 bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-navy-800">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-gold-400" />
              <h2 className="text-base font-bold text-white font-display">
                Recent Scriptures
              </h2>
            </div>
            <Link
              to="/dashboard/history"
              className="text-xs text-gold-400 hover:text-gold-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>View Full History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {recentScriptures.length > 0 ? (
              recentScriptures.map((item, idx) => (
                <div
                  key={item._id || item.id || idx}
                  className="p-3.5 rounded-xl bg-navy-950/70 border border-navy-800/80 hover:border-gold-500/40 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gold-400 font-display">
                        {item.reference}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-navy-800 text-slate-300 font-semibold">
                        {item.translation || user?.preferredTranslation || 'KJV'}
                      </span>
                      {item.confidence && (
                        <span className="text-[10px] text-slate-400">
                          {Math.round(item.confidence * 100)}% match
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 truncate mt-1 font-scripture">
                      {item.text || item.verseText || 'Verse text displayed on projection screen.'}
                    </p>
                  </div>

                  <button
                    onClick={() => handlePushToProjection(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500/10 hover:bg-gold-500 text-gold-400 hover:text-navy-950 text-xs font-bold border border-gold-500/30 transition-all opacity-90 group-hover:opacity-100 cursor-pointer flex-shrink-0"
                    title="Push this scripture to projection now"
                  >
                    <Send className="w-3 h-3" />
                    <span>Project</span>
                  </button>
                </div>
              ))
            ) : (
              // Empty State
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-navy-800">
                <div className="w-12 h-12 rounded-2xl bg-navy-800 text-gold-400 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  No scriptures detected yet today
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Turn on the microphone in Live Detection to start listening to your sermon, or
                  pick a verse from the Bible browser.
                </p>
                <div className="flex justify-center gap-3">
                  <Link
                    to="/dashboard/live"
                    className="px-4 py-2 rounded-lg bg-gold-500 text-navy-950 text-xs font-bold flex items-center gap-2 hover:bg-gold-400 transition-colors"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Start Live Session</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Live Projection Output Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <ProjectionPreview />
        </div>
      </div>
    </div>
  );
};

export default Overview;
