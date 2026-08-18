@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  FinansApp - dagitimi kiran artik dosyalari temizle
echo  --------------------------------------------------
echo  supabase\ klasorunun icinde 15 Agustos'tan kalma EKSIK bir
echo  uygulama kopyasi duruyor (supabase\app, supabase\components,
echo  supabase\lib ...). TypeScript bu dosyalari da denetledigi icin
echo  son iki Vercel dagitimi HATA verdi.
echo.
echo  Silinecekler (yalnizca supabase\ ICINDEKI kopyalar):
echo      supabase\app  supabase\components  supabase\lib  supabase\public
echo      supabase\supabase  ve supabase\ icindeki proje dosyalari
echo.
echo  KORUNACAK: supabase\migrations  ve  supabase\tests
echo.
pause

if not exist "supabase\migrations" (
  echo  HATA: Bu .bat finans-app klasorunde calistirilmali.
  pause
  exit /b 1
)

for %%D in (app components lib public supabase) do (
  if exist "supabase\%%D" (
    echo  siliniyor: supabase\%%D
    rmdir /s /q "supabase\%%D"
  )
)

for %%F in (AGENTS.md CLAUDE.md components.json eslint.config.mjs next-env.d.ts next.config.ts package.json package-lock.json postcss.config.mjs proxy.ts README.md tsconfig.json vercel.json yapilacaklar-listesi.md) do (
  if exist "supabase\%%F" (
    echo  siliniyor: supabase\%%F
    del /q "supabase\%%F"
  )
)

echo.
echo  Kalanlar:
dir /b supabase
echo.
echo  Simdi derlemeyi dogruluyorum...
call npm run build
if errorlevel 1 (
  echo.
  echo  DERLEME HALA BASARISIZ - yukaridaki hatayi bana gonderin.
  pause
  exit /b 1
)

echo.
echo  DERLEME BASARILI. GitHub Desktop'tan commit + push yapabilirsiniz.
echo  Vercel push'tan sonra otomatik dagitacak.
echo.
pause
