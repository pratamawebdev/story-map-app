import StoryDb from '../data/story-db';

export default class DetailPresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async loadStory(id) {
    if (!id) {
      this.#view.showError('ID story tidak ditemukan.');
      return;
    }

    try {
      this.#view.showLoading();
      const response = await this.#model.getStoryDetail(id);
      await StoryDb.saveCachedStory(response.story);
      this.#view.showStory(response.story);
    } catch (error) {
      const cachedStory = await StoryDb.getCachedStory(id);

      if (cachedStory) {
        this.#view.showStory(cachedStory);
        this.#view.showOfflineNotice?.('Mode offline: detail story ditampilkan dari IndexedDB.');
        return;
      }

      this.#view.showError(error.message);
    }
  }
}
