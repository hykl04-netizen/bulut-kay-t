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
      className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${className}`}
    >
      {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      {isDark ? 'Açık Tema' : 'Koyu Tema'}
    </button>
  );
}
