@echo off
chcp 65001 >nul
cd /d "%~dp0"
title FinansApp - guncellemeyi uygula

echo.
echo  ============================================================
echo   FinansApp - TUM guncellemeleri uygula
echo  ============================================================
echo.
echo   Bu dosya, bugune kadar yapilan TUM calismayi tek seferde
echo   uygular (tasarim + hesap turleri + yatirimci demosu +
echo   native mobil arayuz). Onceki zip'leri acmaniza gerek yok.
echo.
echo   Yazilacak klasorler:  app\  components\  lib\  supabase\
echo   ve tsconfig.json
echo.
echo   NOT: Ayni adli dosyalar UZERINE YAZILIR. Bu dogru olan
echo   davranis - en guncel surum bu pakettedir.
echo.
pause

if not exist "finansapp-GUNCEL.zip" (
  echo.
  echo   HATA: finansapp-GUNCEL.zip bu klasorde yok.
  echo   Zip'i bu .bat ile ayni klasore koyup tekrar calistirin.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo.
  echo   HATA: Bu .bat finans-app klasorunde calistirilmali.
  pause
  exit /b 1
)

echo   Aciliyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath 'finansapp-GUNCEL.zip' -DestinationPath '.' -Force"
if errorlevel 1 (
  echo   HATA: Acma islemi basarisiz.
  pause
  exit /b 1
)
echo   Dosyalar yazildi.
echo.

rem --- npm'i bul: PATH'te olmayabilir (onceki denemede bu yuzden hata verdi)
set "NPMCMD="
where npm >nul 2>&1 && set "NPMCMD=npm"
if not defined NPMCMD if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPMCMD=%ProgramFiles%\nodejs\npm.cmd"
if not defined NPMCMD if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPMCMD=%ProgramFiles(x86)%\nodejs\npm.cmd"
if not defined NPMCMD if exist "%APPDATA%\npm\npm.cmd" set "NPMCMD=%APPDATA%\npm\npm.cmd"
if not defined NPMCMD if exist "%LOCALAPPDATA%\Programs\nodejs\npm.cmd" set "NPMCMD=%LOCALAPPDATA%\Programs\nodejs\npm.cmd"

if not defined NPMCMD (
  echo   Node/npm bulunamadi - derleme ATLANDI.
  echo   Sorun degil: Vercel push'tan sonra kendi derlemesini alacak.
  goto :son
)

echo   Derleme kontrol ediliyor... ^(birkac dakika surebilir^)
call "%NPMCMD%" run build
if errorlevel 1 (
  echo.
  echo   ============================================================
  echo    DERLEME BASARISIZ - yukaridaki hatayi bana gonderin.
  echo    Push ETMEYIN.
  echo   ============================================================
  pause
  exit /b 1
)
echo.
echo   DERLEME BASARILI.

:son
echo.
echo  ============================================================
echo   SIRADAKI ADIM
echo  ============================================================
echo   1) GitHub Desktop'i acin
echo   2) Ozet kutusuna bir sey yazin (orn: native mobil arayuz)
echo   3) "Commit to main" - sonra "Push origin"
echo   4) Vercel otomatik dagitacak
echo.
echo   Push bittikten sonra bana "push ettim" yazin,
echo   dagitimi ben kontrol edip sonucu soylerim.
echo.
pause
