// Bu script, sayfa boyanmadan (paint) önce senkron çalışır ki kullanıcı önce
// açık temayı görüp sonra koyu temaya geçiş "yanıp sönmesi" (FOUC) yaşamasın.
// Öncelik: localStorage'daki kullanıcı tercihi → yoksa işletim sistemi tercihi.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var isDark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;
