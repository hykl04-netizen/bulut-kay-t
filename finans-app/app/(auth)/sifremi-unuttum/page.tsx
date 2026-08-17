'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wallet, ArrowLeft, AlertCircle, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export default function SifremiUnuttumPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/sifre-guncelle`,
    });

    setLoading(false);

    if (error) {
      console.error('Şifre sıfırlama isteği hatası:', error);
      setError(`İstek gönderilemedi: ${error.message}`);
      return;
    }

    // Kayıtlı olmayan e-postalar için de aynı ekranı gösteriyoruz — böylece
    // bu form hangi e-postaların sistemde kayıtlı olduğunu ifşa etmiyor.
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border dark:border-border p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mb-4">
            <Wallet className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground">FinansApp</h1>
          <p className="text-muted-foreground dark:text-muted-foreground text-sm mt-1">Şifrenizi sıfırlayın</p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-start gap-3 text-sm">
              <MailCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                <strong>{email}</strong> adresine kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.
                Gelen kutunuzu (ve spam klasörünü) kontrol edin.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline dark:text-brand-gold-light"
            >
              <ArrowLeft className="w-4 h-4" />
              Giriş sayfasına dön
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border dark:border-border focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 focus:border-transparent transition-all"
                  placeholder="ornek@mail.com"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-secondary disabled:bg-slate-400 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2"
              >
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
              </button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Giriş sayfasına dön
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
