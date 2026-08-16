'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client'; // Supabase bağlantımız

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <div className="min-h-screen flex items-center justify-center bg-muted dark:bg-primary p-4">
      <div className="w-full max-w-md bg-card dark:bg-primary rounded-2xl shadow-xl border border-border dark:border-border p-8">
        
        {/* Logo ve Başlık */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mb-4">
            <Wallet className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground dark:text-foreground">FinansAsistanım</h1>
          <p className="text-muted-foreground dark:text-muted-foreground text-sm mt-1">Hesabınıza giriş yapın</p>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
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
              className="w-full px-4 py-3 rounded-lg border border-border dark:border-border focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 focus:border-transparent transition-all"
              placeholder="ornek@mail.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground dark:text-muted-foreground mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border dark:border-border focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-secondary disabled:bg-slate-400 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
        
      </div>
    </div>
  );
}