'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

// theme-script.ts'teki senkron script sayfa yüklenirken .dark sınıfını zaten
// uygulamış oluyor; burada sadece o durumu okuyup butonu senkronluyoruz ve
// tıklamada hem <html> sınıfını hem localStorage'ı güncelliyoruz.
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // localStorage kapalı/erişilemez olabilir (gizli sekme vb.) — sessizce geç
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors ${className}`}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      {isDark ? 'Açık Tema' : 'Koyu Tema'}
    </button>
  );
}
