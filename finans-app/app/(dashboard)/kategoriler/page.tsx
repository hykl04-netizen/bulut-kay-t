'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';

type Category = {
  id: string;
  type: 'gelir' | 'gider';
  name: string;
  color: string;
};

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#10b981', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#d946ef', '#ec4899', '#64748b',
];

export default function KategorilerPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState<'gelir' | 'gider'>('gider');
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);


  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('type', { ascending: true })
      .order('name', { ascending: true });

    if (!error && data) {
      setCategories(data as Category[]);
    } else if (error) {
      console.error('Kategori çekme hatası:', error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    queueMicrotask(() => {
      fetchCategories();
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      type,
      name: name.trim(),
      color,
    });

    if (!error) {
      setName('');
      setColor(PRESET_COLORS[0]);
      fetchCategories();
    } else {
      toast.error('Kategori eklenemedi: ' + error.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog('Bu kategoriyi silmek istediğinize emin misiniz? Bu kategoriyi kullanan işlemler etkilenebilir.'))) return;

    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast.error('Silinemedi: ' + error.message + '\n\nBu kategori muhtemelen bir veya daha fazla işlemde kullanılıyor. Önce o işlemlerin kategorisini değiştirmen gerekebilir.');
    } else {
      fetchCategories();
    }
  };

  const gelirCategories = categories.filter((c) => c.type === 'gelir');
  const giderCategories = categories.filter((c) => c.type === 'gider');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground dark:text-foreground">Kategoriler</h1>
        <p className="text-muted-foreground dark:text-muted-foreground mt-1">Gelir ve gider kategorilerinizi buradan yönetin.</p>
      </div>

      {/* Yeni Kategori Ekleme Formu */}
      <div className="bg-card dark:bg-primary rounded-xl shadow-sm border border-border dark:border-border p-6">
        <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4">Yeni Kategori Ekle</h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Tür</label>
            <div className="flex gap-4 p-1 bg-secondary dark:bg-secondary rounded-lg max-w-xs">
              <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${type === 'gelir' ? 'bg-card dark:bg-primary shadow-sm font-medium text-emerald-600' : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'}`}>
                <input type="radio" className="hidden" checked={type === 'gelir'} onChange={() => setType('gelir')} />
                Gelir
              </label>
              <label className={`flex-1 text-center py-2 rounded-md cursor-pointer transition-colors ${type === 'gider' ? 'bg-card dark:bg-primary shadow-sm font-medium text-rose-600' : 'text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground'}`}>
                <input type="radio" className="hidden" checked={type === 'gider'} onChange={() => setType('gider')} />
                Gider
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">Kategori Adı</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full max-w-sm px-4 py-3 border border-border dark:border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100"
              placeholder="Örn: Market, Ulaşım, Maaş..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-2">Renk</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Renk: ${c}`}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-primary hover:bg-secondary disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Ekleniyor...' : 'Kategori Ekle'}
          </button>
        </form>
      </div>

      {/* Kategori Listesi */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-muted-foreground dark:text-muted-foreground">Yükleniyor...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CategoryList title="Gelir Kategorileri" categories={gelirCategories} onDelete={handleDelete} emptyLabel="Henüz gelir kategorisi eklenmemiş." />
          <CategoryList title="Gider Kategorileri" categories={giderCategories} onDelete={handleDelete} emptyLabel="Henüz gider kategorisi eklenmemiş." />
        </div>
      )}
    </div>
  );
}

function CategoryList({
  title,
  categories,
  onDelete,
  emptyLabel,
}: {
  title: string;
  categories: Category[];
  onDelete: (id: string) => void;
  emptyLabel: string;
}) {
  return (
    <div className="bg-card dark:bg-primary rounded-xl shadow-sm border border-border dark:border-border p-6">
      <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-4 flex items-center gap-2">
        <Tag className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
        {title}
        <span className="text-sm font-normal text-muted-foreground dark:text-muted-foreground">({categories.length})</span>
      </h2>

      {categories.length === 0 ? (
        <p className="text-muted-foreground dark:text-muted-foreground text-sm">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted dark:hover:bg-secondary transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-foreground dark:text-muted-foreground">{cat.name}</span>
              </div>
              <button
                onClick={() => onDelete(cat.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground dark:text-muted-foreground hover:text-rose-600 transition-all p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}