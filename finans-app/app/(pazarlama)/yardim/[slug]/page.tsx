import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Info, PlayCircle } from 'lucide-react';
import { HELP_ARTICLES, getArticle } from '@/lib/help-articles';

export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: 'Yardım Merkezi — FinansApp' };
  return {
    title: `${article.title} — FinansApp Yardım`,
    description: article.summary,
  };
}

export default async function YardimMakalePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href="/yardim"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Yardım Merkezi
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-foreground">{article.title}</h1>
      <p className="mt-2 text-muted-foreground">{article.summary}</p>

      {article.videoUrl && (
        <a
          href={article.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
        >
          <PlayCircle className="h-4 w-4 text-accent" />
          Videolu anlatımı izleyin
        </a>
      )}

      <article className="mt-8 space-y-8">
        {article.sections.map((section, index) => (
          <section key={index}>
            {section.heading && (
              <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
            )}

            {section.paragraphs?.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}

            {section.steps && (
              <ol className="mt-3 space-y-2">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-foreground">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            )}

            {section.note && (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{section.note}</span>
              </p>
            )}
          </section>
        ))}
      </article>

      <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-sm">
        <p className="text-muted-foreground">
          Bu rehber sorunuzu çözmediyse{' '}
          <Link href="/iletisim" className="text-primary hover:underline">
            bize yazın
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
