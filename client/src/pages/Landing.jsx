import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Mic,
  Radio,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Sliders,
  CheckCircle,
} from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 selection:bg-gold-500/30 selection:text-gold-200">
      {/* Top Navbar */}
      <nav className="h-20 border-b border-navy-800/80 px-6 md:px-12 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 text-navy-950 font-bold" />
          </div>
          <div>
            <span className="text-xl font-extrabold font-display text-white tracking-tight leading-none">
              Scripture<span className="text-gold-500">Live</span>
            </span>
            <span className="block text-[10px] font-semibold tracking-widest uppercase text-gold-400/80">
              AI Projection
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 text-sm font-bold shadow-lg shadow-gold-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 md:px-12 pt-16 pb-24 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden">
        {/* Glow Background */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gold-500/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-400 text-xs font-semibold mb-6 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Generation Live Church Technology</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold font-display tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          AI-Powered Bible Scripture Recognition for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500">
            Live Church Projection
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed mb-10">
          Listen to sermon preaching in real time. Our voice AI automatically identifies Bible
          scripture references and broadcasts them seamlessly to your church screens.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link
            to="/register"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 font-bold text-base shadow-xl shadow-gold-500/25 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5"
          >
            <span>Register Your Church</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-navy-900 hover:bg-navy-800 text-white font-semibold text-base border border-navy-700/80 flex items-center justify-center gap-2 transition-colors"
          >
            <span>Launch Live Dashboard</span>
          </Link>
        </div>

        {/* Hero Projection Mockup Preview */}
        <div className="w-full max-w-4xl rounded-3xl overflow-hidden border border-navy-700/80 shadow-2xl bg-navy-900/90 p-4 md:p-8 backdrop-blur-xl">
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-950 border border-gold-500/30 p-8 md:p-12 text-center aspect-video flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-gold-400">Grace Community Church</span>
              <span className="px-2 py-0.5 rounded bg-gold-500/20 text-gold-300 font-bold uppercase">
                KJV
              </span>
            </div>

            <div className="my-auto py-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display text-gold-400 mb-4">
                John 3:16
              </h2>
              <p className="text-base sm:text-xl md:text-2xl font-scripture text-slate-100 leading-relaxed max-w-2xl mx-auto italic drop-shadow">
                “For God so loved the world, that he gave his only begotten Son, that whosoever
                believeth in him should not perish, but have everlasting life.”
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>AI Auto-Detected in 0.2s</span>
              <span>ScriptureLive Broadcast Output</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="px-6 md:px-12 py-20 bg-navy-900/50 border-t border-navy-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white font-display mb-3">
              Engineered for Pastors, Media Teams & Audiences
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              Everything church media technicians and worship teams need for live scripture projection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Mic,
                title: 'Real-time AI Detection',
                desc: 'Web Speech recognition listens to preacher speech and detects chapter and verse references with precision.',
              },
              {
                icon: Layers,
                title: 'Multiple Translations',
                desc: 'Instantly toggle between King James Version (KJV), World English Bible (WEB), ASV, and YLT.',
              },
              {
                icon: Radio,
                title: 'Instant Live Projection',
                desc: 'Dedicated 16:9 projection screen synchronizes in real time over WebSockets and local multi-window channels.',
              },
              {
                icon: Globe,
                title: 'Multi-Church Platform',
                desc: 'Customized church logos, branded color palettes, multiple slide templates, and full session detection history.',
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-navy-900 border border-navy-800 rounded-2xl p-6 shadow-xl hover:border-gold-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 text-gold-400 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white font-display mb-2">
                      {f.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-12 border-t border-navy-800 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-gold-500" />
          <span className="font-bold text-white font-display">ScriptureLive AI</span>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/login" className="hover:text-gold-400 transition-colors">
            Login
          </Link>
          <Link to="/register" className="hover:text-gold-400 transition-colors">
            Register Church
          </Link>
          <a href="/projection" target="_blank" rel="noreferrer" className="hover:text-gold-400 transition-colors">
            Projector Screen
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
