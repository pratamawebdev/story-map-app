export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      `${import.meta.env.BASE_URL || '/'}sw.js`,
    );
    return registration;
  } catch (error) {
    console.error('Service worker gagal didaftarkan:', error);
    return null;
  }
}

export async function showLocalNotification(title, options = {}) {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: `${import.meta.env.BASE_URL || '/'}icons/icon-192x192.png`,
    badge: `${import.meta.env.BASE_URL || '/'}icons/icon-72x72.png`,
    ...options,
  });

  return true;
}


export async function rememberLastCreatedStoryUrl(url) {
  if (!('serviceWorker' in navigator) || !url) return;

  const sendMessage = (worker) => {
    worker?.postMessage({
      type: 'LAST_CREATED_STORY',
      url,
    });
  };

  if (navigator.serviceWorker.controller) {
    sendMessage(navigator.serviceWorker.controller);
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  sendMessage(registration.active || registration.waiting || registration.installing);
}
