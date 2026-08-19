-- 20260831 — RLS initplan düzeltmesi + eksik yabancı anahtar indeksleri.
--
-- PERFORMANS: RLS politikalarında auth.uid() SATIR BAŞINA yeniden
-- değerlendiriliyordu. (select auth.uid()) yazımı Postgres'in bunu bir
-- InitPlan olarak bir kez hesaplamasını sağlar. 10 satırda fark yok;
-- 50.000 hareketli bir hesapta tablo taramasının maliyetini ikiye katlıyor.
-- Politikaların MANTIĞI değişmiyor, yalnızca değerlendirme biçimi.

drop policy if exists "Workspace görüntüleme" on public.workspaces;
create policy "Workspace görüntüleme" on public.workspaces for select
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.team_members tm
      where tm.workspace_id = workspaces.id
        and tm.member_user_id = (select auth.uid())
        and tm.status = 'aktif'
    )
  );

drop policy if exists "Workspace sahibi güncelleyebilir" on public.workspaces;
create policy "Workspace sahibi güncelleyebilir" on public.workspaces for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Hesap üyeleri listeyi görebilir" on public.team_members;
create policy "Hesap üyeleri listeyi görebilir" on public.team_members for select
  using (
    public.has_account_role(workspace_id, array['yonetici'])
    or member_user_id = (select auth.uid())
  );

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own on public.notification_preferences for select
  using ((select auth.uid()) = user_id);
drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own on public.notification_preferences for insert
  with check ((select auth.uid()) = user_id);
drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own on public.notification_preferences for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists notification_preferences_delete_own on public.notification_preferences;
create policy notification_preferences_delete_own on public.notification_preferences for delete
  using ((select auth.uid()) = user_id);

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions for select
  using ((select auth.uid()) = user_id);
drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
create policy push_subscriptions_insert_own on public.push_subscriptions for insert
  with check ((select auth.uid()) = user_id);
drop policy if exists push_subscriptions_update_own on public.push_subscriptions;
create policy push_subscriptions_update_own on public.push_subscriptions for update
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own on public.push_subscriptions for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Kendi bildirim kaydını görebilir" on public.push_notification_log;
create policy "Kendi bildirim kaydını görebilir" on public.push_notification_log for select
  using (user_id = (select auth.uid()));

-- YABANCI ANAHTAR İNDEKSLERİ: join ve silme işlemlerinde tam tablo
-- taramasını önler. Bir kullanıcı/hesap silindiğinde Postgres bu sütunlar
-- üzerinden referans arar; indeks yoksa her tabloyu baştan sona tarar.
create index if not exists assets_user_idx on public.assets (user_id);
create index if not exists backup_settings_user_idx on public.backup_settings (user_id);
create index if not exists bank_accounts_user_idx on public.bank_accounts (user_id);
create index if not exists bills_user_idx on public.bills (user_id);
create index if not exists bills_category_idx on public.bills (category_id);
create index if not exists budgets_user_idx on public.budgets (user_id);
create index if not exists budgets_category_idx on public.budgets (category_id);
create index if not exists categories_user_idx on public.categories (user_id);
create index if not exists company_settings_user_idx on public.company_settings (user_id);
create index if not exists customers_user_idx on public.customers (user_id);
create index if not exists debts_user_idx on public.debts (user_id);
create index if not exists documents_user_idx on public.documents (user_id);
create index if not exists investments_user_idx on public.investments (user_id);
create index if not exists invoice_items_user_idx on public.invoice_items (user_id);
create index if not exists invoice_items_workspace_idx on public.invoice_items (workspace_id);
create index if not exists invoices_user_idx on public.invoices (user_id);
create index if not exists payrolls_user_idx on public.payrolls (user_id);
create index if not exists period_locks_user_idx on public.period_locks (user_id);
create index if not exists team_members_invited_by_idx on public.team_members (invited_by);
create index if not exists transactions_user_idx on public.transactions (user_id);
create index if not exists transactions_category_idx on public.transactions (category_id);
