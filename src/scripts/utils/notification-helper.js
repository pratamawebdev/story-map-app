import CONFIG from '../config';
import StoryApi from '../data/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function checkPushSupport() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function getRegistration() {
  if (!checkPushSupport()) {
    throw new Error('Browser ini belum mendukung push notification.');
  }

  return navigator.serviceWorker.ready;
}

export function isPushNotificationSupported() {
  return checkPushSupport();
}

export async function isPushSubscribed() {
  if (!checkPushSupport()) return false;
  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}

export async function subscribePushNotification() {
  const registration = await getRegistration();

  if (Notification.permission === 'denied') {
    throw new Error('Izin notifikasi diblokir. Aktifkan izin melalui pengaturan browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Izin notifikasi belum diberikan.');
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(CONFIG.VAPID_PUBLIC_KEY),
    });
  }

  await StoryApi.subscribeNotification(subscription.toJSON());
  return subscription;
}

export async function unsubscribePushNotification() {
  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return true;
  }

  await StoryApi.unsubscribeNotification({ endpoint: subscription.endpoint });
  await subscription.unsubscribe();
  return true;
}
