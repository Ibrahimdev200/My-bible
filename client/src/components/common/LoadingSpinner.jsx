import React from 'react';
import { BookOpen } from 'lucide-react';

const LoadingSpinner = ({ size = 'md', message = 'Loading ScriptureLive...' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
    fullscreen: 'w-16 h-16 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        <div
          className={`${sizeClasses[size] || sizeClasses.md} rounded-full border-navy-700 border-t-gold-500 animate-spin`}
        />
        <div className="absolute inset-0 flex items-center justify-center text-gold-400">
          <BookOpen className={size === 'sm' ? 'w-3 h-3' : size === 'lg' || size === 'fullscreen' ? 'w-6 h-6' : 'w-4 h-4'} />
        </div>
      </div>
      {message && (
        <p className="text-sm font-medium text-slate-300 animate-pulse tracking-wide font-display">
          {message}
        </p>
      )}
    </div>
  );

  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/90 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-6">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
