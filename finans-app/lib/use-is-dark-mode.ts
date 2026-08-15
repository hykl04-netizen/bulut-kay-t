'use client';

import { useEffect, useState } from 'react';

// recharts gibi kütüphaneler SVG renklerini Tailwind `dark:` sınıflarıyla değil
// doğrudan JS prop'larıyla alır (stroke, fill). Bu hook <html>'daki .dark
// sınıfını izleyip bileşenlere "şu an koyu tema mı" bilgisini verir, böylece
// grafik renkleri de temaya göre seçilebilir.
export function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains('dark'));

    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
