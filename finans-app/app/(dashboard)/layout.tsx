'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Wallet, LayoutDashboard, ArrowRightLeft, TrendingUp, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Güvenlik Duvarı: Oturum kontrolü
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login'); // Giriş yapmamışsa kov :)
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Yükleniyor...</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sol Menü (Sidebar) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3 text-white">
          <Wallet className="w-8 h-8" />
          <h2 className="text-xl font-bold">FinansApp</h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <a href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800 text-white">
            <LayoutDashboard className="w-5 h-5" />
            Özet Paneli
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
            <ArrowRightLeft className="w-5 h-5" />
            Gelir/Gider
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 hover:text-white transition">
            <TrendingUp className="w-5 h-5" />
            Yatırımlar
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-slate-800 transition">
            <LogOut className="w-5 h-5" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Ana İçerik Alanı */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}