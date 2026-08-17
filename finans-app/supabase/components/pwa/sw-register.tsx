'use client';

import { useEffect } from 'react';

// Servis çalışanını yalnızca production'da ve tarayıcı destekliyorsa kaydeder.
// Geliştirme sırasında (npm run dev) kayıt yapılmaz, aksi halde eski derleme
// çıktıları önbellekte kalıp kafa karıştırabilir.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Servis çalışanı kaydedilemedi:', err);
    });
  }, []);

  return null;
}
