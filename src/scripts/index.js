import '../styles/styles.css';

import App from './pages/app';
import { initInstallPrompt } from './utils/install-helper';
import { registerServiceWorker } from './utils/service-worker';
import { registerOnlineSync, syncPendingStories } from './utils/sync-manager';

initInstallPrompt();

window.addEventListener('load', async () => {
  await registerServiceWorker();
  registerOnlineSync();

  if (navigator.onLine) {
    syncPendingStories().catch((error) => {
      console.error('Sinkronisasi awal gagal:', error);
    });
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
    navList: document.querySelector('#nav-list'),
  });

  await app.renderPage();

  window.addEventListener('hashchange', async () => {
    await app.renderPage();
  });
});
