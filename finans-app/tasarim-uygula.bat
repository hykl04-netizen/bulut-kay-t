@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo  FinansApp - tasarim guncellemesini uygula
echo  ----------------------------------------
echo  finansapp-tasarim.zip icindeki 87 dosya app\ components\ lib\ supabase\
echo  klasorlerine acilacak; ayni adli dosyalar UZERINE YAZILACAK.
echo.
pause

if not exist "finansapp-tasarim.zip" (
  echo  HATA: finansapp-tasarim.zip bu klasorde bulunamadi.
  echo  Zip dosyasini bu .bat ile ayni klasore koyup tekrar calistirin.
  pause
  exit /b 1
)

echo  Aciliyor...
powershell -NoProfile -Command "Expand-Archive -Path 'finansapp-tasarim.zip' -DestinationPath '.' -Force"
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
