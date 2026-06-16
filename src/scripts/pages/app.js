import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import Session from '../data/session';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #navList = null;
  #activePage = null;

  constructor({ navigationDrawer, drawerButton, content, navList }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#navList = navList;

    this.#setupDrawer();
    this.#setupLogout();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      const isOpen = this.#navigationDrawer.classList.toggle('open');
      this.#drawerButton.setAttribute('aria-expanded', String(isOpen));
    });

    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#closeDrawer();
      }

      this.#navigationDrawer.querySelectorAll('a, button').forEach((element) => {
        if (element.contains(event.target)) {
          this.#closeDrawer();
        }
      });
    });
  }

  #setupLogout() {
    this.#navList.addEventListener('click', (event) => {
      if (event.target.matches('#logout-button')) {
        Session.clearSession();
        location.hash = '#/login';
        this.#renderNavigation();
      }
    });
  }

  #closeDrawer() {
    this.#navigationDrawer.classList.remove('open');
    this.#drawerButton.setAttribute('aria-expanded', 'false');
  }

  #renderNavigation() {
    const isAuthenticated = Session.isAuthenticated();

    this.#navList.innerHTML = isAuthenticated
      ? `
        <li><a href="#/">Beranda</a></li>
        <li><a href="#/add">Tambah Story</a></li>
        <li><a href="#/saved">Story Tersimpan</a></li>
        <li><a href="#/about">Tentang</a></li>
        <li><button id="logout-button" class="nav-button" type="button">Logout</button></li>
      `
      : `
        <li><a href="#/login">Login</a></li>
        <li><a href="#/register">Daftar</a></li>
        <li><a href="#/about">Tentang</a></li>
      `;
  }

  async renderPage() {
    this.#renderNavigation();

    const url = getActiveRoute();
    const page = routes[url] || routes['/'];

    if (this.#activePage?.destroy) {
      this.#activePage.destroy();
    }

    this.#activePage = page;

    const renderContent = async () => {
      const html = await page.render();
      this.#content.innerHTML = html;

      if (html.trim()) {
        await page.afterRender();
        this.#content.focus();
      }
    };

    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => renderContent());
      await transition.finished;
    } else {
      await renderContent();
    }
  }
}

export default App;
