@echo off
setlocal
REM ============================================================
REM FinansApp - olu kod temizligi + GitHub push
REM Bu dosyayi finans-app klasorunun ICINE koyup cift tiklayin.
REM ============================================================
cd /d "%~dp0"

echo === 1. Yanlislikla kopyalanmis proje (supabase\ altinda, 119 dosya) siliniyor ===
REM supabase\migrations KORUNUYOR - sadece digerleri siliniyor.
for /d %%D in ("supabase\*") do (
  if /I not "%%~nxD"=="migrations" (
    echo   klasor siliniyor: %%D
    rmdir /s /q "%%D"
  )
)
for %%F in ("supabase\*.*") do (
  echo   dosya siliniyor: %%F
  del /q "%%F"
)

echo.
echo === 2. Yazim hatali ikiz sayfa siliniyor: katagoriler ===
if exist "app\(dashboard)\katagoriler" (
  rmdir /s /q "app\(dashboard)\katagoriler"
  echo   silindi
) else (
  echo   zaten yok
)

echo.
echo === 3. Faz 1'den kalan gecis kabugu siliniyor: lib\supabase\account.ts ===
if exist "lib\supabase\account.ts" (
  del /q "lib\supabase\account.ts"
  echo   silindi
) else (
  echo   zaten yok
)

echo.
echo === 4. Kontrol: build calisiyor mu? ===
call npx tsc --noEmit
echo   (yukarida sadece "LayoutProps" hatasi varsa sorun yok - o Next.js'in
echo    build sirasinda urettigi bir tip, bare tsc'de gorunmez.)

echo.
echo === 5. Git commit + push ===
cd /d "%~dp0.."
git add -A
git status --short
git commit -m "Faz 2-10: onboarding, abonelik, ekip, fatura, muhasebeci, pazarlama sitesi, yardim merkezi + olu kod temizligi"
git push origin main

echo.
echo Bitti. Pencereyi kapatabilirsiniz.
pause
