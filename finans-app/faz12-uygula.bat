@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  FinansApp - Faz 12 (yatirimci demosu) uygula
echo  ----------------------------------------
echo  finansapp-faz12.zip icindeki 28 dosya app\ components\ lib\ supabase\
echo  klasorlerine acilacak; ayni adli dosyalar UZERINE YAZILACAK.
echo.
pause

if not exist "finansapp-faz12.zip" (
  echo  HATA: finansapp-faz12.zip bu klasorde bulunamadi.
  echo  Zip dosyasini bu .bat ile ayni klasore koyup tekrar calistirin.
  pause
  exit /b 1
)

echo  Aciliyor...
powershell -NoProfile -Command "Expand-Archive -Path 'finansapp-faz12.zip' -DestinationPath '.' -Force"
if errorlevel 1 (
  echo  HATA: Acma islemi basarisiz.
  pause
  exit /b 1
)

echo.
echo  Tamam. Simdi kontrol icin:
echo      npm run dev
echo.
echo  Sorun yoksa push icin temizle-ve-push.bat calistirabilirsiniz.
echo.
pause
