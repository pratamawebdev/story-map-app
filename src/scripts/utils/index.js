export function showFormattedDate(date, locale = 'id-ID', options = {}) {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function createLoadingTemplate(message = 'Memuat data...') {
  return `
    <div class="state-card" role="status" aria-live="polite">
      <div class="loader" aria-hidden="true"></div>
      <p>${message}</p>
    </div>
  `;
}

export function createErrorTemplate(message) {
  return `
    <div class="state-card error" role="alert">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function stopMediaStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}
