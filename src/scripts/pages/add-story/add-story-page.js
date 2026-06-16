import StoryApi from '../../data/api';
import StoryDb from '../../data/story-db';
import Session from '../../data/session';
import AddStoryPresenter from '../../presenters/add-story-presenter';
import { stopMediaStream } from '../../utils';
import { createMap } from '../../utils/map';
import { syncPendingStories } from '../../utils/sync-manager';

export default class AddStoryPage {
  #presenter = null;
  #map = null;
  #selectedMarker = null;
  #selectedLat = null;
  #selectedLon = null;
  #stream = null;
  #capturedPhoto = null;

  async render() {
    if (!Session.isAuthenticated()) {
      location.hash = '#/login';
      return '';
    }

    return `
      <section class="container add-page" aria-labelledby="add-title">
        <div class="section-heading">
          <p class="eyebrow">Tambah Story</p>
          <h1 id="add-title">Buat story baru</h1>
          <p class="section-description">Isi deskripsi, pilih foto dari file atau kamera, lalu klik lokasi story pada peta. Jika offline, story akan masuk antrean IndexedDB dan dikirim otomatis saat online.</p>
        </div>

        <form id="add-story-form" class="form add-story-grid" novalidate>
          <div class="panel form-panel">
            <div class="form-group">
              <label for="description">Deskripsi Story</label>
              <textarea id="description" name="description" rows="5" required minlength="8" placeholder="Ceritakan pengalamanmu..."></textarea>
              <small>Minimal 8 karakter.</small>
            </div>

            <fieldset class="fieldset photo-fieldset">
              <legend>Foto Story</legend>

              <div class="form-group">
                <label for="photo">Upload foto</label>
                <input id="photo" name="photo" type="file" accept="image/*" />
              </div>

              <div class="camera-box">
                <video id="camera-preview" class="camera-preview" autoplay playsinline muted aria-label="Pratinjau kamera"></video>
                <canvas id="camera-canvas" class="visually-hidden"></canvas>
                <div class="camera-actions">
                  <button id="start-camera-button" class="button secondary" type="button">Buka Kamera</button>
                  <button id="capture-button" class="button secondary" type="button" disabled>Ambil Foto</button>
                  <button id="stop-camera-button" class="button ghost" type="button" disabled>Tutup Kamera</button>
                </div>
              </div>

              <div class="photo-preview-wrapper">
                <p class="photo-preview-title">Preview Foto</p>
                <img id="photo-preview" class="photo-preview" alt="Pratinjau foto story" hidden />
              </div>
            </fieldset>
          </div>

          <div class="panel map-form-panel">
            <div class="form-group">
              <label for="location-info">Lokasi Story</label>
              <input id="location-info" type="text" value="Belum memilih lokasi" readonly aria-describedby="location-help" />
              <small id="location-help">Klik pada peta untuk menentukan latitude dan longitude.</small>
            </div>

            <div id="add-map" class="map add-map" role="application" aria-label="Peta untuk memilih lokasi story"></div>

            <div class="offline-sync-box">
              <p id="pending-status" class="muted-text" aria-live="polite">Mengecek antrean story offline...</p>
              <button id="sync-pending-button" class="button secondary full" type="button">Sync Story Tertunda</button>
            </div>

            <div id="form-message" class="form-message" role="status" aria-live="polite"></div>
            <button id="submit-button" class="button primary full" type="submit">Kirim Story</button>
          </div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new AddStoryPresenter({ view: this, model: StoryApi });
    this.#setupMap();
    this.#setupForm();
    this.#setupCamera();
    this.#setupSyncButton();
    await this.renderPendingStatus();
  }

  #setupMap() {
    const mapElement = document.querySelector('#add-map');

    try {
      const { map } = createMap('add-map', { zoom: 5 });
      this.#map = map;

      this.#map.on('click', (event) => {
        this.#selectedLat = event.latlng.lat;
        this.#selectedLon = event.latlng.lng;

        if (this.#selectedMarker) {
          this.#selectedMarker.setLatLng(event.latlng);
        } else {
          this.#selectedMarker = window.L.marker(event.latlng, {
            title: 'Lokasi story terpilih',
          }).addTo(this.#map);
        }

        this.#selectedMarker.bindPopup('Lokasi story dipilih').openPopup();
        document.querySelector('#location-info').value =
          `${this.#selectedLat.toFixed(6)}, ${this.#selectedLon.toFixed(6)}`;
      });
    } catch (error) {
      mapElement.innerHTML = '<p class="empty-map">Peta belum dapat dimuat. Buka aplikasi saat online terlebih dahulu agar aset peta tersimpan.</p>';
    }
  }

  #setupForm() {
    const form = document.querySelector('#add-story-form');
    const photoInput = document.querySelector('#photo');

    photoInput.addEventListener('change', () => {
      const file = photoInput.files[0];
      this.#capturedPhoto = null;
      if (file) this.#previewPhoto(file);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const uploadedFile = formData.get('photo');
      const photo = this.#capturedPhoto || (uploadedFile?.size ? uploadedFile : null);

      await this.#presenter.addStory({
        description: formData.get('description')?.trim(),
        photo,
        lat: this.#selectedLat,
        lon: this.#selectedLon,
      });
    });
  }

  #setupCamera() {
    const startButton = document.querySelector('#start-camera-button');
    const captureButton = document.querySelector('#capture-button');
    const stopButton = document.querySelector('#stop-camera-button');
    const video = document.querySelector('#camera-preview');

    startButton.addEventListener('click', async () => {
      try {
        this.#stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        video.srcObject = this.#stream;
        startButton.disabled = true;
        captureButton.disabled = false;
        stopButton.disabled = false;
        this.showSuccess('Kamera aktif. Ambil foto ketika sudah siap.');
      } catch (error) {
        this.showError('Kamera tidak bisa dibuka. Pastikan izin kamera sudah diberikan.');
      }
    });

    captureButton.addEventListener('click', async () => {
      const canvas = document.querySelector('#camera-canvas');
      const context = canvas.getContext('2d');

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            this.showError('Gagal mengambil foto dari kamera.');
            return;
          }

          this.#capturedPhoto = new File([blob], `camera-story-${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          document.querySelector('#photo').value = '';
          this.#previewPhoto(this.#capturedPhoto);
          this.showSuccess('Foto dari kamera berhasil diambil.');
        },
        'image/jpeg',
        0.9,
      );
    });

    stopButton.addEventListener('click', () => this.#stopCamera());
  }

  #setupSyncButton() {
    const button = document.querySelector('#sync-pending-button');
    button.addEventListener('click', async () => {
      button.disabled = true;
      this.showSuccess('Mencoba sinkronisasi story tertunda...');

      try {
        const result = await syncPendingStories({
          onUpdate: ({ synced, failed, pending }) => {
            document.querySelector('#pending-status').textContent =
              `Sinkron: ${synced}, gagal: ${failed}, tersisa: ${pending}.`;
          },
        });

        if (result.synced > 0) {
          this.showSuccess(`${result.synced} story tertunda berhasil dikirim.`);
        } else if (!navigator.onLine) {
          this.showError('Perangkat masih offline. Story tetap disimpan di IndexedDB.');
        } else {
          this.showSuccess('Tidak ada story tertunda untuk disinkronkan.');
        }
      } catch (error) {
        this.showError(error.message);
      } finally {
        button.disabled = false;
        await this.renderPendingStatus();
      }
    });
  }

  async renderPendingStatus() {
    const count = await StoryDb.countPendingStories();
    const status = document.querySelector('#pending-status');
    const button = document.querySelector('#sync-pending-button');

    if (!status || !button) return;

    status.textContent = count
      ? `${count} story tertunda tersimpan di IndexedDB. Status: ${navigator.onLine ? 'online' : 'offline'}.`
      : 'Tidak ada story tertunda di IndexedDB.';
    button.disabled = !count;
  }

  #previewPhoto(file) {
    const preview = document.querySelector('#photo-preview');
    preview.src = URL.createObjectURL(file);
    preview.hidden = false;
  }

  #stopCamera() {
    stopMediaStream(this.#stream);
    this.#stream = null;

    const video = document.querySelector('#camera-preview');
    const startButton = document.querySelector('#start-camera-button');
    const captureButton = document.querySelector('#capture-button');
    const stopButton = document.querySelector('#stop-camera-button');

    if (video) video.srcObject = null;
    if (startButton) startButton.disabled = false;
    if (captureButton) captureButton.disabled = true;
    if (stopButton) stopButton.disabled = true;
  }

  showError(message) {
    const messageElement = document.querySelector('#form-message');
    messageElement.textContent = message;
    messageElement.className = 'form-message error';
  }

  showSuccess(message) {
    const messageElement = document.querySelector('#form-message');
    messageElement.textContent = message;
    messageElement.className = 'form-message success';
  }

  setLoading(isLoading) {
    const button = document.querySelector('#submit-button');
    button.disabled = isLoading;
    button.textContent = isLoading ? 'Mengirim...' : 'Kirim Story';
  }

  resetForm() {
    document.querySelector('#add-story-form').reset();
    document.querySelector('#location-info').value = 'Belum memilih lokasi';
    document.querySelector('#photo-preview').hidden = true;
    this.#selectedLat = null;
    this.#selectedLon = null;
    this.#capturedPhoto = null;
    this.#stopCamera();
  }

  destroy() {
    this.#stopCamera();
    if (this.#map) {
      this.#map.remove();
      this.#map = null;
      this.#selectedMarker = null;
    }
  }
}
