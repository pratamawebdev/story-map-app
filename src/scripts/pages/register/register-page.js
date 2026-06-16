import StoryApi from '../../data/api';
import Session from '../../data/session';
import RegisterPresenter from '../../presenters/register-presenter';

export default class RegisterPage {
  #presenter = null;

  async render() {
    if (Session.isAuthenticated()) {
      location.hash = '#/';
      return '';
    }

    return `
      <section class="auth-page container" aria-labelledby="register-title">
        <div class="auth-card">
          <p class="eyebrow">Buat Akun</p>
          <h1 id="register-title">Daftar Story Map</h1>
          <p class="section-description">Buat akun baru agar bisa menggunakan fitur Story API.</p>

          <form id="register-form" class="form" novalidate>
            <div class="form-group">
              <label for="name">Nama</label>
              <input id="name" name="name" type="text" autocomplete="name" required placeholder="Nama lengkap" />
            </div>

            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" autocomplete="email" required placeholder="nama@email.com" />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required placeholder="Minimal 8 karakter" />
            </div>

            <div id="form-message" class="form-message" role="status" aria-live="polite"></div>

            <button id="submit-button" class="button primary full" type="submit">Daftar</button>
          </form>

          <p class="auth-switch">Sudah punya akun? <a href="#/login">Login di sini</a>.</p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new RegisterPresenter({ view: this, model: StoryApi });

    const form = document.querySelector('#register-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.#presenter.register(new FormData(form));
    });
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
    button.textContent = isLoading ? 'Memproses...' : 'Daftar';
  }
}
