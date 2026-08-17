'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <ThemeToggle className="absolute right-4 top-4" />

      <div className="w-full max-w-md card-surface">
        <div className="mb-8 flex flex-col items-center">
          <Logo size="lg" className="mb-5" />
          <p className="text-sm text-muted-foreground">Şifrenizi sıfırlayın</p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
              <MailCheck className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                <strong>{email}</strong> adresine kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.
                Gelen kutunuzu (ve spam klasörünü) kontrol edin.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline dark:text-brand-gold-light"
            >
              <ArrowLeft className="h-4 w-4" />
              Giriş sayfasına dön
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-posta Adresi</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@mail.com"
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
                {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
              </Button>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Giriş sayfasına dön
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
