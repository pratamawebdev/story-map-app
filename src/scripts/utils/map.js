import CONFIG from '../config';

export function isLeafletReady() {
  return Boolean(window.L);
}

export function createBaseLayers() {
  const L = window.L;

  return {
    'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }),
    'Carto Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    }),
    'Esri World Imagery': L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri',
      },
    ),
  };
}

export function createMap(elementId, options = {}) {
  if (!isLeafletReady()) {
    throw new Error('Leaflet gagal dimuat. Periksa koneksi internet Anda.');
  }

  const L = window.L;
  const baseLayers = createBaseLayers();
  const defaultLayer = baseLayers.OpenStreetMap;

  const map = L.map(elementId, {
    center: options.center || CONFIG.DEFAULT_MAP_CENTER,
    zoom: options.zoom || CONFIG.DEFAULT_MAP_ZOOM,
    layers: [defaultLayer],
  });

  L.control.layers(baseLayers).addTo(map);

  return { map, baseLayers };
}
