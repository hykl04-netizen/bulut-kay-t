'use client';

// Tarayıcı Push API ile Web Push aboneliği yönetimi. Sunucu tarafında
// `web-push` kütüphanesiyle gönderilen bildirimleri alabilmek için önce
// tarayıcıdan izin alınıp bir `PushSubscription` oluşturulması, bu da
// `push_subscriptions` tablosuna kaydedilmesi gerekir.
//
// NEXT_PUBLIC_VAPID_PUBLIC_KEY: sunucudaki VAPID_PRIVATE_KEY ile eşleşen
// açık anahtar — istemciye gönderilmesi güvenlidir (imzalamak için değil,
// yalnızca "bu abonelik hangi sunucuya ait" doğrulaması için kullanılır).

import { supabase } from '@/lib/supabase/client';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function describeDevice(): string {
  if (typeof navigator === 'undefined') return 'Bilinmeyen cihaz';
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android/i.test(ua);
  const browser = /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : /Edg/i.test(ua) ? 'Edge' : 'Tarayıcı';
  return `${browser} • ${isMobile ? 'Mobil' : 'Masaüstü'}`;
}

/** Mevcut cihazda zaten aktif bir push aboneliği olup olmadığını döner. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/** Bildirim iznini ister, tarayıcıda abone olur ve aboneliği `push_subscriptions`'a kaydeder. */
export async function subscribeToPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPushSupported()) {
    return { ok: false, error: 'Bu tarayıcı push bildirimlerini desteklemiyor.' };
  }
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { ok: false, error: 'Push bildirimleri yapılandırılmamış (NEXT_PUBLIC_VAPID_PUBLIC_KEY eksik).' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: 'Bildirim izni verilmedi.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Oturum bulunamadı.' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });
    }

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, error: 'Abonelik bilgisi eksik.' };
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth_key: json.keys.auth,
        device_label: describeDevice(),
      },
      { onConflict: 'endpoint' }
    );
    if (error) {
      console.error('Push aboneliği kaydedilemedi:', error.message);
      return {
        ok: false,
        error: error.message.includes('relation') || error.message.includes('does not exist')
          ? 'Kaydedilemedi: migration çalıştırılmamış olabilir (bkz. yapılacaklar listesi).'
          : 'Abonelik kaydedilemedi.',
      };
    }
    return { ok: true };
  } catch (err) {
    console.error('Push aboneliği oluşturulamadı:', err);
    return { ok: false, error: 'Abonelik oluşturulamadı.' };
  }
}

/** Bu cihazdaki aboneliği hem tarayıcıda hem veritabanında iptal eder. */
export async function unsubscribeFromPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isPushSupported()) return { ok: false, error: 'Desteklenmiyor.' };
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
    return { ok: true };
  } catch (err) {
    console.error('Push aboneliği iptal edilemedi:', err);
    return { ok: false, error: 'İptal edilemedi.' };
  }
}
