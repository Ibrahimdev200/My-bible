import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({ icon: Icon, label, value, subtext, color = 'gold', index = 0 }) => {
  const colorMap = {
    gold: {
      bg: 'bg-gold-500/10',
      border: 'border-gold-500/20',
      text: 'text-gold-400',
      iconBg: 'bg-gold-500/15 text-gold-400',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      iconBg: 'bg-emerald-500/15 text-emerald-400',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      text: 'text-blue-400',
      iconBg: 'bg-blue-500/15 text-blue-400',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      iconBg: 'bg-purple-500/15 text-purple-400',
    },
  };

  const scheme = colorMap[color] || colorMap.gold;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      className={`rounded-2xl border ${scheme.border} bg-navy-900/90 p-5 shadow-lg backdrop-blur-sm relative overflow-hidden`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <h3 className="text-2xl font-bold font-display text-white mt-1.5">
            {value}
          </h3>
          {subtext && (
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              {subtext}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${scheme.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${scheme.bg}`} />
    </motion.div>
  );
};

export const StatsCards = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {stats.map((stat, i) => (
        <StatCard key={stat.label} index={i} {...stat} />
      ))}
    </div>
  );
};

export default StatsCards;
