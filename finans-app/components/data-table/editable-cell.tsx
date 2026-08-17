'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';

type EditableCellProps = {
  /** Ham değer (input'a konulacak) */
  value: string | number;
  /** Ekranda gösterilecek biçim (düzenlenmiyorken). Verilmezse value doğrudan basılır. */
  display?: React.ReactNode;
  type?: 'text' | 'number' | 'date';
  step?: string;
  /** Kaydet: hata fırlatırsa (throw) değer eski haline döner ve kullanıcıya uyarı gösterilir. */
  onSave: (newValue: string) => Promise<void> | void;
  className?: string;
  placeholder?: string;
  /** Yazmayı bıraktıktan kaç ms sonra otomatik kaydedilsin. 0 verilirse autosave kapanır. */
  debounceMs?: number;
};

const AUTOSAVE_DEBOUNCE_MS = 600;

/**
 * Çift tıklayınca düzenlenebilir hale gelen hücre.
 * Enter -> hemen kaydet, Escape -> vazgeç, blur -> hemen kaydet,
 * yazarken 600ms sessizlikten sonra otomatik kaydet (autosave).
 */
export function EditableCell({
  value,
  display,
  type = 'text',
  step,
  onSave,
  className = '',
  placeholder,
  debounceMs = AUTOSAVE_DEBOUNCE_MS,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // En güncel draft'ı commit() içinde (kapanış yakalamadan) okuyabilmek için ref.
  // Render sırasında ref güncellemek yerine, draft her değiştiğinde bir effect
  // içinde senkronize ediyoruz (React refs kuralına uygun).
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  // Son kaydedilen değeri takip eder (sunucudan gelen `value` henüz güncellenmemiş olabilir)
  const lastSavedRef = useRef(String(value));

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // Dışarıdan gelen değer değişirse (ör. başka bir yerden güncellendi) taslağı senkronize et.
  // isEditing true iken bu hiç tetiklenmemesi gerektiğinden (kullanıcı yazarken üzerine
  // yazılmasın diye), setState'i render sırasında (React'ın "adjusting state" deseniyle)
  // uyguluyoruz — düzenleme modunda değilken value her değiştiğinde draft'ı güncelliyoruz.
  const [syncedValue, setSyncedValue] = useState(value);
  if (!isEditing && value !== syncedValue) {
    setSyncedValue(value);
    setDraft(String(value));
  }
  useEffect(() => {
    if (!isEditing) {
      lastSavedRef.current = String(syncedValue);
    }
  }, [syncedValue, isEditing]);

  // Unmount olurken bekleyen zamanlayıcıları temizle
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
      if (errorFlashRef.current) clearTimeout(errorFlashRef.current);
    };
  }, []);

  const clearDebounce = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const startEditing = () => {
    setDraft(String(value));
    lastSavedRef.current = String(value);
    setError(false);
    setJustSaved(false);
    setIsEditing(true);
  };

  const commit = useCallback(async () => {
    clearDebounce();
    const current = draftRef.current;
    if (current === lastSavedRef.current) {
      return;
    }
    setSaving(true);
    setError(false);
    try {
      await onSave(current);
      lastSavedRef.current = current;
      setJustSaved(true);
      if (savedFlashRef.current) clearTimeout(savedFlashRef.current);
      savedFlashRef.current = setTimeout(() => setJustSaved(false), 1200);
    } catch {
      setError(true);
      if (errorFlashRef.current) clearTimeout(errorFlashRef.current);
      errorFlashRef.current = setTimeout(() => setError(false), 1500);
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  const commitAndClose = async () => {
    const current = draftRef.current;
    if (current === lastSavedRef.current) {
      setIsEditing(false);
      return;
    }
    await commit();
    setIsEditing(false);
  };

  const cancel = () => {
    clearDebounce();
    setDraft(lastSavedRef.current);
    setIsEditing(false);
    setError(false);
  };

  const handleChange = (newDraft: string) => {
    setDraft(newDraft);
    clearDebounce();
    if (debounceMs > 0) {
      debounceRef.current = setTimeout(() => {
        commit();
      }, debounceMs);
    }
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          step={step}
          value={draft}
          disabled={saving}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={commitAndClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitAndClose();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          placeholder={placeholder}
          className={`w-full px-2 py-1 pr-7 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-400 focus:ring-rose-300'
              : 'border-border dark:border-slate-600 focus:ring-accent dark:focus:ring-accent dark:bg-secondary dark:text-slate-100'
          } ${saving ? 'opacity-60' : ''}`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
          {saving && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground dark:text-muted-foreground" aria-label="Kaydediliyor" />
          )}
          {!saving && justSaved && (
            <Check className="w-3.5 h-3.5 text-emerald-500" aria-label="Kaydedildi" />
          )}
          {!saving && error && (
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" aria-label="Hata" />
          )}
        </span>
      </div>
    );
  }

  return (
    <div
      onDoubleClick={startEditing}
      title="Düzenlemek için çift tıklayın"
      className={`cursor-text rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-secondary dark:hover:bg-slate-700 transition-colors ${className}`}
    >
      {display ?? value}
    </div>
  );
}
