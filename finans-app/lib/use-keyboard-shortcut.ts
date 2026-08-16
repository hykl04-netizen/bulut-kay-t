'use client';

import { useEffect } from 'react';

interface ShortcutOptions {
  /** input/textarea/select içinde yazarken kısayolu görmezden gel (varsayılan: true). */
  ignoreWhenTyping?: boolean;
  /** Kısayolu devre dışı bırakmak için (örn. bir modal zaten açıksa). */
  enabled?: boolean;
}

/**
 * Tek bir tuş için global klavye kısayolu dinleyicisi.
 * Örnek: useKeyboardShortcut('n', () => openModal())
 * Örnek: useKeyboardShortcut('/', () => searchInputRef.current?.focus())
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  deps: unknown[] = [],
  options: ShortcutOptions = {}
) {
  const { ignoreWhenTyping = true, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;

      if (ignoreWhenTyping && isTyping && key.toLowerCase() !== 'escape') return;

      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, ...deps]);
}
