export default class RegisterPresenter {
  #view;
  #model;

  constructor({ view, model }) {
    this.#view = view;
    this.#model = model;
  }

  async register(formData) {
    const name = formData.get('name')?.trim();
    const email = formData.get('email')?.trim();
    const password = formData.get('password');

    if (!name || !email || !password) {
      this.#view.showError('Nama, email, dan password wajib diisi.');
      return;
    }

    if (password.length < 8) {
      this.#view.showError('Password minimal 8 karakter.');
      return;
    }

    try {
      this.#view.setLoading(true);
      await this.#model.register({ name, email, password });
      this.#view.showSuccess('Registrasi berhasil. Silakan login.');
      setTimeout(() => {
        location.hash = '#/login';
      }, 700);
    } catch (error) {
      this.#view.showError(error.message);
    } finally {
      this.#view.setLoading(false);
    }
  }
}
