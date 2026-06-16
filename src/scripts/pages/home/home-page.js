import StoryApi from '../../data/api';
import StoryDb from '../../data/story-db';
import Session from '../../data/session';
import HomePresenter from '../../presenters/home-presenter';
import {
  createErrorTemplate,
  createLoadingTemplate,
  escapeHtml,
  showFormattedDate,
} from '../../utils';
import { isInstallPromptAvailable, promptInstall } from '../../utils/install-helper';
import {
  isPushNotificationSupported,
  isPushSubscribed,
  subscribePushNotification,
  unsubscribePushNotification,
} from '../../utils/notification-helper';
import { createMap } from '../../utils/map';

export default class HomePage {
  #presenter = null;
  #map = null;
  #markers = new Map();
  #markerLayer = null;
  #activeStoryId = null;
  #stories = [];
  #storiesWithLocation = [];

  async render() {
    if (!Session.isAuthenticated()) {
      location.hash = '#/login';
      return '';
    }

    const user = Session.getUser();

    return `
      <section class="hero container" aria-labelledby="home-title">
        <div>
          <p class="eyebrow">Dicoding Story API</p>
          <h1 id="home-title">Bagikan cerita dan lihat lokasinya di peta</h1>
          <p class="section-description">Halo, ${escapeHtml(user?.name || 'pengguna')}. Lihat story terbaru, simpan story ke IndexedDB, dan gunakan aplikasi saat offline.</p>
          <div class="hero-actions">
            <a class="button primary" href="#/add">Tambah Story</a>
            <a class="button secondary" href="#/saved">Story Tersimpan</a>
            <button id="install-button" class="button ghost" type="button" hidden>Install Aplikasi</button>
          </div>
        </div>
      </section>

      <section class="container pwa-toolbar" aria-labelledby="pwa-title">
        <div class="panel pwa-panel">
          <div>
            <p class="eyebrow">PWA & Notification</p>
            <h2 id="pwa-title">Kontrol aplikasi</h2>
            <p id="pwa-status" class="muted-text">Gunakan tombol ini untuk mengaktifkan push notification dari server.</p>
          </div>
          <div class="pwa-actions">
            <button id="push-toggle-button" class="button secondary" type="button">Cek notifikasi...</button>
            <span id="connection-badge" class="badge">${navigator.onLine ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </section>

      <section class="content-grid container" aria-label="Daftar story dan peta lokasi">
        <div class="panel story-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Story Terbaru</p>
              <h2>Daftar Story</h2>
              <p id="story-source-note" class="muted-text" aria-live="polite"></p>
            </div>
            <button id="refresh-button" class="button ghost" type="button">Muat ulang</button>
          </div>
          <div id="story-list" class="story-list" aria-live="polite"></div>
        </div>

        <aside class="panel map-panel" aria-labelledby="map-title">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Peta Digital</p>
              <h2 id="map-title">Lokasi Story</h2>
            </div>
          </div>
          <div id="story-map" class="map" role="application" aria-label="Peta lokasi story"></div>
          <p class="map-help">Pilih layer peta melalui tombol layer di pojok kanan atas peta.</p>
        </aside>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new HomePresenter({ view: this, model: StoryApi });
    document.querySelector('#refresh-button').addEventListener('click', () => this.#presenter.loadStories());
    this.#setupPushControl();
    this.#setupInstallControl();
    this.#setupConnectionBadge();
    await this.#presenter.loadStories();
  }

  showLoading() {
    document.querySelector('#story-list').innerHTML = createLoadingTemplate('Memuat story dari API...');
  }

  showError(message) {
    document.querySelector('#story-list').innerHTML = createErrorTemplate(message);
  }

  showNotice(message) {
    const noteElement = document.querySelector('#story-source-note');
    if (noteElement) noteElement.textContent = message;
  }

  showStories(stories) {
    this.#stories = stories;
    this.#storiesWithLocation = stories.filter((story) => story.lat !== null && story.lon !== null);
    const listElement = document.querySelector('#story-list');

    if (!stories.length) {
      listElement.innerHTML = createErrorTemplate('Belum ada story yang tersedia.');
      this.#renderMap([]);
      return;
    }

    listElement.innerHTML = stories.map((story) => this.#storyItemTemplate(story)).join('');
    this.#renderMap(this.#storiesWithLocation);
    this.#setupStoryListInteraction();
    this.#setupSaveButtons();
  }

  #storyItemTemplate(story) {
    const hasLocation = story.lat !== null && story.lon !== null;

    return `
      <article class="story-card" id="story-card-${escapeHtml(story.id)}" tabindex="0" data-story-id="${escapeHtml(story.id)}">
        <img src="${escapeHtml(story.photoUrl)}" alt="Foto story dari ${escapeHtml(story.name)}" loading="lazy" />
        <div class="story-card-body">
          <div class="story-card-header">
            <h3>${escapeHtml(story.name)}</h3>
            <span class="badge">${hasLocation ? 'Ada lokasi' : 'Tanpa lokasi'}</span>
          </div>
          <p>${escapeHtml(story.description)}</p>
          <time datetime="${escapeHtml(story.createdAt)}">${showFormattedDate(story.createdAt)}</time>
          <div class="story-card-actions">
            <a class="text-link" href="#/stories/${escapeHtml(story.id)}">Lihat detail</a>
            <button class="text-button save-story-button" type="button" data-story-id="${escapeHtml(story.id)}">Simpan offline</button>
            ${hasLocation ? '<button class="text-button focus-marker-button" type="button">Sorot marker</button>' : ''}
          </div>
        </div>
      </article>
    `;
  }

  #renderMap(stories) {
    const mapElement = document.querySelector('#story-map');

    if (!stories.length) {
      mapElement.innerHTML = '<p class="empty-map">Tidak ada data lokasi untuk ditampilkan.</p>';
      return;
    }

    const L = window.L;

    try {
      if (!this.#map) {
        const { map } = createMap('story-map');
        this.#map = map;
        this.#markerLayer = L.layerGroup().addTo(this.#map);
      }

      this.#markerLayer.clearLayers();
      this.#markers.clear();

      const bounds = [];

      stories.forEach((story) => {
        const marker = L.marker([story.lat, story.lon], {
          title: story.name,
        }).addTo(this.#markerLayer);

        marker.bindPopup(`
          <strong>${escapeHtml(story.name)}</strong><br>
          <span>${escapeHtml(story.description.slice(0, 100))}</span><br>
          <a href="#/stories/${escapeHtml(story.id)}">Lihat detail</a>
        `);

        marker.on('click', () => this.#setActiveStory(story.id, { openPopup: false, scrollCard: true }));
        this.#markers.set(story.id, marker);
        bounds.push([story.lat, story.lon]);
      });

      this.#map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    } catch (error) {
      mapElement.innerHTML = '<p class="empty-map">Peta belum dapat dimuat. Cek koneksi atau cache Leaflet.</p>';
    }
  }

  #setupStoryListInteraction() {
    document.querySelectorAll('.story-card').forEach((card) => {
      const storyId = card.dataset.storyId;
      const button = card.querySelector('.focus-marker-button');

      const focusMarker = () => this.#setActiveStory(storyId, { openPopup: true, scrollCard: false });

      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target === card) {
          focusMarker();
        }
      });

      if (button) {
        button.addEventListener('click', focusMarker);
      }
    });
  }

  #setupSaveButtons() {
    document.querySelectorAll('.save-story-button').forEach((button) => {
      button.addEventListener('click', async () => {
        const story = this.#stories.find((item) => item.id === button.dataset.storyId);
        if (!story) return;

        await StoryDb.saveStory(story);
        button.textContent = 'Tersimpan';
        button.disabled = true;
        this.showNotice('Story berhasil disimpan ke IndexedDB. Buka menu Story Tersimpan untuk membaca atau menghapusnya.');
      });
    });
  }

  async #setupPushControl() {
    const button = document.querySelector('#push-toggle-button');
    const status = document.querySelector('#pwa-status');

    if (!isPushNotificationSupported()) {
      button.disabled = true;
      button.textContent = 'Push tidak didukung';
      status.textContent = 'Browser ini belum mendukung push notification.';
      return;
    }

    const updateButton = async () => {
      const subscribed = await isPushSubscribed();
      button.textContent = subscribed ? 'Nonaktifkan Notifikasi' : 'Aktifkan Notifikasi';
      status.textContent = subscribed
        ? 'Push notification aktif. Server akan mengirim notifikasi saat story baru berhasil dibuat.'
        : 'Push notification belum aktif. Aktifkan agar server dapat mengirim notifikasi.';
    };

    await updateButton();

    button.addEventListener('click', async () => {
      try {
        button.disabled = true;
        const subscribed = await isPushSubscribed();

        if (subscribed) {
          await unsubscribePushNotification();
          status.textContent = 'Langganan push notification berhasil dinonaktifkan.';
        } else {
          await subscribePushNotification();
          status.textContent = 'Langganan push notification berhasil diaktifkan.';
        }

        await updateButton();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  #setupInstallControl() {
    const button = document.querySelector('#install-button');
    const updateVisibility = () => {
      button.hidden = !isInstallPromptAvailable();
    };

    updateVisibility();
    window.addEventListener('pwa-install-available', updateVisibility, { once: true });
    window.addEventListener('pwa-install-complete', updateVisibility, { once: true });

    button.addEventListener('click', async () => {
      await promptInstall();
      updateVisibility();
    });
  }

  #setupConnectionBadge() {
    const badge = document.querySelector('#connection-badge');
    const update = () => {
      badge.textContent = navigator.onLine ? 'Online' : 'Offline';
    };

    window.addEventListener('online', update);
    window.addEventListener('offline', update);
  }

  #setActiveStory(storyId, { openPopup, scrollCard }) {
    this.#activeStoryId = storyId;

    document.querySelectorAll('.story-card').forEach((card) => {
      card.classList.toggle('active', card.dataset.storyId === storyId);
    });

    const marker = this.#markers.get(storyId);
    if (marker && this.#map) {
      this.#map.setView(marker.getLatLng(), 14, { animate: true });
      if (openPopup) marker.openPopup();
    }

    if (scrollCard) {
      document.querySelector(`#story-card-${CSS.escape(storyId)}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }

  destroy() {
    if (this.#map) {
      this.#map.remove();
      this.#map = null;
      this.#markerLayer = null;
      this.#markers.clear();
    }
  }
}
