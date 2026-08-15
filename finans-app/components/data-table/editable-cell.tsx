'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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
};

/**
 * Çift tıklayınca düzenlenebilir hale gelen hücre.
 * Enter -> kaydet, Escape -> vazgeç, blur (dışarı tıklama) -> kaydet.
 */
export function EditableCell({
  value,
  display,
  type = 'text',
  step,
  onSave,
  className = '',
  placeholder,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // Dışarıdan gelen değer değişirse (ör. yeniden fetch) taslağı senkronize et
  useEffect(() => {
    if (!isEditing) setDraft(String(value));
  }, [value, isEditing]);

  const startEditing = () => {
    setDraft(String(value));
    setError(false);
    setIsEditing(true);
  };

  const commit = async () => {
    if (draft === String(value)) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    setError(false);
    try {
      await onSave(draft);
      setIsEditing(false);
    } catch (e) {
      setError(true);
      // Kısa bir süre hata durumunu göster, sonra input açık kalsın ki kullanıcı düzeltsin
      setTimeout(() => setError(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(String(value));
    setIsEditing(false);
    setError(false);
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
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
          placeholder={placeholder}
          className={`w-full px-2 py-1 rounded-md border text-sm focus:outline-none focus:ring-2 ${
            error
              ? 'border-rose-400 focus:ring-rose-300'
              : 'border-slate-300 focus:ring-slate-900'
          } ${saving ? 'opacity-60' : ''}`}
        />
        {saving && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
        )}
      </div>
    );
  }

  return (
    <div
      onDoubleClick={startEditing}
      title="Düzenlemek için çift tıklayın"
      className={`cursor-text rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-slate-100 transition-colors ${className}`}
    >
      {display ?? value}
    </div>
  );
}
