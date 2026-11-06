import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  Mic,
  Clock,
  Settings,
  ExternalLink,
  LogOut,
  Radio,
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, end: true },
    { label: 'Bible Browser', path: '/dashboard/bible', icon: BookOpen },
    { label: 'Live Detection', path: '/dashboard/live', icon: Mic },
    { label: 'Scripture History', path: '/dashboard/history', icon: Clock },
    { label: 'Church Settings', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-800 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-navy-800 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-md shadow-gold-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 text-navy-950 font-bold" />
          </div>
          <div>
            <div className="text-base font-bold font-display text-white tracking-tight leading-none">
              Scripture<span className="text-gold-500">Live</span>
            </div>
            <div className="text-[10px] font-semibold tracking-wider uppercase text-gold-400/80">
              AI Projection
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-gold-500 text-navy-950 font-semibold shadow-md shadow-gold-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-navy-800/80'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-navy-950' : 'text-slate-400 group-hover:text-gold-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}

        <div className="pt-5 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Live Projection
        </div>

        {/* Projection Window Link */}
        <a
          href="/projection"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-gold-400 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 transition-all group"
        >
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-gold-400 animate-pulse" />
            <span className="font-semibold">Launch Display</span>
          </div>
          <ExternalLink className="w-4 h-4 text-gold-400/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </nav>

      {/* Church Profile & Logout Footer */}
      <div className="p-4 border-t border-navy-800 bg-navy-950/40">
        <div className="flex items-center gap-3 mb-3">
          {user?.logoUrl ? (
            <img
              src={user.logoUrl}
              alt="Logo"
              className="w-10 h-10 rounded-xl object-cover bg-navy-800 border border-navy-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-navy-800 border border-navy-700 flex items-center justify-center text-gold-400 font-bold text-sm">
              {(user?.churchName || user?.name || 'C').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">
              {user?.churchName || user?.name || 'ScriptureLive Church'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {user?.pastorName || user?.email || 'Admin'}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
