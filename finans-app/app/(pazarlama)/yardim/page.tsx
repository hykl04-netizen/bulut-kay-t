import Link from 'next/link';
import type { Metadata } from 'next';
import { BookOpen, ArrowRight, Mail } from 'lucide-react';
import { HELP_ARTICLES, HELP_CATEGORIES } from '@/lib/help-articles';

export const metadata: Metadata = {
  title: 'Yardım Merkezi — FinansApp',
  description: 'Kurulum, kayıt girme, fatura kesme ve abonelik hakkında adım adım rehberler.',
};

export default function YardimPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-accent" />
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Yardım Merkezi</h1>
      </div>
      <p className="mt-3 text-muted-foreground">
        Adım adım rehberler. Aradığınızı bulamazsanız{' '}
        <Link href="/iletisim" className="text-primary hover:underline">
          bize yazın
        </Link>
        .
      </p>

      <div className="mt-10 space-y-10">
        {HELP_CATEGORIES.map((category) => {
          const articles = HELP_ARTICLES.filter((a) => a.category === category.key);
          if (articles.length === 0) return null;
          return (
            <section key={category.key}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {category.label}
              </h2>
              <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
                {articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/yardim/${article.slug}`}
                      className="flex items-center justify-between gap-4 p-5 transition hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{article.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{article.summary}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Mail className="h-5 w-5 text-accent" />
            Hâlâ takıldınız mı?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Genellikle bir iş günü içinde yanıt veriyoruz.
          </p>
        </div>
        <Link
          href="/iletisim"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary transition"
        >
          Destek al
        </Link>
      </div>
    </div>
  );
}
