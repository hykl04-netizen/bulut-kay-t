// app/(dashboard)/bordro/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Plus, Trash2, Calculator, Wallet } from 'lucide-react';

interface Payroll {
  id: string;
  period: string;
  gross_salary: number;
  sgk_deduction: number;
  income_tax: number;
  stamp_tax: number;
  bes_deduction: number;
  net_salary: number;
  notes: string;
}

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });
function formatTRY(value: number) {
  return TRY_FORMATTER.format(value);
}

export default function BordroPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [grossSalary, setGrossSalary] = useState('');
  const [sgkDeduction, setSgkDeduction] = useState('');
  const [incomeTax, setIncomeTax] = useState('');
  const [stampTax, setStampTax] = useState('');
  const [besDeduction, setBesDeduction] = useState('');
  const [notes, setNotes] = useState('');

  // Otomatik Net Maaş Hesaplama
  const gross = parseFloat(grossSalary) || 0;
  const sgk = parseFloat(sgkDeduction) || 0;
  const income = parseFloat(incomeTax) || 0;
  const stamp = parseFloat(stampTax) || 0;
  const bes = parseFloat(besDeduction) || 0;
  const calculatedNet = gross - (sgk + income + stamp + bes);

  useEffect(() => {
    fetchPayrolls();
  }, []);

  const fetchPayrolls = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('payrolls')
        .select('*')
        .eq('user_id', user.id)
        .order('period', { ascending: false });

      if (!error && data) {
        setPayrolls(data);
      }
    }
    setLoading(false);
  };

  const handleAddPayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('payrolls').insert({
      user_id: user.id,
      period,
      gross_salary: gross,
      sgk_deduction: sgk,
      income_tax: income,
      stamp_tax: stamp,
      bes_deduction: bes,
      net_salary: calculatedNet,
      notes,
    });

    if (!error) {
      // Formu temizle
      setGrossSalary('');
      setSgkDeduction('');
      setIncomeTax('');
      setStampTax('');
      setBesDeduction('');
      setNotes('');
      // Listeyi yenile
      await fetchPayrolls();
    } else {
      alert('Eklenirken bir hata oluştu!');
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu bordroyu silmek istediğinize emin misiniz?')) return;
    
    const { error } = await supabase.from('payrolls').delete().eq('id', id);
    if (!error) {
      setPayrolls((prev) => prev.filter((p) => p.id !== id));
    }
  };

  if (loading) {
    return <div className="text-slate-500 dark:text-slate-400">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">Bordro & Maaş Takibi</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Aydan aya brüt maaşınızı, vergi dilimlerindeki kesintileri ve net kazancınızı takip edin.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        {/* Sol Sütun: Ekleme Formu */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Yeni Bordro Ekle</h2>
          </div>

          <form onSubmit={handleAddPayroll} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Dönem (Yıl-Ay)</label>
              <input
                type="month"
                required
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Brüt Maaş</label>
              <input
                type="number"
                required
                step="0.01"
                value={grossSalary}
                onChange={(e) => setGrossSalary(e.target.value)}
                className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">SGK Kesintisi</label>
                <input
                  type="number"
                  step="0.01"
                  value={sgkDeduction}
                  onChange={(e) => setSgkDeduction(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm text-rose-600 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-slate-700 dark:text-rose-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Gelir Vergisi</label>
                <input
                  type="number"
                  step="0.01"
                  value={incomeTax}
                  onChange={(e) => setIncomeTax(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm text-rose-600 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-slate-700 dark:text-rose-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Damga Vergisi</label>
                <input
                  type="number"
                  step="0.01"
                  value={stampTax}
                  onChange={(e) => setStampTax(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm text-rose-600 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-slate-700 dark:text-rose-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">BES vb. Diğer</label>
                <input
                  type="number"
                  step="0.01"
                  value={besDeduction}
                  onChange={(e) => setBesDeduction(e.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm text-rose-600 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-slate-700 dark:text-rose-400"
                />
              </div>
            </div>

            <div className="rounded-lg bg-emerald-50 p-4 dark:bg-emerald-900/20">
              <div className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Hesaplanan Net Maaş</div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">{formatTRY(calculatedNet)}</div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || gross === 0}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isSubmitting ? 'Kaydediliyor...' : 'Bordroyu Kaydet'}
            </button>
          </form>
        </div>

        {/* Sağ Sütun: Bordro Geçmişi Listesi */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bordro Geçmişi</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase dark:border-slate-700 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Dönem</th>
                  <th className="px-4 py-3 font-medium text-right">Brüt</th>
                  <th className="px-4 py-3 font-medium text-right text-rose-500">Kesintiler (Top.)</th>
                  <th className="px-4 py-3 font-medium text-right text-emerald-500">Net Maaş</th>
                  <th className="px-4 py-3 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payrolls.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">Henüz bordro kaydı bulunmuyor.</td>
                  </tr>
                ) : (
                  payrolls.map((payroll) => {
                    const totalDeductions = payroll.sgk_deduction + payroll.income_tax + payroll.stamp_tax + payroll.bes_deduction;
                    return (
                      <tr key={payroll.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                          {payroll.period}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          {formatTRY(payroll.gross_salary)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-rose-600 dark:text-rose-400">
                          -{formatTRY(totalDeductions)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatTRY(payroll.net_salary)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(payroll.id)}
                            className="rounded p-1.5 text-slate-400 transition hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                            title="Bordroyu Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}