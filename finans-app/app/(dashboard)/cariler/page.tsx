'use client';

import { useCallback, useEffect, useState } from 'react';
import { Users2, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import { fetchCustomers, type Customer } from '@/lib/invoices';
import { toast } from '@/components/ui/toaster';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Faz 5 — cari (müşteri) kartları. Fatura keserken alıcı bilgisi buradan
 * seçilir; vergi no/adres fatura PDF'ine olduğu gibi basılır.
 */

const EMPTY_FORM = {
  name: '',
  tax_number: '',
  tax_office: '',
  address: '',
  email: '',
  phone: '',
  notes: '',
};

export default function CarilerPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = useCallback(async (wsId: string) => {
    setLoading(true);
    try {
      setCustomers(await fetchCustomers(wsId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cariler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const wsId = await getCurrentWorkspaceId(user.id);
      if (cancelled) return;
      setWorkspaceId(wsId);
      await load(wsId);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingId(customer.id);
    setForm({
      name: customer.name,
      tax_number: customer.tax_number ?? '',
      tax_office: customer.tax_office ?? '',
      address: customer.address ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      notes: customer.notes ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !form.name.trim()) return;
    setSaving(true);

    const payload = {
      workspace_id: workspaceId,
      name: form.name.trim(),
      tax_number: form.tax_number.trim() || null,
      tax_office: form.tax_office.trim() || null,
      address: form.address.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = editingId
      ? await supabase.from('customers').update(payload).eq('id', editingId)
      : await supabase.from('customers').insert(payload);

    if (error) {
      toast.error(`Kaydedilemedi: ${error.message}`);
      setSaving(false);
      return;
    }

    toast.success(editingId ? 'Cari güncellendi.' : 'Cari eklendi.');
    setFormOpen(false);
    setSaving(false);
    await load(workspaceId);
  };

  const handleDelete = async (customer: Customer) => {
    const ok = await confirmDialog({
      title: 'Cariyi sil',
      message: `${customer.name} silinsin mi? Bu cariye kesilmiş faturalar silinmez, yalnızca cari bağlantıları kaldırılır.`,
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok || !workspaceId) return;

    const { error } = await supabase.from('customers').delete().eq('id', customer.id);
    if (error) {
      toast.error(`Silinemedi: ${error.message}`);
      return;
    }
    toast.success('Cari silindi.');
    await load(workspaceId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Users2 className="h-7 w-7 text-brand-gold" />
          <h1 className="text-3xl font-bold text-foreground">Cariler</h1>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary transition"
        >
          <Plus className="h-4 w-4" />
          Yeni Cari
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Fatura kestiğiniz müşteri/firma bilgileri. Buraya girdiğiniz vergi numarası ve adres,
        fatura PDF&apos;ine olduğu gibi yazdırılır.
      </p>

      {formOpen && (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              {editingId ? 'Cariyi düzenle' : 'Yeni cari'}
            </h2>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              aria-label="Formu kapat"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cari-ad">Ünvan / Ad *</Label>
              <Input
                id="cari-ad"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Örn. Yıldız Teknoloji A.Ş."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cari-vergi-no">Vergi / TC No</Label>
              <Input
                id="cari-vergi-no"
                value={form.tax_number}
                onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cari-vergi-dairesi">Vergi Dairesi</Label>
              <Input
                id="cari-vergi-dairesi"
                value={form.tax_office}
                onChange={(e) => setForm({ ...form, tax_office: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cari-eposta">E-posta</Label>
              <Input
                id="cari-eposta"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cari-telefon">Telefon</Label>
              <Input
                id="cari-telefon"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cari-adres">Adres</Label>
              <textarea
                id="cari-adres"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cari-not">Not</Label>
              <textarea
                id="cari-not"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-secondary disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Kaydet
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : customers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-foreground font-medium">Henüz cari eklenmemiş.</p>
          <p className="text-sm text-muted-foreground mt-1">
            Fatura kesebilmek için önce müşterinizi buraya ekleyin.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Ünvan</th>
                <th className="px-4 py-3 font-medium">Vergi No</th>
                <th className="px-4 py-3 font-medium">İletişim</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{customer.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {customer.tax_number ?? '—'}
                    {customer.tax_office ? ` / ${customer.tax_office}` : ''}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {customer.email ?? customer.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(customer)}
                        aria-label={`${customer.name} düzenle`}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        aria-label={`${customer.name} sil`}
                        className="rounded p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
