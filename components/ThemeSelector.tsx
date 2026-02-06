
import React from 'react';
import { Theme } from '../types';

interface ThemeSelectorProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ currentTheme, onThemeChange }) => {
  const themes = [
    { id: Theme.ISLAMIC, label: 'Islamic' },
    { id: Theme.TURKISH, label: 'Turkish' },
    { id: Theme.DARK, label: 'Dark' },
  ];

  return (
    <div className="flex space-x-2 bg-black/20 p-1 rounded-lg backdrop-blur-sm border border-white/10">
      {themes.map((t) => (
        <button
          key={t.id}
          onClick={() => onThemeChange(t.id)}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            currentTheme === t.id
              ? 'bg-white/20 text-white shadow-sm'
              : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

export default ThemeSelector;
