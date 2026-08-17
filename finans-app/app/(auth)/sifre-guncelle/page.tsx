'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function SifreGuncellePage() {
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase, e-postadaki sıfırlama linkindeki token'ı otomatik olarak
    // (URL fragmentinden) yakalayıp geçici bir kurtarma (recovery) oturumu
    // açar. Bu, PASSWORD_RECOVERY event'i tetiklendiğinde veya mevcut bir
    // oturum bulunduğunda formu aktif hale getiriyoruz.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setSessionReady(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      console.error('Şifre güncelleme hatası:', error);
      setError(`Şifre güncellenemedi: ${error.message}`);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <ThemeToggle className="absolute right-4 top-4" />

      <div className="w-full max-w-md card-surface">
        <div className="mb-8 flex flex-col items-center">
          <Logo size="lg" className="mb-5" />
          <p className="text-sm text-muted-foreground">Yeni şifrenizi belirleyin</p>
        </div>

        {success ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Şifreniz güncellendi. Giriş sayfasına yönlendiriliyorsunuz...
          </div>
        ) : !sessionReady ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            Bu bağlantı geçersiz ya da süresi dolmuş olabilir. E-postanızdaki bağlantıya tıklayarak buraya geldiğinizden emin olun.
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
                <Label htmlFor="password">Yeni Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="passwordConfirm">Yeni Şifre (Tekrar)</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
                {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
