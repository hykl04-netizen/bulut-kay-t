@echo off
REM FinansApp - Faz 1 (workspace altyapisi) degisikliklerini GitHub'a gonderir.
REM Bu dosya finans-app klasorunun icindedir; depo koku bir ust klasordur.
cd /d "%~dp0.."
echo === Degisen dosyalar ===
git status --short
echo.
git add -A
git commit -m "Faz 1: Coklu sirket/workspace altyapisi" -m "- supabase/migrations/20260817_workspaces.sql: workspaces tablosu, 10 ana tabloya workspace_id, RLS yeniden yazimi, set_workspace_id_default tetikleyicisi, get_user_workspaces/create_workspace" -m "- team_members.account_id -> workspace_id" -m "- lib/supabase/workspace.ts + components/workspace-switcher.tsx" -m "- /api/ekip/* route'lari workspace_id'ye guncellendi"
echo.
echo === Push ===
git push origin main
echo.
echo Bitti. Pencereyi kapatabilirsiniz.
pause
