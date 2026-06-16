import StoryDb from '../data/story-db';

export default class HomePresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async loadStories() {
    try {
      this.#view.showLoading();
      const response = await this.#model.getStories({ location: 1, size: 30 });
      const stories = response.listStory || [];
      await StoryDb.saveCachedStories(stories);
      this.#view.showStories(stories);
      this.#view.showNotice?.('Data terbaru berhasil dimuat dari API.');
    } catch (error) {
      const cachedStories = await StoryDb.getCachedStories();

      if (cachedStories.length) {
        this.#view.showStories(cachedStories);
        this.#view.showNotice?.('Mode offline: data ditampilkan dari cache IndexedDB.');
        return;
      }

      this.#view.showError(error.message);
    }
  }
}
