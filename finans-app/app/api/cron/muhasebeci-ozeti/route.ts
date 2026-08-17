import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isEmailConfigured, sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Faz 6 — muhasebeciye aylık otomatik özet e-postası.
 *
 * Her ayın 1'inde çalışır (vercel.json), bir önceki ayın gelir/gider özetini
 * hesaplayıp o işletmenin muhasebeci rolündeki AKTİF ekip üyelerine gönderir.
 *
 * GEREKLİ ORTAM DEĞİŞKENLERİ:
 *   CRON_SECRET               Vercel Cron doğrulaması (diğer cron'larla ortak)
 *   SUPABASE_SERVICE_ROLE_KEY RLS'i atlayıp tüm workspace'leri tarayabilmek için
 *   EPOSTA_API_KEY / EPOSTA_GONDEREN   bkz. lib/email.ts
 *   NEXT_PUBLIC_APP_URL       e-postadaki rapor bağlantısı için
 *
 * E-posta sağlayıcısı yapılandırılmamışsa route hata vermez; "atlandı"
 * raporlar. Böylece ortam değişkeni eklenmeden de cron sessizce çalışır.
 */

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' });

function previousMonthRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: start.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
  };
}

function buildHtml(params: {
  workspaceName: string;
  periodLabel: string;
  income: number;
  expense: number;
  invoiceCount: number;
  unpaidTotal: number;
  appUrl: string | null;
}): string {
  const net = params.income - params.expense;
  const netColor = net >= 0 ? '#059669' : '#e11d48';
  const rows = [
    ['Toplam Gelir', TRY_FORMATTER.format(params.income), '#059669'],
    ['Toplam Gider', TRY_FORMATTER.format(params.expense), '#e11d48'],
    ['Net', TRY_FORMATTER.format(net), netColor],
    ['Kesilen Fatura', `${params.invoiceCount} adet`, '#334155'],
    ['Tahsil Edilmemiş', TRY_FORMATTER.format(params.unpaidTotal), '#334155'],
  ]
    .map(
      ([label, value, color]) =>
        `<tr><td style="padding:8px 0;color:#64748b;font-size:14px">${label}</td>` +
        `<td style="padding:8px 0;text-align:right;font-weight:600;color:${color};font-size:14px">${value}</td></tr>`
    )
    .join('');

  const link = params.appUrl
    ? `<p style="margin-top:24px"><a href="${params.appUrl}/raporlar" style="background:#1b2559;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Ayrıntılı raporu aç</a></p>`
    : '';

  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;padding:24px">
    <h2 style="margin:0 0 4px;color:#0f172a;font-size:20px">${params.workspaceName}</h2>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px">${params.periodLabel} dönem özeti</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0">${rows}</table>
    ${link}
    <p style="margin-top:28px;color:#94a3b8;font-size:12px">
      Bu e-postayı ${params.workspaceName} işletmesinin muhasebecisi olarak aldınız.
      FinansApp tarafından otomatik gönderilmiştir.
    </p>
  </div>`;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY eksik.' }, { status: 500 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({
      skipped: true,
      reason: 'E-posta sağlayıcısı yapılandırılmamış (EPOSTA_API_KEY / EPOSTA_GONDEREN).',
    });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const period = previousMonthRange();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;

  // Muhasebeci rolündeki aktif ekip üyeleri
  const { data: accountants, error: accErr } = await admin
    .from('team_members')
    .select('workspace_id, invited_email')
    .eq('role', 'muhasebeci')
    .eq('status', 'aktif');

  if (accErr) {
    return NextResponse.json({ error: 'Muhasebeci listesi alınamadı.' }, { status: 500 });
  }
  if (!accountants || accountants.length === 0) {
    return NextResponse.json({ sent: 0, note: 'Muhasebeci rolünde aktif üye yok.' });
  }

  const workspaceIds = [...new Set(accountants.map((a) => a.workspace_id as string))];

  const [{ data: workspaces }, { data: transactions }, { data: invoices }] = await Promise.all([
    admin.from('workspaces').select('id, name').in('id', workspaceIds),
    admin
      .from('transactions')
      .select('workspace_id, type, amount, try_equivalent')
      .in('workspace_id', workspaceIds)
      .gte('date', period.start)
      .lte('date', period.end),
    admin
      .from('invoices')
      .select('workspace_id, status, total, issue_date')
      .in('workspace_id', workspaceIds)
      .neq('status', 'iptal'),
  ]);

  const nameById = new Map((workspaces ?? []).map((w) => [w.id as string, w.name as string]));
  const results: { workspace: string; email: string; status: string }[] = [];

  for (const accountant of accountants) {
    const wsId = accountant.workspace_id as string;
    const email = accountant.invited_email as string;

    const wsTx = (transactions ?? []).filter((t) => t.workspace_id === wsId);
    const amountOf = (t: { amount: number; try_equivalent: number | null }) =>
      Number(t.try_equivalent ?? t.amount ?? 0);

    const income = wsTx.filter((t) => t.type === 'gelir').reduce((s, t) => s + amountOf(t), 0);
    const expense = wsTx.filter((t) => t.type === 'gider').reduce((s, t) => s + amountOf(t), 0);

    const wsInvoices = (invoices ?? []).filter((i) => i.workspace_id === wsId);
    const invoiceCount = wsInvoices.filter(
      (i) => (i.issue_date as string) >= period.start && (i.issue_date as string) <= period.end
    ).length;
    const unpaidTotal = wsInvoices
      .filter((i) => i.status === 'gonderildi')
      .reduce((s, i) => s + Number(i.total ?? 0), 0);

    const workspaceName = nameById.get(wsId) ?? 'İşletme';

    const result = await sendEmail({
      to: email,
      subject: `${workspaceName} — ${period.label} dönem özeti`,
      html: buildHtml({ workspaceName, periodLabel: period.label, income, expense, invoiceCount, unpaidTotal, appUrl }),
    });

    results.push({
      workspace: workspaceName,
      email,
      status: result.ok ? 'gönderildi' : result.reason,
    });
  }

  return NextResponse.json({ period: period.label, sent: results.filter((r) => r.status === 'gönderildi').length, results });
}
