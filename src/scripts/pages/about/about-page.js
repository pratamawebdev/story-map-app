export default class AboutPage {
  async render() {
    return `
      <section class="container about-page" aria-labelledby="about-title">
        <div class="section-heading">
          <p class="eyebrow">Tentang</p>
          <h1 id="about-title">Story Map App</h1>
          <p class="section-description">Aplikasi ini dibuat sebagai SPA untuk menampilkan data Story API, memvisualisasikan lokasi pada peta, dan menambahkan story baru.</p>
        </div>

        <div class="feature-grid">
          <article class="feature-card">
            <h2>SPA dan MVP</h2>
            <p>Navigasi memakai hash routing tanpa reload halaman. Setiap halaman dipisahkan dari presenter agar logika dan tampilan lebih rapi.</p>
          </article>

          <article class="feature-card">
            <h2>Peta Interaktif</h2>
            <p>Story dengan lokasi ditampilkan sebagai marker. List dan peta saling terhubung, serta tersedia beberapa pilihan tile layer.</p>
          </article>

          <article class="feature-card">
            <h2>Tambah Story</h2>
            <p>Pengguna dapat mengirim deskripsi, foto dari file atau kamera, dan lokasi melalui klik pada peta.</p>
          </article>

          <article class="feature-card">
            <h2>Aksesibilitas</h2>
            <p>Aplikasi memakai elemen semantik, label input, alternatif teks gambar, skip link, dan kontrol yang bisa diakses keyboard.</p>
          </article>
        </div>
      </section>
    `;
  }

  async afterRender() {}
}
