import StoryDb from '../../data/story-db';
import Session from '../../data/session';
import { createErrorTemplate, createLoadingTemplate, escapeHtml, showFormattedDate } from '../../utils';

export default class SavedPage {
  #stories = [];
  #query = '';
  #sortBy = 'newest';

  async render() {
    if (!Session.isAuthenticated()) {
      location.hash = '#/login';
      return '';
    }

    return `
      <section class="container saved-page" aria-labelledby="saved-title">
        <div class="section-heading">
          <p class="eyebrow">IndexedDB</p>
          <h1 id="saved-title">Story Tersimpan</h1>
          <p class="section-description">Halaman ini membaca data story yang kamu simpan dari API ke IndexedDB. Kamu juga bisa mencari, mengurutkan, dan menghapus data lokal.</p>
        </div>

        <div class="panel saved-controls" aria-label="Kontrol story tersimpan">
          <div class="form-group">
            <label for="saved-search">Cari story</label>
            <input id="saved-search" type="search" placeholder="Cari nama atau deskripsi..." autocomplete="off" />
          </div>
          <div class="form-group">
            <label for="saved-sort">Urutkan</label>
            <select id="saved-sort">
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="name">Nama A-Z</option>
            </select>
          </div>
        </div>

        <p id="saved-count" class="muted-text" aria-live="polite"></p>
        <div id="saved-list" class="story-list saved-list" aria-live="polite">
          ${createLoadingTemplate('Memuat data dari IndexedDB...')}
        </div>
      </section>
    `;
  }

  async afterRender() {
    document.querySelector('#saved-search').addEventListener('input', (event) => {
      this.#query = event.target.value.trim().toLowerCase();
      this.#renderList();
    });

    document.querySelector('#saved-sort').addEventListener('change', (event) => {
      this.#sortBy = event.target.value;
      this.#renderList();
    });

    await this.#loadStories();
  }

  async #loadStories() {
    try {
      this.#stories = await StoryDb.getSavedStories();
      this.#renderList();
    } catch (error) {
      document.querySelector('#saved-list').innerHTML = createErrorTemplate(error.message);
    }
  }

  #getFilteredStories() {
    return this.#stories
      .filter((story) => {
        if (!this.#query) return true;
        return `${story.name} ${story.description}`.toLowerCase().includes(this.#query);
      })
      .sort((a, b) => {
        if (this.#sortBy === 'oldest') {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }

        if (this.#sortBy === 'name') {
          return a.name.localeCompare(b.name, 'id-ID');
        }

        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }

  #renderList() {
    const listElement = document.querySelector('#saved-list');
    const countElement = document.querySelector('#saved-count');
    const stories = this.#getFilteredStories();

    countElement.textContent = `${stories.length} story ditampilkan dari ${this.#stories.length} data lokal.`;

    if (!this.#stories.length) {
      listElement.innerHTML = createErrorTemplate('Belum ada story yang disimpan ke IndexedDB. Simpan story dari halaman beranda atau detail.');
      return;
    }

    if (!stories.length) {
      listElement.innerHTML = createErrorTemplate('Tidak ada story yang cocok dengan pencarian.');
      return;
    }

    listElement.innerHTML = stories.map((story) => this.#storyTemplate(story)).join('');
    this.#setupDeleteButtons();
  }

  #storyTemplate(story) {
    return `
      <article class="story-card" data-story-id="${escapeHtml(story.id)}">
        <img src="${escapeHtml(story.photoUrl)}" alt="Foto story dari ${escapeHtml(story.name)}" loading="lazy" />
        <div class="story-card-body">
          <div class="story-card-header">
            <h3>${escapeHtml(story.name)}</h3>
            <span class="badge">Tersimpan</span>
          </div>
          <p>${escapeHtml(story.description)}</p>
          <time datetime="${escapeHtml(story.createdAt)}">${showFormattedDate(story.createdAt)}</time>
          <div class="story-card-actions">
            <a class="text-link" href="#/stories/${escapeHtml(story.id)}">Lihat detail</a>
            <button class="text-button danger delete-saved-button" type="button" data-story-id="${escapeHtml(story.id)}">Hapus lokal</button>
          </div>
        </div>
      </article>
    `;
  }

  #setupDeleteButtons() {
    document.querySelectorAll('.delete-saved-button').forEach((button) => {
      button.addEventListener('click', async () => {
        await StoryDb.deleteStory(button.dataset.storyId);
        this.#stories = this.#stories.filter((story) => story.id !== button.dataset.storyId);
        this.#renderList();
      });
    });
  }
}
