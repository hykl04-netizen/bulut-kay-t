import { supabase } from './client';

/**
 * Oturum açan kullanıcının "hesap id'sini" döner: kullanıcı hesap sahibiyse
 * kendi id'si, davetli bir ekip üyesiyse bağlı olduğu hesap sahibinin id'si.
 * Tüm paylaşılan veri tablolarında (transactions, bills, debts, investments,
 * assets, categories, documents, budgets, bank_accounts, payrolls) `user_id`
 * kolonu bu "hesap id'sini" tutar — bu yüzden sorgu/insert'lerde
 * `user.id` yerine bu fonksiyonun döndürdüğü değer kullanılmalı.
 *
 * RPC başarısız olursa (örn. migration henüz çalıştırılmamışsa) güvenli
 * varsayılan olarak kullanıcının kendi id'sine düşer — tek kullanıcılı eski
 * davranış bozulmaz.
 */
export async function getCurrentAccountId(userId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_account_id_for_user', { p_user_id: userId });
  if (error || !data) return userId;
  return data as string;
}
