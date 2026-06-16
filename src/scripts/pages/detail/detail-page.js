import StoryApi from '../../data/api';
import StoryDb from '../../data/story-db';
import Session from '../../data/session';
import DetailPresenter from '../../presenters/detail-presenter';
import {
  createErrorTemplate,
  createLoadingTemplate,
  escapeHtml,
  showFormattedDate,
} from '../../utils';
import { createMap } from '../../utils/map';
import { parseActivePathname } from '../../routes/url-parser';

export default class DetailPage {
  #presenter = null;
  #map = null;
  #story = null;

  async render() {
    if (!Session.isAuthenticated()) {
      location.hash = '#/login';
      return '';
    }

    return `
      <section class="container detail-page" aria-labelledby="detail-title">
        <a class="back-link" href="#/">← Kembali ke daftar story</a>
        <div id="detail-container" class="detail-container" aria-live="polite">
          ${createLoadingTemplate('Memuat detail story...')}
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new DetailPresenter({ view: this, model: StoryApi });
    const { id } = parseActivePathname();
    await this.#presenter.loadStory(id);
  }

  showLoading() {
    document.querySelector('#detail-container').innerHTML = createLoadingTemplate('Memuat detail story...');
  }

  showError(message) {
    document.querySelector('#detail-container').innerHTML = createErrorTemplate(message);
  }

  showOfflineNotice(message) {
    const notice = document.querySelector('#detail-notice');
    if (notice) notice.textContent = message;
  }

  showStory(story) {
    this.#story = story;
    document.querySelector('#detail-container').innerHTML = `
      <p id="detail-notice" class="muted-text" aria-live="polite"></p>
      <article class="detail-card">
        <img class="detail-image" src="${escapeHtml(story.photoUrl)}" alt="Foto story dari ${escapeHtml(story.name)}" />
        <div class="detail-content">
          <p class="eyebrow">Detail Story</p>
          <h1 id="detail-title">${escapeHtml(story.name)}</h1>
          <time datetime="${escapeHtml(story.createdAt)}">${showFormattedDate(story.createdAt)}</time>
          <p>${escapeHtml(story.description)}</p>
          <dl class="coordinate-list">
            <div>
              <dt>Latitude</dt>
              <dd>${story.lat ?? '-'}</dd>
            </div>
            <div>
              <dt>Longitude</dt>
              <dd>${story.lon ?? '-'}</dd>
            </div>
          </dl>
          <button id="save-detail-button" class="button secondary" type="button">Simpan ke IndexedDB</button>
        </div>
      </article>
      <section class="panel" aria-labelledby="detail-map-title">
        <h2 id="detail-map-title">Lokasi Story</h2>
        <div id="detail-map" class="map detail-map" role="application" aria-label="Peta lokasi detail story"></div>
      </section>
    `;

    document.querySelector('#save-detail-button').addEventListener('click', async (event) => {
      await StoryDb.saveStory(this.#story);
      event.target.textContent = 'Tersimpan di IndexedDB';
      event.target.disabled = true;
      this.showOfflineNotice('Story ini sudah disimpan dan dapat dibuka dari halaman Story Tersimpan.');
    });

    this.#renderMap(story);
  }

  #renderMap(story) {
    const mapElement = document.querySelector('#detail-map');

    if (story.lat === null || story.lon === null) {
      mapElement.innerHTML = '<p class="empty-map">Story ini tidak memiliki data lokasi.</p>';
      return;
    }

    try {
      const L = window.L;
      const { map } = createMap('detail-map', { center: [story.lat, story.lon], zoom: 14 });
      this.#map = map;

      L.marker([story.lat, story.lon], { title: story.name })
        .addTo(this.#map)
        .bindPopup(`<strong>${escapeHtml(story.name)}</strong>`)
        .openPopup();
    } catch (error) {
      mapElement.innerHTML = '<p class="empty-map">Peta belum dapat dimuat. Cek koneksi atau cache Leaflet.</p>';
    }
  }

  destroy() {
    if (this.#map) {
      this.#map.remove();
      this.#map = null;
    }
  }
}
