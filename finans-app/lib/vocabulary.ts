import type { WorkspaceType } from '@/lib/workspace-types';

/**
 * Hesap tipine göre EKRAN İÇİ sözlük.
 *
 * Menü Faz 11'de tipe göre şekilleniyordu ama sayfaların kendi başlıkları
 * hep ticari dille yazılıydı. Aile hesabına geçen bir kullanıcı üst
 * çubukta "Hesap Ayarları" görürken sayfanın içinde "Şirket Ayarları",
 * "faturalarınızı ekleyin" gibi ifadelerle karşılaşıyordu — aynı ekranda
 * iki ayrı ürün konuşuyor gibi.
 *
 * Buradaki metinler tek yerde durur ki bir sonraki ekran eklendiğinde
 * çeviri yeniden icat edilmesin.
 */

interface Vocabulary {
  /** Gelir/gider ekranı */
  transactionsTitle: string;
  transactionsDescription: string;
  incomeWord: string;
  expenseWord: string;
  addTransaction: string;
  /** Ayarlar ekranı */
  settingsTitle: string;
  settingsDescription: string;
  orgNameLabel: string;
  orgNamePlaceholder: string;
}

const AILE: Vocabulary = {
  transactionsTitle: 'Para Giriş ve Harcamalar',
  transactionsDescription:
    'Eve giren parayı ve yapılan harcamaları buraya yazın. Ay sonunda ne kaldığını Özet ekranında görürsünüz.',
  incomeWord: 'Para girişi',
  expenseWord: 'Harcama',
  addTransaction: 'Yeni Kayıt Ekle',
  settingsTitle: 'Hesap Ayarları',
  settingsDescription:
    'Burada belirlediğiniz ad, Raporlar sayfasından indirilen PDF raporların üst kısmında görünür.',
  orgNameLabel: 'Hesap Adı',
  orgNamePlaceholder: 'Örn. Yılmaz Ailesi',
};

const ISLETME: Vocabulary = {
  transactionsTitle: 'Gelir ve Gider Yönetimi',
  transactionsDescription:
    'Finansal hareketlerinizi profesyonel kategorilerle takip edin, faturalarınızı ekleyin.',
  incomeWord: 'Gelir',
  expenseWord: 'Gider',
  addTransaction: 'Yeni İşlem Ekle',
  settingsTitle: 'Şirket Ayarları',
  settingsDescription:
    'Burada belirlediğiniz şirket adı ve logo, Raporlar sayfasından indirilen PDF raporların üst kısmında görünür.',
  orgNameLabel: 'Şirket / İşletme Adı',
  orgNamePlaceholder: 'Örn. Yıldız Teknoloji A.Ş.',
};

export function vocabularyFor(type: WorkspaceType): Vocabulary {
  return type === 'aile' ? AILE : ISLETME;
}
