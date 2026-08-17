'use client';

import { useEffect, useState } from 'react';
import { ReceiptText, Loader2, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getCurrentWorkspaceId } from '@/lib/supabase/workspace';
import { useTeamRole } from '@/lib/use-team-role';
import { toast } from '@/components/ui/toaster';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Faz 5 + Faz 10 hazırlığı — satıcı (işletme) fatura künyesi.
 *
 * Bu bilgiler bilinçli olarak `company_settings` yerine `workspaces` tablosunda
 * tutuluyor: company_settings hâlâ KULLANICI bazlı, oysa fatura künyesi
 * İŞLETME bazlı olmak zorunda — ikinci bir işletme açan kullanıcı farklı bir
 * vergi numarası kullanır.
 *
 * Aynı alanlar ileride resmi e-Fatura entegrasyonunda da zorunlu (bkz.
 * lib/einvoice.ts). RLS gereği yalnızca işletme SAHİBİ güncelleyebilir.
 */
export default function FaturaKunyesiPage() {
  const { isOwner, loading: roleLoading } = useTeamRole();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tax_number: '', tax_office: '', address: '', invoice_note: '' });

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

      const { data } = await supabase
        .from('workspaces')
        .select('tax_number, tax_office, address, invoice_note')
        .eq('id', wsId)
        .maybeSingle();
      if (cancelled) return;

      const row = data as {
        tax_number: string | null;
        tax_office: string | null;
        address: string | null;
        invoice_note: string | null;
      } | null;

      setForm({
        tax_number: row?.tax_number ?? '',
        tax_office: row?.tax_office ?? '',
        address: row?.address ?? '',
        invoice_note: row?.invoice_note ?? '',
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;
    setSaving(true);
    const { error } = await supabase
      .from('workspaces')
      .update({
        tax_number: form.tax_number.trim() || null,
        tax_office: form.tax_office.trim() || null,
        address: form.address.trim() || null,
        invoice_note: form.invoice_note.trim() || null,
      })
      .eq('id', workspaceId);

    if (error) {
      toast.error(`Kaydedilemedi: ${error.message}`);
    } else {
      toast.success('Fatura künyesi güncellendi.');
    }
    setSaving(false);
  };

  if (!roleLoading && !isOwner) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <ReceiptText className="h-7 w-7 text-brand-gold" />
          <h1 className="text-3xl font-bold text-foreground">Fatura Künyesi</h1>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">Fatura künyesini yalnızca işletme sahibi düzenleyebilir.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yükleniyor...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <ReceiptText className="h-7 w-7 text-brand-gold" />
        <h1 className="text-3xl font-bold text-foreground">Fatura Künyesi</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Kestiğiniz faturaların üstünde görünecek satıcı bilgileri. Bu alanlar ileride resmi
        e-Fatura entegrasyonu için de zorunlu olacak.
      </p>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="kunye-vergi-no">Vergi / TC Numarası</Label>
          <Input
            id="kunye-vergi-no"
            value={form.tax_number}
            onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
            placeholder="1234567890"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="kunye-vergi-dairesi">Vergi Dairesi</Label>
          <Input
            id="kunye-vergi-dairesi"
            value={form.tax_office}
            onChange={(e) => setForm({ ...form, tax_office: e.target.value })}
            placeholder="Örn. Kadıköy"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="kunye-adres">Adres</Label>
          <textarea
            id="kunye-adres"
            rows={3}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="kunye-not">Faturalarda varsayılan not</Label>
          <textarea
            id="kunye-not"
            rows={2}
            value={form.invoice_note}
            onChange={(e) => setForm({ ...form, invoice_note: e.target.value })}
            placeholder="Örn. IBAN, ödeme koşulları"
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Kaydet
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Şirket adı ve logo, Şirket Ayarları sayfasından yönetiliyor ve fatura PDF&apos;inde
        birlikte kullanılıyor.
      </p>
    </form>
  );
}
