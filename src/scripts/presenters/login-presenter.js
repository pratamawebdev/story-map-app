export default class LoginPresenter {
  #view;
  #model;
  #session;

  constructor({ view, model, session }) {
    this.#view = view;
    this.#model = model;
    this.#session = session;
  }

  async login(formData) {
    const email = formData.get('email')?.trim();
    const password = formData.get('password');

    if (!email || !password) {
      this.#view.showError('Email dan password wajib diisi.');
      return;
    }

    try {
      this.#view.setLoading(true);
      const response = await this.#model.login({ email, password });
      this.#session.setSession({
        token: response.loginResult.token,
        user: {
          id: response.loginResult.userId,
          name: response.loginResult.name,
        },
      });
      this.#view.showSuccess('Login berhasil. Anda akan diarahkan ke beranda.');
      location.hash = '#/';
    } catch (error) {
      this.#view.showError(error.message);
    } finally {
      this.#view.setLoading(false);
    }
  }
}
