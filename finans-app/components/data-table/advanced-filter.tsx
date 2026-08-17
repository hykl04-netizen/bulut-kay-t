'use client';

import { RefObject, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export interface AdvancedFilterValue {
  search: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  categoryIds: string[];
}

export const EMPTY_ADVANCED_FILTER: AdvancedFilterValue = {
  search: '',
  dateFrom: '',
  dateTo: '',
  amountMin: '',
  amountMax: '',
  categoryIds: [],
};

interface FilterCategory {
  id: string;
  name: string;
}

interface AdvancedFilterBarProps {
  value: AdvancedFilterValue;
  onChange: (value: AdvancedFilterValue) => void;
  categories?: FilterCategory[];
  searchPlaceholder?: string;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

/**
 * Gelir/Gider, Fatura/Masraf gibi liste sayfalarında ortak kullanılan
 * arama kutusu + gelişmiş filtre paneli (tarih aralığı, tutar aralığı,
 * çoklu kategori seçimi). Filtreleme mantığı `applyAdvancedFilter` ile
 * istemci tarafında (mevcut veri üzerinde) uygulanır.
 */
export function AdvancedFilterBar({
  value,
  onChange,
  categories = [],
  searchPlaceholder,
  searchInputRef,
}: AdvancedFilterBarProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  const advancedActiveCount =
    [value.dateFrom, value.dateTo, value.amountMin, value.amountMax].filter(Boolean).length +
    (value.categoryIds.length > 0 ? 1 : 0);

  const update = (patch: Partial<AdvancedFilterValue>) => onChange({ ...value, ...patch });
  const clearAll = () => onChange({ ...EMPTY_ADVANCED_FILTER });

  const toggleCategory = (id: string) => {
    update({
      categoryIds: value.categoryIds.includes(id)
        ? value.categoryIds.filter((c) => c !== id)
        : [...value.categoryIds, id],
    });
  };

  const hasAnyFilter = advancedActiveCount > 0 || value.search.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground dark:text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={value.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder={searchPlaceholder ?? 'Ara... ( / )'}
            className="w-full rounded-xl border border-border bg-transparent py-2 pl-9 pr-3 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
          />
        </div>

        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition ${
            panelOpen || advancedActiveCount > 0
              ? 'border-primary bg-primary/10 text-primary dark:border-brand-gold dark:bg-secondary dark:text-brand-gold-light'
              : 'border-border text-foreground hover:bg-muted dark:border-border dark:text-foreground dark:hover:bg-secondary'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtrele
          {advancedActiveCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white dark:bg-brand-gold dark:text-accent-foreground">
              {advancedActiveCount}
            </span>
          )}
        </button>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex shrink-0 items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground sm:self-auto"
          >
            <X className="h-3.5 w-3.5" />
            Temizle
          </button>
        )}
      </div>

      {panelOpen && (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4 dark:border-border dark:bg-card sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
              Başlangıç Tarihi
            </label>
            <input
              type="date"
              value={value.dateFrom}
              onChange={(e) => update({ dateFrom: e.target.value })}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
              Bitiş Tarihi
            </label>
            <input
              type="date"
              value={value.dateTo}
              onChange={(e) => update({ dateTo: e.target.value })}
              className="w-full rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
              Min. Tutar
            </label>
            <input
              type="number"
              step="0.01"
              value={value.amountMin}
              onChange={(e) => update({ amountMin: e.target.value })}
              placeholder="0"
              className="w-full rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
              Maks. Tutar
            </label>
            <input
              type="number"
              step="0.01"
              value={value.amountMax}
              onChange={(e) => update({ amountMax: e.target.value })}
              placeholder="∞"
              className="w-full rounded-lg border border-border bg-transparent px-3 py-1.5 text-sm focus:border-accent focus:outline-none dark:border-border dark:text-foreground"
            />
          </div>

          {categories.length > 0 && (
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                Kategoriler
              </label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const active = value.categoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        active
                          ? 'border-primary bg-primary text-white dark:border-brand-gold dark:bg-brand-gold dark:text-accent-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted dark:border-border dark:text-muted-foreground dark:hover:bg-secondary'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ApplyAdvancedFilterOptions {
  /** Kaydın tarih alanı adı (ör. 'date', 'due_date'). ISO/`YYYY-MM-DD` formatında olmalı. */
  dateField: string;
  /** Kaydın tutar alanı adı (ör. 'amount'). */
  amountField: string;
  /** Kaydın kategori id alanı adı (ör. 'category_id'). */
  categoryField: string;
  /** Serbest metin aramasının uygulanacağı alan adları (ör. ['description']). */
  searchFields: string[];
}

/** Verilen kayıt listesine, istemci tarafında AdvancedFilterValue'yu uygular. */
export function applyAdvancedFilter<T extends Record<string, unknown>>(
  items: T[],
  filters: AdvancedFilterValue,
  opts: ApplyAdvancedFilterOptions
): T[] {
  const search = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (search) {
      const matches = opts.searchFields.some((field) =>
        String(item[field] ?? '').toLowerCase().includes(search)
      );
      if (!matches) return false;
    }

    if (filters.dateFrom || filters.dateTo) {
      const dateVal = String(item[opts.dateField] ?? '');
      if (filters.dateFrom && dateVal < filters.dateFrom) return false;
      if (filters.dateTo && dateVal > filters.dateTo) return false;
    }

    if (filters.amountMin || filters.amountMax) {
      const amountVal = Number(item[opts.amountField] ?? 0);
      if (filters.amountMin && amountVal < parseFloat(filters.amountMin)) return false;
      if (filters.amountMax && amountVal > parseFloat(filters.amountMax)) return false;
    }

    if (filters.categoryIds.length > 0) {
      const catVal = item[opts.categoryField];
      if (!catVal || !filters.categoryIds.includes(String(catVal))) return false;
    }

    return true;
  });
}
