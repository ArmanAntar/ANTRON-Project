
import { Theme } from './types';

export const THEME_CONFIG = {
  [Theme.ISLAMIC]: {
    bg: 'bg-[#021a12]',
    sidebar: 'bg-[#04241a]/90',
    card: 'bg-[#063325]/40',
    accent: 'text-amber-400',
    border: 'border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.15)]',
    button: 'bg-gradient-to-tr from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-black font-bold shadow-[0_0_25px_rgba(217,119,6,0.3)]',
    pattern: 'islamic-pattern',
    title: 'text-amber-200 font-serif-elegant drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]',
    input: 'bg-[#04241a]/80 text-emerald-50 border-amber-600/20 focus:border-amber-400',
    userMsg: 'bg-[#063325] text-white border border-amber-500/20 shadow-xl',
    aiMsg: 'bg-[#04241a]/60 border border-amber-500/40 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]'
  },
  [Theme.TURKISH]: {
    bg: 'bg-[#1a0303]',
    sidebar: 'bg-[#2a0505]/95',
    card: 'bg-white/5',
    accent: 'text-amber-200',
    border: 'border-amber-600/40 shadow-[0_0_30px_rgba(180,83,9,0.2)]',
    button: 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:scale-105 text-white font-black shadow-2xl transition-all',
    pattern: 'ottoman-pattern',
    title: 'text-amber-100 font-serif-elegant uppercase tracking-[0.3em] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]',
    input: 'bg-[#2a0505]/60 text-white border-amber-600/20 focus:border-amber-400',
    userMsg: 'bg-[#3d0808] text-white border border-amber-500/20',
    aiMsg: 'bg-black/60 border border-amber-600/40 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)]'
  },
  [Theme.DARK]: {
    bg: 'bg-neutral-950',
    sidebar: 'bg-neutral-900',
    card: 'bg-neutral-900',
    accent: 'text-blue-400',
    border: 'border-neutral-800',
    button: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg',
    pattern: 'dark-pattern',
    title: 'text-white font-bold',
    input: 'bg-neutral-800 text-neutral-100 border-neutral-700 focus:border-blue-400',
    userMsg: 'bg-neutral-800/80 text-white',
    aiMsg: 'bg-neutral-900 border border-neutral-800 shadow-2xl'
  }
};

export const PRESET_MODELS = [
  'Super Unified Engine',
  'GPT-4o Virtual Node', 
  'Claude 3.5 Virtual Node', 
  'DeepSeek High-Frequency',
  'Grok-3 Reality Engine',
  'Meta Llama 4 Synthesis',
  'Perplexity Real-time Search',
  'ANTRON Core'
];
