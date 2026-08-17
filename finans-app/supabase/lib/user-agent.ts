/**
 * `auth.sessions.user_agent` alanındaki ham tarayıcı user-agent metninden,
 * dış bir kütüphaneye ihtiyaç duymadan basit ve okunabilir bir
 * "cihaz + tarayıcı" özeti çıkarır. Kesin/eksiksiz bir user-agent parser
 * değildir — sadece oturum listesinde kullanıcıya anlamlı bir ipucu vermek
 * amaçlıdır.
 */
export function summarizeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) return 'Bilinmeyen cihaz';

  const ua = userAgent;
  let device = 'Bilgisayar';
  if (/iPhone/i.test(ua)) device = 'iPhone';
  else if (/iPad/i.test(ua)) device = 'iPad';
  else if (/Android/i.test(ua)) device = /Mobile/i.test(ua) ? 'Android Telefon' : 'Android Tablet';
  else if (/Macintosh/i.test(ua)) device = 'Mac';
  else if (/Windows/i.test(ua)) device = 'Windows';
  else if (/Linux/i.test(ua)) device = 'Linux';

  let browser = 'Bilinmeyen tarayıcı';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/CriOS|Chrome/i.test(ua)) browser = 'Chrome';
  else if (/FxiOS|Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  return `${device} · ${browser}`;
}
