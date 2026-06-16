import StoryDb from '../data/story-db';
import { rememberLastCreatedStoryUrl } from '../utils/service-worker';

function isNetworkError(error) {
  return !navigator.onLine || error instanceof TypeError || /fetch|network|Failed/i.test(error.message);
}

export default class AddStoryPresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async #saveOfflineStory({ description, photo, lat, lon }) {
    await StoryDb.savePendingStory({ description, photo, lat, lon });
    this.#view.showSuccess(
      'Koneksi offline. Story disimpan sementara di IndexedDB dan akan dikirim saat online.',
    );
    this.#view.resetForm();
    await this.#view.renderPendingStatus?.();
  }

  async addStory({ description, photo, lat, lon }) {
    if (!description || description.length < 8) {
      this.#view.showError('Deskripsi minimal 8 karakter.');
      return;
    }

    if (!photo) {
      this.#view.showError('Foto wajib dipilih dari file atau kamera.');
      return;
    }

    if (lat === null || lon === null) {
      this.#view.showError('Pilih lokasi story dengan klik pada peta.');
      return;
    }

    if (!navigator.onLine) {
      await this.#saveOfflineStory({ description, photo, lat, lon });
      return;
    }

    try {
      this.#view.setLoading(true);
      await this.#model.addStory({ description, photo, lat, lon });
      try {
        const latestResponse = await this.#model.getStories({ page: 1, size: 1, location: 1 });
        const latestStory = latestResponse.listStory?.[0];
        if (latestStory?.id) {
          await rememberLastCreatedStoryUrl(`./#/stories/${latestStory.id}`);
        }
      } catch (error) {
        await rememberLastCreatedStoryUrl('./#/');
      }
      this.#view.showSuccess('Story berhasil ditambahkan. Jika push aktif, notifikasi akan dikirim dari server.');
      this.#view.resetForm();
      setTimeout(() => {
        location.hash = '#/';
      }, 700);
    } catch (error) {
      if (isNetworkError(error)) {
        await this.#saveOfflineStory({ description, photo, lat, lon });
        return;
      }

      this.#view.showError(error.message);
    } finally {
      this.#view.setLoading(false);
    }
  }
}
