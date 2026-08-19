'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wallet, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client'; // Supabase bağlantımız

// useSearchParams kullanan bileşen bir Suspense sınırı içinde olmalı
// (Next.js app router kuralı) — bu yüzden form ayrı bir bileşene alındı.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // E-posta doğrulama bağlantısı geçersiz/süresi dolmuşsa /auth/callback
  // buraya `?hata=dogrulama` ile geri gönderir. Türetilmiş değer olarak
  // okunuyor (effect + setState yerine) — gereksiz render zinciri oluşmasın.
  const verifyError =
    searchParams.get('hata') === 'dogrulama'
      ? 'Doğrulama bağlantısı geçersiz veya süresi dolmuş. Tekrar kayıt olmayı ya da şifre sıfırlamayı deneyin.'
      : '';
  const shownError = error || verifyError;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Supabase'e giriş isteği atıyoruz
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Giriş hatası:', error);
      setError(`Giriş başarısız: ${error.message}`);
      setLoading(false);
    } else {
      // Giriş başarılıysa ana sayfaya (dashboard) yönlendir.
      // router.refresh() proxy.ts'in yeni cookie'lerle tekrar çalışmasını
      // ve sunucu bileşenlerinin taze session ile render olmasını sağlar.
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-8">
        
        {/* Logo ve Başlık */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mb-4">
            <Wallet className="text-primary-foreground w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">FinansApp</h1>
          <p className="text-muted-foreground text-sm mt-1">Kurumsal hesabınıza giriş yapın</p>
        </div>

        {/* Hata Mesajı */}
        {shownError && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{shownError}</span>
          </div>
        )}

        {/* Giriş Formu */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">
              E-posta Adresi
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 focus:border-transparent transition-all"
              placeholder="ornek@mail.com"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-foreground dark:text-muted-foreground">
                Şifre
              </label>
              <Link
                href="/sifremi-unuttum"
                className="text-xs font-medium text-primary hover:underline"
              >
                Şifremi Unuttum
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:opacity-90 disabled:bg-slate-400 text-primary-foreground font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          <Link href="/demo" className="font-medium text-primary hover:underline">
            Önce demoyu inceleyin
          </Link>
          <span className="mx-2 text-border">·</span>
          Hesabınız yok mu?{' '}
          <Link href="/kayit-ol" className="font-medium text-primary hover:underline">
            Ücretsiz kaydolun
          </Link>
        </p>
      </div>
    </div>
  );
}