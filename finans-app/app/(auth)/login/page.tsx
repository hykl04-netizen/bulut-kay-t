'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client'; // Supabase bağlantımız
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <ThemeToggle className="absolute right-4 top-4" />

      <div className="w-full max-w-md card-surface">
        {/* Logo ve Başlık */}
        <div className="mb-8 flex flex-col items-center">
          <Logo size="lg" className="mb-5" />
          <p className="text-sm text-muted-foreground">Kurumsal hesabınıza giriş yapın</p>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Giriş Formu */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="email">E-posta Adresi</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@mail.com"
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Şifre</Label>
              <Link
                href="/sifremi-unuttum"
                className="text-xs font-medium text-primary hover:underline dark:text-brand-gold-light"
              >
                Şifremi Unuttum
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
