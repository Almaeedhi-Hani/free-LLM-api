import React from 'react';

export const LanguageSwitcher = () => {
  return (
    <div className="flex items-center space-x-2 text-sm font-medium text-slate-600">
      <button className="hover:text-gold-600">AR</button>
      <span className="text-slate-300">|</span>
      <button className="hover:text-gold-600">EN</button>
      <span className="text-slate-300">|</span>
      <button className="hover:text-gold-600">ZH</button>
    </div>
  );
};
