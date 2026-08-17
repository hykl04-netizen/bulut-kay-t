'use client';

import { getDueInfo, DUE_TONE_CLASSES } from '@/lib/due-date';
import { Clock } from 'lucide-react';

interface DueBadgeProps {
  dueDate: string | null;
  isSettled: boolean;
  className?: string;
}

/** Fatura/Borç kayıtlarında vade durumunu gösteren küçük rozet. Ödenmiş
 * kayıtlarda veya vade tarihi girilmemişse hiçbir şey render etmez. */
export function DueBadge({ dueDate, isSettled, className = '' }: DueBadgeProps) {
  if (isSettled) return null;
  const info = getDueInfo(dueDate, isSettled);
  if (!info) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${DUE_TONE_CLASSES[info.tone]} ${className}`}
    >
      <Clock className="h-3 w-3" />
      {info.label}
    </span>
  );
}
