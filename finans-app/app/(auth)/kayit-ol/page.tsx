'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Wallet, ArrowRight, AlertCircle, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

/**
 * Faz 2 — self-servis kayıt sayfası.
 *
 * Kayıt sırasında girilen şirket adı `options.data.company_name` ile
 * auth.users.raw_user_meta_data'ya yazılır; DB tarafındaki
 * `create_default_workspace_for_new_user` trigger'ı yeni kullanıcının
 * workspace'ini bu adla oluşturur (bkz. 20260818_onboarding.sql).
 *
 * Supabase'de "Confirm email" açıksa signUp bir oturum DÖNDÜRMEZ — bu durumda
 * kullanıcıya "e-postanı kontrol et" ekranı gösterilir. Doğrulama linki
 * `/auth/callback` route'una düşer, oradan kurulum sihirbazına yönlendirilir.
 */

const MIN_PASSWORD_LENGTH = 8;

export default function KayitOlPage() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) {
      setError('Lütfen işletme adınızı girin.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
      return;
    }
    if (password !== passwordAgain) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { company_name: companyName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/kurulum')}`,
      },
    });

    if (signUpError) {
      setError(`Kayıt başarısız: ${signUpError.message}`);
      setLoading(false);
      return;
    }

    // Supabase, zaten kayıtlı bir e-posta için (kullanıcı sayımını sızdırmamak
    // adına) hata yerine "identities" dizisi boş bir kullanıcı döner.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('Bu e-posta adresi zaten kayıtlı. Giriş yapmayı veya şifrenizi sıfırlamayı deneyin.');
      setLoading(false);
      return;
    }

    // Oturum döndüyse e-posta doğrulaması kapalı demektir — doğrudan sihirbaza.
    if (data.session) {
      router.push('/kurulum');
      router.refresh();
      return;
    }

    setEmailSent(true);
    setLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-8 text-center">
          <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mb-4 mx-auto">
            <MailCheck className="text-white w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">E-postanızı kontrol edin</h1>
          <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
            <span className="font-medium text-foreground">{email}</span> adresine bir doğrulama
            bağlantısı gönderdik. Bağlantıya tıkladığınızda hesabınız etkinleşecek ve kurulum
            sihirbazı açılacak.
          </p>
          <p className="text-muted-foreground text-xs mt-4">
            E-posta birkaç dakika içinde gelmezse spam/gereksiz klasörünü kontrol edin.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mb-4">
            <Wallet className="text-primary-foreground w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">FinansApp&apos;e kaydolun</h1>
          <p className="text-muted-foreground text-sm mt-1">İşletmenizin finansını dakikalar içinde toplayın</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-5">
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-foreground mb-1">
              İşletme Adı
            </label>
            <input
              id="company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 focus:border-transparent transition-all"
              placeholder="Örn. Yıldız Danışmanlık"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              E-posta Adresi
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 focus:border-transparent transition-all"
              placeholder="ornek@mail.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 focus:border-transparent transition-all"
              placeholder="En az 8 karakter"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>

          <div>
            <label htmlFor="password2" className="block text-sm font-medium text-foreground mb-1">
              Şifre (Tekrar)
            </label>
            <input
              id="password2"
              type="password"
              value={passwordAgain}
              onChange={(e) => setPasswordAgain(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-500 dark:bg-secondary dark:text-slate-100 focus:border-transparent transition-all"
              placeholder="••••••••"
              minLength={MIN_PASSWORD_LENGTH}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:opacity-90 disabled:bg-slate-400 text-primary-foreground font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-2"
          >
            {loading ? 'Hesap oluşturuluyor...' : 'Hesap Oluştur'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Zaten hesabınız var mı?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Giriş yapın
          </Link>
        </p>
      </div>
    </div>
  );
}
