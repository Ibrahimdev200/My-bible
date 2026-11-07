import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { TRANSLATIONS } from '../../utils/bibleData';
import api from '../../utils/api';
import { Languages } from 'lucide-react';

const TranslationSelector = ({ value, onChange, compact = false }) => {
  const { user, updateTranslation } = useAuth();
  const { currentScripture, emitScriptureDetected } = useSocket();
  const currentTranslation = value || user?.preferredTranslation || 'KJV';

  const handleSelect = async (e) => {
    const newTrans = e.target.value;
    if (onChange) {
      onChange(newTrans);
    } else {
      await updateTranslation(newTrans);
    }

    // If a scripture is currently projected, immediately refresh its text in the newly selected Bible version
    if (currentScripture?.reference) {
      try {
        const res = await api.get(
          `/bible/reference?ref=${encodeURIComponent(currentScripture.reference)}&translation=${newTrans}`
        );
        if (res.data && res.data.text) {
          emitScriptureDetected({
            ...currentScripture,
            text: res.data.text,
            translation: newTrans,
          });
        }
      } catch (err) {}
    }
  };

  return (
    <div className="relative inline-flex items-center">
      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-gold-400">
        <Languages className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </div>
      <select
        value={currentTranslation}
        onChange={handleSelect}
        className={`bg-navy-900 border border-navy-700 text-white rounded-lg pl-8 pr-7 py-1.5 text-xs font-semibold focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 cursor-pointer appearance-none transition-all ${
          compact ? 'py-1 text-xs' : 'py-1.5'
        }`}
      >
        {TRANSLATIONS.map((trans) => (
          <option key={trans.code} value={trans.code} className="bg-navy-900 text-white">
            {trans.code} - {trans.name}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-slate-400 text-xs">
        ▼
      </div>
    </div>
  );
};

export default TranslationSelector;
