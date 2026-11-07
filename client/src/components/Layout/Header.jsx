import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import TranslationSelector from '../Bible/TranslationSelector';
import { Mic, Radio, Wifi, WifiOff } from 'lucide-react';

const Header = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isConnected, isMicListening, currentScripture, toggleGlobalListening } = useSocket();

  // Dynamic Page Title
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard Overview';
    if (path.startsWith('/dashboard/bible')) return 'Bible Scripture Browser';
    if (path.startsWith('/dashboard/live')) return 'Live Voice Scripture Capture';
    if (path.startsWith('/dashboard/history')) return 'Scripture Projection Log';
    if (path.startsWith('/dashboard/settings')) return 'Church & Projection Settings';
    return 'ScriptureLive';
  };

  return (
    <header className="h-16 bg-navy-900/80 backdrop-blur-md border-b border-navy-800 fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between">
      {/* Left: Dynamic Title & Active Scripture Badge */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white font-display">
          {getPageTitle()}
        </h1>

        {currentScripture && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/15 border border-gold-500/30 text-xs text-gold-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-gold-400 animate-ping" />
            <span>Projecting: {currentScripture.reference}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Mic Status (Click to Toggle Voice Capture from any page) */}
        <button
          type="button"
          onClick={toggleGlobalListening}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
            isMicListening
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/20'
              : 'bg-navy-800 hover:bg-navy-700 border-navy-700 text-slate-300'
          }`}
          title={isMicListening ? 'Microphone is active — click to pause' : 'Click to turn on live voice capture'}
        >
          <div className="relative flex items-center justify-center">
            <Mic className={`w-3.5 h-3.5 ${isMicListening ? 'text-emerald-400' : 'text-slate-400'}`} />
            {isMicListening && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </div>
          <span>{isMicListening ? 'Mic Active' : 'Start Mic'}</span>
        </button>

        {/* Translation Selector */}
        <div className="hidden sm:block">
          <TranslationSelector compact={true} />
        </div>

        {/* Socket Status */}
        <div
          className="flex items-center gap-1.5 text-xs text-slate-400"
          title={isConnected ? 'Connected to live projection server' : 'Disconnected from server'}
        >
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
          )}
          <span className="hidden md:inline">{isConnected ? 'Online' : 'Offline'}</span>
        </div>

        {/* Quick Launch Projection Button */}
        <a
          href="/projection"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-gold-500 hover:text-navy-950 border border-navy-700 hover:border-gold-500 text-xs font-semibold text-slate-200 transition-all cursor-pointer shadow-sm"
          title="Open Live Projection Window in New Tab"
        >
          <Radio className="w-3.5 h-3.5 text-gold-400 group-hover:text-navy-950" />
          <span className="hidden sm:inline">Projection</span>
        </a>

        {/* Church Logo Icon */}
        <Link
          to="/dashboard/settings"
          className="flex items-center gap-2 pl-2 border-l border-navy-800 group"
          title="Church Settings"
        >
          {user?.logoUrl ? (
            <img
              src={user.logoUrl}
              alt="Logo"
              className="w-8 h-8 rounded-full object-cover border border-navy-700 group-hover:border-gold-500 transition-colors"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-navy-800 border border-navy-700 group-hover:border-gold-500 flex items-center justify-center text-xs font-bold text-gold-400 transition-colors">
              {(user?.churchName || user?.name || 'C').charAt(0).toUpperCase()}
            </div>
          )}
        </Link>
      </div>
    </header>
  );
};

export default Header;
