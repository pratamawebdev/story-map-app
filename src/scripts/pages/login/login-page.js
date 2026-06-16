import StoryApi from '../../data/api';
import Session from '../../data/session';
import LoginPresenter from '../../presenters/login-presenter';

export default class LoginPage {
  #presenter = null;

  async render() {
    if (Session.isAuthenticated()) {
      location.hash = '#/';
      return '';
    }

    return `
      <section class="auth-page container" aria-labelledby="login-title">
        <div class="auth-card">
          <p class="eyebrow">Masuk Akun</p>
          <h1 id="login-title">Login ke Story Map</h1>
          <p class="section-description">Gunakan akun Dicoding Story API untuk melihat dan menambahkan story.</p>

          <form id="login-form" class="form" novalidate>
            <div class="form-group">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" autocomplete="email" required placeholder="nama@email.com" />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" autocomplete="current-password" required placeholder="Masukkan password" />
            </div>

            <div id="form-message" class="form-message" role="status" aria-live="polite"></div>

            <button id="submit-button" class="button primary full" type="submit">Login</button>
          </form>

          <p class="auth-switch">Belum punya akun? <a href="#/register">Daftar di sini</a>.</p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    this.#presenter = new LoginPresenter({ view: this, model: StoryApi, session: Session });

    const form = document.querySelector('#login-form');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.#presenter.login(new FormData(form));
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
    button.textContent = isLoading ? 'Memproses...' : 'Login';
  }
}
