/* ============================================================
   KRONOX FORGE — app.js
   Lógica compartida: catálogo, sesión, compatibilidad, cotizador.
   Todo el estado persiste en localStorage (sin backend real).
   ============================================================ */
'use strict';

/* ------------------------------------------------------------
   0. Utilidades
   ------------------------------------------------------------ */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const money = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n) || 0);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const uid = p => p + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
const PAGE = document.body.dataset.page || '';

const Store = {
  get(k, fb) { try { const v = localStorage.getItem('kf_' + k); return v == null ? fb : JSON.parse(v); } catch { return fb; } },
  set(k, v) { try { localStorage.setItem('kf_' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('kf_' + k); } catch {} }
};

/* ------------------------------------------------------------
   1. Iconos (SVG inline, trazo fino)
   ------------------------------------------------------------ */
const ico = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  laptop: ico('<rect x="3" y="5" width="18" height="11" rx="1.5"/><path d="M2 19h20l-1.5-3H3.5z"/>'),
  monitor: ico('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>'),
  cpu: ico('<rect x="7.5" y="7.5" width="9" height="9" rx="1"/><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 1.5v2.5M15 1.5v2.5M9 20v2.5M15 20v2.5M1.5 9H4M1.5 15H4M20 9h2.5M20 15h2.5"/>'),
  board: ico('<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="5" height="5" rx="0.5"/><path d="M16 7.5h2M16 11h2M7 16.5h11"/>'),
  ram: ico('<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 16v2M10 16v2M14 16v2M18 16v2M6.5 8v8M12 8v8M17.5 8v8"/>'),
  ssd: ico('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h4M7 14h8"/><circle cx="17.5" cy="10" r="0.6"/>'),
  gpu: ico('<rect x="2" y="6" width="20" height="11" rx="2"/><circle cx="8" cy="11.5" r="2.6"/><circle cx="15.5" cy="11.5" r="2.6"/><path d="M5 17v2.5"/>'),
  psu: ico('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M13 6v12M6 10h4M6 13.5h4"/><circle cx="17.5" cy="12" r="2.2"/>'),
  case: ico('<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 6h6M9 18h6"/><circle cx="12" cy="12" r="2.2"/>'),
  os: ico('<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>'),
  keyboard: ico('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9.5 14h5"/>'),
  mouse: ico('<rect x="7" y="2" width="10" height="20" rx="5"/><path d="M12 6v4"/>'),
  headset: ico('<path d="M4 14v-2a8 8 0 0116 0v2"/><rect x="2" y="13.5" width="4" height="6.5" rx="1.6"/><rect x="18" y="13.5" width="4" height="6.5" rx="1.6"/>'),
  dock: ico('<rect x="3" y="9" width="18" height="9" rx="2"/><path d="M7 13h.01M11 13h.01M15 13h.01M8 18v2M16 18v2M12 9V5"/>'),
  cam: ico('<rect x="2" y="7" width="13" height="10" rx="2"/><path d="M15 11l6-3v8l-6-3z"/>'),
  ups: ico('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M12 7l-2.5 4.5H14L11.5 16"/><path d="M8 19h8"/>'),
  cooler: ico('<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>'),
  search: ico('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>'),
  cart: ico('<path d="M3 4h2l2.4 11h10L20 7H6"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>'),
  user: ico('<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/>'),
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0112 7.6a4.4 4.4 0 017.5 2.8C19.5 15.4 12 20 12 20z"/></svg>',
  check: ico('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  x: ico('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: ico('<path d="M12 5v14M5 12h14"/>'),
  minus: ico('<path d="M5 12h14"/>'),
  trash: ico('<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/>'),
  menu: ico('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  filter: ico('<path d="M3 5h18l-7 8v6l-4-2v-4z"/>'),
  mail: ico('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>'),
  print: ico('<path d="M7 8V3h10v5"/><rect x="3" y="8" width="18" height="8" rx="2"/><path d="M7 16h10v5H7z"/>'),
  edit: ico('<path d="M4 20h4L20 8l-4-4L4 16z"/>'),
  logout: ico('<path d="M15 5H6v14h9"/><path d="M12 12h9M18 9l3 3-3 3"/>'),
  box: ico('<path d="M3 8l9-5 9 5-9 5z"/><path d="M3 8v8l9 5 9-5V8"/>'),
  bolt: ico('<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>'),
  spark: ico('<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/>'),
  info: ico('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  arrow: ico('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  layers: ico('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  tag: ico('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.2"/>')
};
const icon = (n, cls = '') => `<span class="${cls}">${ICONS[n] || ICONS.box}</span>`;

/* ------------------------------------------------------------
   2. Datos del catálogo
   ------------------------------------------------------------ */
const CATEGORIES = [
  { id: 'laptops',        name: 'Laptops',            icon: 'laptop' },
  { id: 'monitores',      name: 'Monitores',          icon: 'monitor' },
  { id: 'procesadores',   name: 'Procesadores',       icon: 'cpu' },
  { id: 'placas',         name: 'Placas madre',       icon: 'board' },
  { id: 'memorias',       name: 'Memorias RAM',       icon: 'ram' },
  { id: 'almacenamiento', name: 'Almacenamiento',     icon: 'ssd' },
  { id: 'graficas',       name: 'Tarjetas gráficas',  icon: 'gpu' },
  { id: 'fuentes',        name: 'Fuentes de poder',   icon: 'psu' },
  { id: 'gabinetes',      name: 'Gabinetes',          icon: 'case' },
  { id: 'software',       name: 'Sistemas operativos',icon: 'os' },
  { id: 'perifericos',    name: 'Periféricos',        icon: 'keyboard' },
  { id: 'accesorios',     name: 'Accesorios',         icon: 'dock' }
];
const catName = id => (CATEGORIES.find(c => c.id === id) || {}).name || id;

/* perf = índice de rendimiento relativo 0-100 dentro de su clase.
   uses = aptitud por perfil de uso (0-3) en equipos completos. */
const PRODUCTS = [
  /* ---- Laptops ---- */
  { id:'lap-dell-inspiron-15', name:'Dell Inspiron 15 3520', category:'laptops', brand:'Dell', price:649, stock:12, icon:'laptop',
    tags:['i5','15.6"','SSD 512GB'], perf:{cpu:44,gpu:18}, ramGB:8, uses:{estudio:3,oficina:3,programacion:2,diseno:1,gaming:0,video:1},
    specs:{Pantalla:'15.6" FHD (1920x1080) antirreflejo',Procesador:'Intel Core i5-1235U (10 núcleos / 12 hilos, hasta 4.4 GHz)',Memoria:'8 GB DDR4 3200 MHz (ampliable a 16 GB)',Almacenamiento:'SSD 512 GB NVMe PCIe',Gráficos:'Intel Iris Xe integrados',Batería:'41 Wh, 3 celdas',Peso:'1.66 kg',Puertos:'2x USB-A 3.2, 1x USB-C, HDMI 1.4, lector SD',Sistema:'Windows 11 Home'} },
  { id:'lap-hp-pavilion-15', name:'HP Pavilion 15-eg3000', category:'laptops', brand:'HP', price:899, stock:8, icon:'laptop',
    tags:['i7','16GB','Táctil'], perf:{cpu:56,gpu:22}, ramGB:16, uses:{estudio:3,oficina:3,programacion:3,diseno:2,gaming:1,video:2},
    specs:{Pantalla:'15.6" FHD IPS táctil',Procesador:'Intel Core i7-1355U (10 núcleos / 12 hilos, hasta 5.0 GHz)',Memoria:'16 GB DDR4 3200 MHz',Almacenamiento:'SSD 512 GB NVMe PCIe',Gráficos:'Intel Iris Xe integrados',Batería:'43 Wh, carga rápida',Peso:'1.74 kg',Puertos:'2x USB-A, 1x USB-C, HDMI 2.1',Sistema:'Windows 11 Home'} },
  { id:'lap-asus-vivobook-15', name:'ASUS VivoBook 15 X1504', category:'laptops', brand:'ASUS', price:549, stock:18, icon:'laptop',
    tags:['Ryzen 5','Ligera'], perf:{cpu:38,gpu:16}, ramGB:8, uses:{estudio:3,oficina:3,programacion:1,diseno:1,gaming:0,video:0},
    specs:{Pantalla:'15.6" FHD (1920x1080)',Procesador:'AMD Ryzen 5 7520U (4 núcleos / 8 hilos, hasta 4.3 GHz)',Memoria:'8 GB LPDDR5',Almacenamiento:'SSD 512 GB NVMe PCIe',Gráficos:'AMD Radeon 610M',Batería:'42 Wh',Peso:'1.70 kg',Puertos:'2x USB-A, 1x USB-C, HDMI',Sistema:'Windows 11 Home'} },
  { id:'lap-lenovo-ideapad-3', name:'Lenovo IdeaPad 3 15ALC6', category:'laptops', brand:'Lenovo', price:479, stock:22, icon:'laptop',
    tags:['Ryzen 5','Económica'], perf:{cpu:34,gpu:15}, ramGB:8, uses:{estudio:3,oficina:2,programacion:1,diseno:0,gaming:0,video:0},
    specs:{Pantalla:'15.6" FHD (1920x1080) TN',Procesador:'AMD Ryzen 5 5500U (6 núcleos / 12 hilos, hasta 4.0 GHz)',Memoria:'8 GB DDR4 3200 MHz',Almacenamiento:'SSD 256 GB NVMe PCIe',Gráficos:'AMD Radeon integrados',Batería:'38 Wh',Peso:'1.65 kg',Puertos:'2x USB-A, 1x USB-C, HDMI',Sistema:'Windows 11 Home'} },
  { id:'lap-dell-xps-13', name:'Dell XPS 13 9315', category:'laptops', brand:'Dell', price:1299, stock:5, icon:'laptop',
    tags:['Ultra portátil','16GB'], perf:{cpu:58,gpu:20}, ramGB:16, uses:{estudio:2,oficina:3,programacion:3,diseno:2,gaming:0,video:1},
    specs:{Pantalla:'13.4" QHD+ (2560x1600) 500 nits',Procesador:'Intel Core i7-1250U (10 núcleos / 12 hilos)',Memoria:'16 GB LPDDR5',Almacenamiento:'SSD 512 GB NVMe PCIe',Gráficos:'Intel Iris Xe',Batería:'55 Wh, hasta 12 h',Peso:'1.17 kg',Chasis:'Aluminio mecanizado',Puertos:'2x Thunderbolt 4, adaptador USB-C a A',Sistema:'Windows 11 Pro'} },
  { id:'lap-hp-victus-16', name:'HP Victus 16 (RTX 4060)', category:'laptops', brand:'HP', price:1349, stock:6, icon:'laptop',
    tags:['RTX 4060','144Hz','Ryzen 7'], perf:{cpu:74,gpu:66}, ramGB:16, uses:{estudio:1,oficina:1,programacion:3,diseno:3,gaming:3,video:3},
    specs:{Pantalla:'16.1" FHD IPS 144 Hz',Procesador:'AMD Ryzen 7 7840HS (8 núcleos / 16 hilos, hasta 5.1 GHz)',Memoria:'16 GB DDR5 5600 MHz',Almacenamiento:'SSD 1 TB NVMe PCIe 4.0',Gráficos:'NVIDIA GeForce RTX 4060 8 GB',Refrigeración:'Doble ventilador, 4 salidas de aire',Peso:'2.46 kg',Puertos:'3x USB-A, 1x USB-C, HDMI 2.1, RJ-45',Sistema:'Windows 11 Home'} },
  { id:'lap-asus-rog-strix', name:'ASUS ROG Strix G16 (RTX 4070)', category:'laptops', brand:'ASUS', price:2199, stock:3, icon:'laptop',
    tags:['i9','240Hz','RTX 4070'], perf:{cpu:96,gpu:82}, ramGB:32, uses:{estudio:0,oficina:1,programacion:3,diseno:3,gaming:3,video:3},
    specs:{Pantalla:'16" QHD+ (2560x1600) 240 Hz',Procesador:'Intel Core i9-13980HX (24 núcleos / 32 hilos, hasta 5.6 GHz)',Memoria:'32 GB DDR5 4800 MHz',Almacenamiento:'SSD 1 TB NVMe PCIe 4.0',Gráficos:'NVIDIA GeForce RTX 4070 8 GB',Refrigeración:'Metal líquido, 3 ventiladores',Peso:'2.50 kg',Puertos:'3x USB-A, 2x USB-C (TB4), HDMI 2.1, RJ-45',Sistema:'Windows 11 Pro'} },
  { id:'lap-lenovo-thinkpad', name:'Lenovo ThinkPad E14 Gen 5', category:'laptops', brand:'Lenovo', price:1049, stock:9, icon:'laptop',
    tags:['i7','Empresarial'], perf:{cpu:66,gpu:20}, ramGB:16, uses:{estudio:2,oficina:3,programacion:3,diseno:1,gaming:0,video:1},
    specs:{Pantalla:'14" WUXGA (1920x1200) IPS',Procesador:'Intel Core i7-13620H (10 núcleos / 16 hilos)',Memoria:'16 GB DDR4 3200 MHz',Almacenamiento:'SSD 512 GB NVMe PCIe',Gráficos:'Intel UHD integrados',Teclado:'ThinkPad retroiluminado, TrackPoint',Seguridad:'TPM 2.0, lector de huellas',Peso:'1.41 kg',Puertos:'2x USB-A, 2x USB-C (TB4), HDMI, RJ-45',Sistema:'Windows 11 Pro'} },

  /* ---- Monitores ---- */
  { id:'mon-lg-24mp400', name:'LG 24MP400 24" IPS', category:'monitores', brand:'LG', price:109, stock:25, icon:'monitor',
    tags:['24"','75Hz','IPS'], perf:{}, uses:{estudio:3,oficina:3,programacion:2,diseno:2,gaming:1,video:1},
    specs:{Tamaño:'24 pulgadas',Panel:'IPS',Resolución:'Full HD 1920x1080',Refresco:'75 Hz',Tiempo:'5 ms GtG',Brillo:'250 nits',Conexiones:'HDMI, VGA','Montaje VESA':'75 x 75 mm'} },
  { id:'mon-samsung-odyssey-g5', name:'Samsung Odyssey G5 27" QHD', category:'monitores', brand:'Samsung', price:279, stock:11, icon:'monitor',
    tags:['27"','144Hz','1440p'], perf:{}, uses:{estudio:2,oficina:2,programacion:3,diseno:2,gaming:3,video:2},
    specs:{Tamaño:'27 pulgadas',Panel:'VA curvo 1000R',Resolución:'QHD 2560x1440',Refresco:'144 Hz',Tiempo:'1 ms MPRT',Brillo:'250 nits',Conexiones:'HDMI, DisplayPort','Montaje VESA':'75 x 75 mm'} },
  { id:'mon-lg-ultragear-27', name:'LG UltraGear 27GP850 27"', category:'monitores', brand:'LG', price:379, stock:7, icon:'monitor',
    tags:['165Hz','Nano IPS','QHD'], perf:{}, uses:{estudio:1,oficina:1,programacion:3,diseno:3,gaming:3,video:3},
    specs:{Tamaño:'27 pulgadas',Panel:'Nano IPS',Resolución:'QHD 2560x1440',Refresco:'165 Hz (OC 180 Hz)',Tiempo:'1 ms GtG',Brillo:'400 nits',HDR:'HDR10',Conexiones:'2x HDMI 2.0, DisplayPort 1.4, USB 3.0','Montaje VESA':'100 x 100 mm'} },
  { id:'mon-samsung-viewfinity', name:'Samsung ViewFinity S7 27" 4K', category:'monitores', brand:'Samsung', price:329, stock:9, icon:'monitor',
    tags:['27"','4K','IPS'], perf:{}, uses:{estudio:2,oficina:3,programacion:3,diseno:3,gaming:1,video:3},
    specs:{Tamaño:'27 pulgadas',Panel:'IPS',Resolución:'UHD 3840x2160',Refresco:'60 Hz',Tiempo:'5 ms',Brillo:'300 nits',Conexiones:'2x HDMI, DisplayPort','Montaje VESA':'100 x 100 mm'} },

  /* ---- Procesadores ---- */
  { id:'cpu-i5-12400f', name:'Intel Core i5-12400F', category:'procesadores', brand:'Intel', price:129, stock:20, icon:'cpu',
    socket:'LGA1700', tdp:65, ramTypes:['DDR4','DDR5'], perf:{cpu:52}, tags:['6 núcleos','LGA1700'],
    specs:{Socket:'LGA 1700',Núcleos:'6 (6P + 0E)',Hilos:'12','Frecuencia base':'2.5 GHz','Turbo máximo':'4.4 GHz',Caché:'18 MB L3',TDP:'65 W (máx. turbo 117 W)',Memoria:'DDR4-3200 / DDR5-4800, hasta 128 GB',Gráficos:'No incluye (requiere GPU dedicada)',Litografía:'Intel 7'} },
  { id:'cpu-i5-13400', name:'Intel Core i5-13400', category:'procesadores', brand:'Intel', price:189, stock:15, icon:'cpu',
    socket:'LGA1700', tdp:65, ramTypes:['DDR4','DDR5'], perf:{cpu:60}, tags:['10 núcleos','iGPU'],
    specs:{Socket:'LGA 1700',Núcleos:'10 (6P + 4E)',Hilos:'16','Frecuencia base':'2.5 GHz','Turbo máximo':'4.6 GHz',Caché:'20 MB L3',TDP:'65 W (máx. turbo 148 W)',Memoria:'DDR4-3200 / DDR5-4800, hasta 192 GB',Gráficos:'Intel UHD 730',Litografía:'Intel 7'} },
  { id:'cpu-i7-13700k', name:'Intel Core i7-13700K', category:'procesadores', brand:'Intel', price:329, stock:9, icon:'cpu',
    socket:'LGA1700', tdp:125, ramTypes:['DDR4','DDR5'], perf:{cpu:84}, tags:['16 núcleos','Overclock'],
    specs:{Socket:'LGA 1700',Núcleos:'16 (8P + 8E)',Hilos:'24','Frecuencia base':'3.4 GHz','Turbo máximo':'5.4 GHz',Caché:'30 MB L3',TDP:'125 W (máx. turbo 253 W)',Memoria:'DDR4-3200 / DDR5-5600, hasta 192 GB',Gráficos:'Intel UHD 770',Litografía:'Intel 7',Overclock:'Desbloqueado'} },
  { id:'cpu-i9-13900k', name:'Intel Core i9-13900K', category:'procesadores', brand:'Intel', price:499, stock:4, icon:'cpu',
    socket:'LGA1700', tdp:125, ramTypes:['DDR4','DDR5'], perf:{cpu:100}, tags:['24 núcleos','Gama alta'],
    specs:{Socket:'LGA 1700',Núcleos:'24 (8P + 16E)',Hilos:'32','Frecuencia base':'3.0 GHz','Turbo máximo':'5.8 GHz',Caché:'36 MB L3',TDP:'125 W (máx. turbo 253 W)',Memoria:'DDR4-3200 / DDR5-5600, hasta 192 GB',Gráficos:'Intel UHD 770',Litografía:'Intel 7',Overclock:'Desbloqueado'} },
  { id:'cpu-r5-5600', name:'AMD Ryzen 5 5600', category:'procesadores', brand:'AMD', price:119, stock:17, icon:'cpu',
    socket:'AM4', tdp:65, ramTypes:['DDR4'], perf:{cpu:44}, tags:['6 núcleos','AM4'],
    specs:{Socket:'AM4',Núcleos:'6',Hilos:'12','Frecuencia base':'3.5 GHz','Turbo máximo':'4.4 GHz',Caché:'32 MB L3',TDP:'65 W',Memoria:'DDR4-3200, doble canal, hasta 128 GB',Gráficos:'No incluye (requiere GPU dedicada)',Litografía:'TSMC 7 nm',Arquitectura:'Zen 3'} },
  { id:'cpu-r5-7600', name:'AMD Ryzen 5 7600', category:'procesadores', brand:'AMD', price:199, stock:13, icon:'cpu',
    socket:'AM5', tdp:65, ramTypes:['DDR5'], perf:{cpu:66}, tags:['6 núcleos','AM5'],
    specs:{Socket:'AM5',Núcleos:'6',Hilos:'12','Frecuencia base':'3.8 GHz','Turbo máximo':'5.1 GHz',Caché:'32 MB L3',TDP:'65 W (PPT 88 W)',Memoria:'DDR5-5200 EXPO, hasta 128 GB',Gráficos:'AMD Radeon (RDNA 2, 2 CU)',Litografía:'TSMC 5 nm',Arquitectura:'Zen 4'} },
  { id:'cpu-r7-7700x', name:'AMD Ryzen 7 7700X', category:'procesadores', brand:'AMD', price:299, stock:8, icon:'cpu',
    socket:'AM5', tdp:105, ramTypes:['DDR5'], perf:{cpu:76}, tags:['8 núcleos','AM5'],
    specs:{Socket:'AM5',Núcleos:'8',Hilos:'16','Frecuencia base':'4.5 GHz','Turbo máximo':'5.4 GHz',Caché:'32 MB L3',TDP:'105 W (PPT 142 W)',Memoria:'DDR5-5200 EXPO, hasta 128 GB',Gráficos:'AMD Radeon (RDNA 2, 2 CU)',Litografía:'TSMC 5 nm',Arquitectura:'Zen 4'} },
  { id:'cpu-r9-7900x', name:'AMD Ryzen 9 7900X', category:'procesadores', brand:'AMD', price:429, stock:5, icon:'cpu',
    socket:'AM5', tdp:170, ramTypes:['DDR5'], perf:{cpu:88}, tags:['12 núcleos','AM5'],
    specs:{Socket:'AM5',Núcleos:'12',Hilos:'24','Frecuencia base':'4.7 GHz','Turbo máximo':'5.6 GHz',Caché:'64 MB L3',TDP:'170 W (PPT 230 W)',Memoria:'DDR5-5200 EXPO, hasta 128 GB',Gráficos:'AMD Radeon (RDNA 2, 2 CU)',Litografía:'TSMC 5 nm',Arquitectura:'Zen 4'} },

  /* ---- Placas madre ---- */
  { id:'mb-z690-asus', name:'ASUS Prime Z690-P WiFi', category:'placas', brand:'ASUS', price:189, stock:7, icon:'board',
    socket:'LGA1700', ramTypes:['DDR5'], formFactor:'ATX', chipset:'Z690', perf:{}, tags:['Z690','DDR5','ATX'],
    specs:{Socket:'LGA 1700',Chipset:'Intel Z690','Tipo de memoria':'DDR5 (4 ranuras, hasta 128 GB, 6000+ MHz OC)','Factor de forma':'ATX (305 x 244 mm)',PCIe:'1x PCIe 5.0 x16, 2x PCIe 4.0 x16, 1x PCIe 3.0 x1',Almacenamiento:'4x M.2 (PCIe 4.0), 4x SATA 6 Gb/s',Red:'WiFi 6, Ethernet 2.5 Gb/s',Audio:'Realtek 7.1 Surround',VRM:'16+1 fases',Puertos:'USB-C 3.2 Gen 2x2, 6x USB-A'} },
  { id:'mb-b660-msi', name:'MSI PRO B660M-A DDR4', category:'placas', brand:'MSI', price:119, stock:12, icon:'board',
    socket:'LGA1700', ramTypes:['DDR4'], formFactor:'mATX', chipset:'B660', perf:{}, tags:['B660','DDR4','mATX'],
    specs:{Socket:'LGA 1700',Chipset:'Intel B660','Tipo de memoria':'DDR4 (4 ranuras, hasta 128 GB, 4800 MHz OC)','Factor de forma':'Micro-ATX (243 x 243 mm)',PCIe:'1x PCIe 4.0 x16, 1x PCIe 3.0 x1',Almacenamiento:'2x M.2 (PCIe 4.0), 4x SATA 6 Gb/s',Red:'Ethernet 2.5 Gb/s',Audio:'Realtek ALC897',VRM:'12+1+1 fases',Puertos:'USB-C 3.2 Gen 2x2, 4x USB-A'} },
  { id:'mb-b760-giga', name:'Gigabyte B760M DS3H DDR4', category:'placas', brand:'Gigabyte', price:109, stock:14, icon:'board',
    socket:'LGA1700', ramTypes:['DDR4'], formFactor:'mATX', chipset:'B760', perf:{}, tags:['B760','DDR4','Económica'],
    specs:{Socket:'LGA 1700',Chipset:'Intel B760','Tipo de memoria':'DDR4 (4 ranuras, hasta 128 GB, 5333 MHz OC)','Factor de forma':'Micro-ATX (244 x 225 mm)',PCIe:'1x PCIe 4.0 x16, 2x PCIe 3.0 x1',Almacenamiento:'2x M.2 (PCIe 4.0), 4x SATA 6 Gb/s',Red:'Ethernet 1 Gb/s',Audio:'Realtek ALC897',VRM:'8+1+1 fases',Puertos:'USB-C 3.2 Gen 2, 4x USB-A'} },
  { id:'mb-h610-asus', name:'ASUS Prime H610M-K D4', category:'placas', brand:'ASUS', price:89, stock:16, icon:'board',
    socket:'LGA1700', ramTypes:['DDR4'], formFactor:'mATX', chipset:'H610', perf:{}, tags:['H610','DDR4','Entrada'],
    specs:{Socket:'LGA 1700',Chipset:'Intel H610','Tipo de memoria':'DDR4 (2 ranuras, hasta 64 GB, 3200 MHz)','Factor de forma':'Micro-ATX (244 x 211 mm)',PCIe:'1x PCIe 4.0 x16, 1x PCIe 3.0 x1',Almacenamiento:'1x M.2 (PCIe 3.0), 4x SATA 6 Gb/s',Red:'Ethernet 1 Gb/s',Audio:'Realtek ALC897',VRM:'6+1+1 fases',Limitaciones:'Sin overclock de CPU, 2 ranuras DIMM'} },
  { id:'mb-x670-asus', name:'ASUS TUF Gaming X670E-Plus', category:'placas', brand:'ASUS', price:329, stock:5, icon:'board',
    socket:'AM5', ramTypes:['DDR5'], formFactor:'ATX', chipset:'X670E', perf:{}, tags:['X670E','AM5','Gaming'],
    specs:{Socket:'AM5',Chipset:'AMD X670E','Tipo de memoria':'DDR5 (4 ranuras, hasta 128 GB, 6400+ MHz EXPO)','Factor de forma':'ATX (305 x 244 mm)',PCIe:'1x PCIe 5.0 x16, 1x PCIe 4.0 x16, 2x PCIe 4.0 x1',Almacenamiento:'4x M.2 (2x PCIe 5.0), 4x SATA 6 Gb/s',Red:'WiFi 6E, Ethernet 2.5 Gb/s',Audio:'Realtek S1220A',VRM:'14+2 fases, disipadores ampliados',Puertos:'USB-C 3.2 Gen 2x2, 8x USB-A'} },
  { id:'mb-b650-msi', name:'MSI PRO B650M-A WiFi', category:'placas', brand:'MSI', price:169, stock:10, icon:'board',
    socket:'AM5', ramTypes:['DDR5'], formFactor:'mATX', chipset:'B650', perf:{}, tags:['B650','AM5','mATX'],
    specs:{Socket:'AM5',Chipset:'AMD B650','Tipo de memoria':'DDR5 (4 ranuras, hasta 128 GB, 6400+ MHz EXPO)','Factor de forma':'Micro-ATX (243 x 243 mm)',PCIe:'1x PCIe 4.0 x16, 1x PCIe 3.0 x1',Almacenamiento:'2x M.2 (PCIe 4.0), 4x SATA 6 Gb/s',Red:'WiFi 6E, Ethernet 2.5 Gb/s',Audio:'Realtek ALC897',VRM:'12+2+1 fases',Puertos:'USB-C 3.2 Gen 2, 6x USB-A'} },
  { id:'mb-b550-giga', name:'Gigabyte B550 AORUS Elite V2', category:'placas', brand:'Gigabyte', price:139, stock:11, icon:'board',
    socket:'AM4', ramTypes:['DDR4'], formFactor:'ATX', chipset:'B550', perf:{}, tags:['B550','AM4','ATX'],
    specs:{Socket:'AM4',Chipset:'AMD B550','Tipo de memoria':'DDR4 (4 ranuras, hasta 128 GB, 4733 MHz OC)','Factor de forma':'ATX (305 x 244 mm)',PCIe:'1x PCIe 4.0 x16, 1x PCIe 3.0 x4',Almacenamiento:'2x M.2 (1x PCIe 4.0), 4x SATA 6 Gb/s',Red:'Ethernet 2.5 Gb/s',Audio:'Realtek ALC1200',VRM:'12+2 fases',Puertos:'USB-C 3.2 Gen 2, 6x USB-A'} },

  /* ---- Memorias RAM ---- */
  { id:'ram-king-8-ddr4', name:'Kingston Fury Beast 8GB DDR4-3200', category:'memorias', brand:'Kingston', price:22, stock:40, icon:'ram',
    ramType:'DDR4', ramGB:8, ramSpeed:3200, modules:1, perf:{ram:30}, tags:['8GB','DDR4','3200MHz'],
    specs:{Capacidad:'8 GB (1 x 8 GB)',Tipo:'DDR4 UDIMM',Frecuencia:'3200 MHz (PC4-25600)',Latencia:'CL16-18-18',Voltaje:'1.35 V',Perfiles:'Intel XMP 2.0',ECC:'No',Disipador:'Aluminio de bajo perfil',Compatibilidad:'Placas con ranuras DDR4'} },
  { id:'ram-king-16-ddr4', name:'Kingston Fury Beast 16GB (2x8) DDR4-3200', category:'memorias', brand:'Kingston', price:42, stock:30, icon:'ram',
    ramType:'DDR4', ramGB:16, ramSpeed:3200, modules:2, perf:{ram:55}, tags:['16GB','DDR4','Dual channel'],
    specs:{Capacidad:'16 GB (2 x 8 GB)',Tipo:'DDR4 UDIMM',Frecuencia:'3200 MHz (PC4-25600)',Latencia:'CL16-18-18',Voltaje:'1.35 V',Perfiles:'Intel XMP 2.0',Canales:'Dual channel (kit emparejado)',Disipador:'Aluminio de bajo perfil'} },
  { id:'ram-king-32-ddr4', name:'Kingston Fury Beast 32GB (2x16) DDR4-3600', category:'memorias', brand:'Kingston', price:78, stock:14, icon:'ram',
    ramType:'DDR4', ramGB:32, ramSpeed:3600, modules:2, perf:{ram:68}, tags:['32GB','DDR4','3600MHz'],
    specs:{Capacidad:'32 GB (2 x 16 GB)',Tipo:'DDR4 UDIMM',Frecuencia:'3600 MHz (PC4-28800)',Latencia:'CL18-22-22',Voltaje:'1.35 V',Perfiles:'Intel XMP 2.0',Canales:'Dual channel (kit emparejado)',Disipador:'Aluminio de bajo perfil'} },
  { id:'ram-king-16-ddr5', name:'Kingston Fury Beast 16GB DDR5-5200', category:'memorias', brand:'Kingston', price:58, stock:22, icon:'ram',
    ramType:'DDR5', ramGB:16, ramSpeed:5200, modules:2, perf:{ram:72}, tags:['16GB','DDR5','5200MHz'],
    specs:{Capacidad:'16 GB (2 x 8 GB)',Tipo:'DDR5 UDIMM',Frecuencia:'5200 MHz (PC5-41600)',Latencia:'CL40-40-40',Voltaje:'1.25 V',Perfiles:'Intel XMP 3.0 / AMD EXPO',PMIC:'Regulador de voltaje integrado en el módulo',Canales:'Dual channel'} },
  { id:'ram-king-32-ddr5', name:'Kingston Fury Beast 32GB (2x16) DDR5-6000', category:'memorias', brand:'Kingston', price:115, stock:12, icon:'ram',
    ramType:'DDR5', ramGB:32, ramSpeed:6000, modules:2, perf:{ram:90}, tags:['32GB','DDR5','6000MHz'],
    specs:{Capacidad:'32 GB (2 x 16 GB)',Tipo:'DDR5 UDIMM',Frecuencia:'6000 MHz (PC5-48000)',Latencia:'CL36-38-38',Voltaje:'1.35 V',Perfiles:'Intel XMP 3.0 / AMD EXPO',PMIC:'Regulador de voltaje integrado',Canales:'Dual channel (kit emparejado)'} },
  { id:'ram-corsair-16-ddr4', name:'Corsair Vengeance LPX 16GB (2x8) DDR4-3600', category:'memorias', brand:'Corsair', price:46, stock:19, icon:'ram',
    ramType:'DDR4', ramGB:16, ramSpeed:3600, modules:2, perf:{ram:58}, tags:['16GB','DDR4','Low profile'],
    specs:{Capacidad:'16 GB (2 x 8 GB)',Tipo:'DDR4 UDIMM',Frecuencia:'3600 MHz (PC4-28800)',Latencia:'CL18-22-22',Voltaje:'1.35 V',Perfiles:'Intel XMP 2.0',Altura:'34 mm (compatible con disipadores grandes)',Canales:'Dual channel'} },
  { id:'ram-corsair-32-ddr5', name:'Corsair Vengeance 32GB (2x16) DDR5-5600', category:'memorias', brand:'Corsair', price:109, stock:10, icon:'ram',
    ramType:'DDR5', ramGB:32, ramSpeed:5600, modules:2, perf:{ram:85}, tags:['32GB','DDR5','RGB'],
    specs:{Capacidad:'32 GB (2 x 16 GB)',Tipo:'DDR5 UDIMM',Frecuencia:'5600 MHz (PC5-44800)',Latencia:'CL36-36-36',Voltaje:'1.25 V',Perfiles:'Intel XMP 3.0 / AMD EXPO',Iluminación:'RGB dinámica (iCUE)',Canales:'Dual channel'} },

  /* ---- Almacenamiento ---- */
  { id:'ssd-samsung-500', name:'Samsung 980 500GB NVMe', category:'almacenamiento', brand:'Samsung', price:49, stock:28, icon:'ssd',
    iface:'NVMe PCIe 3.0 x4', form:'M.2 2280', capGB:500, perf:{sto:62}, tags:['500GB','NVMe','3500 MB/s'],
    specs:{Capacidad:'500 GB',Interfaz:'PCIe 3.0 x4, NVMe 1.4',Formato:'M.2 2280','Lectura seq.':'3500 MB/s','Escritura seq.':'3000 MB/s',IOPS:'470K / 660K',NAND:'Samsung V-NAND TLC (Intelligent TurboWrite)','TBW':'300 TB',Garantía:'5 años limitada'} },
  { id:'ssd-samsung-1tb', name:'Samsung 970 EVO Plus 1TB NVMe', category:'almacenamiento', brand:'Samsung', price:79, stock:21, icon:'ssd',
    iface:'NVMe PCIe 3.0 x4', form:'M.2 2280', capGB:1000, perf:{sto:68}, tags:['1TB','NVMe','3500 MB/s'],
    specs:{Capacidad:'1 TB',Interfaz:'PCIe 3.0 x4, NVMe 1.3',Formato:'M.2 2280','Lectura seq.':'3500 MB/s','Escritura seq.':'3300 MB/s',IOPS:'600K / 550K',NAND:'Samsung V-NAND 3-bit MLC',Controlador:'Samsung Phoenix','TBW':'600 TB',Garantía:'5 años limitada'} },
  { id:'ssd-samsung-990-2tb', name:'Samsung 990 PRO 2TB PCIe 4.0', category:'almacenamiento', brand:'Samsung', price:179, stock:8, icon:'ssd',
    iface:'NVMe PCIe 4.0 x4', form:'M.2 2280', capGB:2000, perf:{sto:95}, tags:['2TB','PCIe 4.0','7450 MB/s'],
    specs:{Capacidad:'2 TB',Interfaz:'PCIe 4.0 x4, NVMe 2.0',Formato:'M.2 2280','Lectura seq.':'7450 MB/s','Escritura seq.':'6900 MB/s',IOPS:'1400K / 1550K',NAND:'Samsung V-NAND TLC',Controlador:'Samsung Pascal','TBW':'1200 TB',Requisito:'Placa con ranura M.2 PCIe 4.0'} },
  { id:'ssd-kingston-nv2-1tb', name:'Kingston NV2 1TB PCIe 4.0', category:'almacenamiento', brand:'Kingston', price:59, stock:26, icon:'ssd',
    iface:'NVMe PCIe 4.0 x4', form:'M.2 2280', capGB:1000, perf:{sto:74}, tags:['1TB','PCIe 4.0','Económico'],
    specs:{Capacidad:'1 TB',Interfaz:'PCIe 4.0 x4, NVMe 1.4',Formato:'M.2 2280','Lectura seq.':'3500 MB/s','Escritura seq.':'2800 MB/s',NAND:'3D NAND (TLC/QLC según lote)','TBW':'320 TB',Consumo:'Bajo, ideal para laptops',Garantía:'3 años limitada'} },
  { id:'ssd-wd-2tb', name:'WD Black SN850X 2TB', category:'almacenamiento', brand:'WD', price:159, stock:10, icon:'ssd',
    iface:'NVMe PCIe 4.0 x4', form:'M.2 2280', capGB:2000, perf:{sto:92}, tags:['2TB','Gaming','7300 MB/s'],
    specs:{Capacidad:'2 TB',Interfaz:'PCIe 4.0 x4, NVMe 1.4',Formato:'M.2 2280','Lectura seq.':'7300 MB/s','Escritura seq.':'6600 MB/s',IOPS:'1200K / 1100K',NAND:'BiCS5 3D TLC','Modo gaming':'Predicativo con Game Mode 2.0','TBW':'1200 TB',Garantía:'5 años limitada'} },
  { id:'hdd-seagate-2tb', name:'Seagate BarraCuda 2TB 7200RPM', category:'almacenamiento', brand:'Seagate', price:55, stock:18, icon:'ssd',
    iface:'SATA III', form:'3.5"', capGB:2000, perf:{sto:8}, tags:['2TB','SATA','HDD'],
    specs:{Capacidad:'2 TB',Interfaz:'SATA 6 Gb/s',Formato:'3.5 pulgadas',Velocidad:'7200 RPM',Caché:'256 MB','Lectura seq.':'220 MB/s',Ruido:'25 dB típico',Uso:'Almacenamiento masivo secundario',Garantía:'2 años'} },
  { id:'ssd-sata-480', name:'Kingston A400 480GB SATA', category:'almacenamiento', brand:'Kingston', price:32, stock:33, icon:'ssd',
    iface:'SATA III', form:'2.5"', capGB:480, perf:{sto:40}, tags:['480GB','SATA','2.5"'],
    specs:{Capacidad:'480 GB',Interfaz:'SATA 6 Gb/s',Formato:'2.5 pulgadas (7 mm)','Lectura seq.':'500 MB/s','Escritura seq.':'450 MB/s',NAND:'3D TLC','TBW':'160 TB',Uso:'Actualización de laptops y PC con SATA',Garantía:'3 años limitada'} },

  /* ---- Tarjetas gráficas ---- */
  { id:'gpu-gtx1660s', name:'NVIDIA GeForce GTX 1660 Super 6GB', category:'graficas', brand:'NVIDIA', price:199, stock:9, icon:'gpu',
    tdp:125, vram:6, length:230, perf:{gpu:45}, tags:['6GB','GTX','1080p'],
    specs:{GPU:'NVIDIA Turing TU116','Memoria VRAM':'6 GB GDDR6','Ancho de banda':'336 GB/s',Núcleos:'1408 CUDA',Frecuencia:'1530 MHz base / 1785 MHz boost',TDP:'125 W','Fuente recomendada':'450 W mínimo',Conectores:'1x 8 pines',Salidas:'DisplayPort 1.4a, HDMI 2.0b, DVI-D',Longitud:'230 mm (2 slots)',API:'DirectX 12, Vulkan, OpenGL 4.6',Rendimiento:'1080p alto en eSports, medio en AAA'} },
  { id:'gpu-rtx3060', name:'NVIDIA GeForce RTX 3060 12GB', category:'graficas', brand:'NVIDIA', price:299, stock:11, icon:'gpu',
    tdp:170, vram:12, length:242, perf:{gpu:62}, tags:['12GB','RTX','DLSS'],
    specs:{GPU:'NVIDIA Ampere GA106','Memoria VRAM':'12 GB GDDR6','Ancho de banda':'360 GB/s',Núcleos:'3584 CUDA',Frecuencia:'1320 MHz base / 1777 MHz boost',TDP:'170 W','Fuente recomendada':'550 W mínimo',Conectores:'1x 8 pines',Salidas:'3x DisplayPort 1.4a, 1x HDMI 2.1',Longitud:'242 mm (2 slots)',Tecnologías:'DLSS 2, Ray Tracing, NVIDIA Broadcast',Rendimiento:'1080p ultra / 1440p alto'} },
  { id:'gpu-rtx4060', name:'NVIDIA GeForce RTX 4060 8GB', category:'graficas', brand:'NVIDIA', price:319, stock:13, icon:'gpu',
    tdp:115, vram:8, length:245, perf:{gpu:66}, tags:['8GB','RTX 40','DLSS 3'],
    specs:{GPU:'NVIDIA Ada Lovelace AD107','Memoria VRAM':'8 GB GDDR6','Ancho de banda':'272 GB/s',Núcleos:'3072 CUDA',Frecuencia:'1830 MHz base / 2460 MHz boost',TDP:'115 W','Fuente recomendada':'550 W mínimo',Conectores:'1x 8 pines',Salidas:'3x DisplayPort 1.4a, 1x HDMI 2.1',Longitud:'245 mm (2 slots)',Tecnologías:'DLSS 3 con Frame Generation, Ray Tracing 3ª gen',Rendimiento:'1080p ultra / 1440p medio-alto'} },
  { id:'gpu-rtx4070', name:'NVIDIA GeForce RTX 4070 12GB', category:'graficas', brand:'NVIDIA', price:549, stock:6, icon:'gpu',
    tdp:200, vram:12, length:285, perf:{gpu:82}, tags:['12GB','RTX 40','1440p'],
    specs:{GPU:'NVIDIA Ada Lovelace AD104','Memoria VRAM':'12 GB GDDR6X','Ancho de banda':'504 GB/s',Núcleos:'5888 CUDA',Frecuencia:'1920 MHz base / 2475 MHz boost',TDP:'200 W','Fuente recomendada':'650 W mínimo',Conectores:'1x 16 pines (12VHPWR)',Salidas:'3x DisplayPort 1.4a, 1x HDMI 2.1',Longitud:'285 mm (2.5 slots)',Tecnologías:'DLSS 3, Ray Tracing 3ª gen, AV1 encode',Rendimiento:'1440p ultra / 4K medio'} },
  { id:'gpu-rtx4080', name:'NVIDIA GeForce RTX 4080 16GB', category:'graficas', brand:'NVIDIA', price:1199, stock:2, icon:'gpu',
    tdp:320, vram:16, length:336, perf:{gpu:100}, tags:['16GB','4K','Gama alta'],
    specs:{GPU:'NVIDIA Ada Lovelace AD103','Memoria VRAM':'16 GB GDDR6X','Ancho de banda':'717 GB/s',Núcleos:'9728 CUDA',Frecuencia:'2205 MHz base / 2505 MHz boost',TDP:'320 W','Fuente recomendada':'750 W mínimo (850 W recomendado)',Conectores:'1x 16 pines (12VHPWR)',Salidas:'3x DisplayPort 1.4a, 1x HDMI 2.1',Longitud:'336 mm (3 slots)',Tecnologías:'DLSS 3, Ray Tracing 3ª gen, AV1 encode',Rendimiento:'4K ultra / 1440p competitivo 240+ fps'} },
  { id:'gpu-rx7600', name:'AMD Radeon RX 7600 8GB', category:'graficas', brand:'AMD', price:269, stock:12, icon:'gpu',
    tdp:165, vram:8, length:240, perf:{gpu:60}, tags:['8GB','RDNA 3','1080p'],
    specs:{GPU:'AMD RDNA 3 Navi 33','Memoria VRAM':'8 GB GDDR6','Ancho de banda':'288 GB/s','Stream processors':'2048',Frecuencia:'1720 MHz juego / 2655 MHz boost',TDP:'165 W','Fuente recomendada':'550 W mínimo',Conectores:'1x 8 pines',Salidas:'3x DisplayPort 2.1, 1x HDMI 2.1',Longitud:'240 mm (2 slots)',Tecnologías:'FSR 3, Ray Tracing 2ª gen, AV1 encode',Rendimiento:'1080p ultra / 1440p medio'} },
  { id:'gpu-gtx1050ti', name:'NVIDIA GeForce GTX 1050 Ti 4GB', category:'graficas', brand:'NVIDIA', price:129, stock:6, icon:'gpu',
    tdp:75, vram:4, length:215, perf:{gpu:22}, tags:['4GB','GTX','Bajo consumo'],
    specs:{GPU:'NVIDIA Pascal GP107','Memoria VRAM':'4 GB GDDR5','Ancho de banda':'112 GB/s',Núcleos:'768 CUDA',Frecuencia:'1290 MHz base / 1392 MHz boost',TDP:'75 W','Fuente recomendada':'300 W (sin conector auxiliar)',Conectores:'Ninguno (alimentación por PCIe)',Salidas:'DisplayPort 1.4, HDMI 2.0b, DVI-D',Longitud:'215 mm (2 slots)',Rendimiento:'1080p medio en eSports, bajo en AAA modernos'} },
  { id:'gpu-gtx1650', name:'NVIDIA GeForce GTX 1650 4GB', category:'graficas', brand:'NVIDIA', price:159, stock:8, icon:'gpu',
    tdp:75, vram:4, length:220, perf:{gpu:28}, tags:['4GB','GTX','Sin conector'],
    specs:{GPU:'NVIDIA Turing TU117','Memoria VRAM':'4 GB GDDR6','Ancho de banda':'192 GB/s',Núcleos:'896 CUDA',Frecuencia:'1485 MHz base / 1665 MHz boost',TDP:'75 W','Fuente recomendada':'300 W (sin conector auxiliar)',Conectores:'Ninguno en la mayoría de modelos',Salidas:'DisplayPort 1.4, HDMI 2.0b, DVI-D',Longitud:'220 mm (2 slots)',Rendimiento:'1080p medio en eSports'} },

  /* ---- Fuentes de poder ---- */
  { id:'psu-500w', name:'EVGA 500 W1 80+ White 500W', category:'fuentes', brand:'EVGA', price:44, stock:20, icon:'psu',
    watts:500, efficiency:'80+ White', perf:{}, tags:['500W','80+ White','No modular'],
    specs:{Potencia:'500 W',Certificación:'80 PLUS White (80% eficiencia)','Riel +12V':'40 A (480 W)',Modular:'No modular',Ventilador:'120 mm con control térmico',Protecciones:'OVP, UVP, OCP, SCC',Conectores:'1x 4+4 pines CPU, 1x 6+2 pines PCIe, 4x SATA',Formato:'ATX',Garantía:'3 años'} },
  { id:'psu-650w', name:'Corsair CX650 80+ Bronze 650W', category:'fuentes', brand:'Corsair', price:69, stock:15, icon:'psu',
    watts:650, efficiency:'80+ Bronze', perf:{}, tags:['650W','Bronze','Semi-modular'],
    specs:{Potencia:'650 W',Certificación:'80 PLUS Bronze (85% eficiencia)','Riel +12V':'54 A (648 W)',Modular:'Semi-modular (cables planos)',Ventilador:'120 mm con rodamiento de rifle',Protecciones:'OVP, UVP, SCP, OTP, OPP',Conectores:'1x 4+4 pines CPU, 2x 6+2 pines PCIe, 7x SATA',Formato:'ATX',Garantía:'5 años'} },
  { id:'psu-750w', name:'Corsair RM750e 80+ Gold 750W', category:'fuentes', brand:'Corsair', price:99, stock:12, icon:'psu',
    watts:750, efficiency:'80+ Gold', perf:{}, tags:['750W','Gold','Modular','12VHPWR'],
    specs:{Potencia:'750 W',Certificación:'80 PLUS Gold (90% eficiencia)','Riel +12V':'62.5 A (750 W)',Modular:'Totalmente modular',Ventilador:'120 mm, modo Zero RPM',Protecciones:'OVP, UVP, SCP, OTP, OPP',Conectores:'2x 4+4 pines CPU, 1x 12VHPWR, 3x 6+2 pines PCIe, 8x SATA',Formato:'ATX (140 mm de fondo)',Garantía:'7 años'} },
  { id:'psu-850w', name:'Seasonic Focus GX-850 80+ Gold 850W', category:'fuentes', brand:'Seasonic', price:139, stock:7, icon:'psu',
    watts:850, efficiency:'80+ Gold', perf:{}, tags:['850W','Gold','Modular'],
    specs:{Potencia:'850 W',Certificación:'80 PLUS Gold (90% eficiencia)','Riel +12V':'70 A (840 W)',Modular:'Totalmente modular',Ventilador:'120 mm FDB, modo híbrido',Protecciones:'OVP, UVP, OCP, SCP, OTP, OPP',Conectores:'2x 4+4 pines CPU, 6x 6+2 pines PCIe, 10x SATA',Formato:'ATX (140 mm de fondo)',Garantía:'10 años'} },
  { id:'psu-1000w', name:'Corsair RM1000x 80+ Gold 1000W', category:'fuentes', brand:'Corsair', price:189, stock:5, icon:'psu',
    watts:1000, efficiency:'80+ Gold', perf:{}, tags:['1000W','Gold','ATX 3.0'],
    specs:{Potencia:'1000 W',Certificación:'80 PLUS Gold (90% eficiencia)','Riel +12V':'83.3 A (1000 W)',Modular:'Totalmente modular',Estándar:'ATX 3.0 / PCIe 5.0',Ventilador:'135 mm Magnetic Dome, Zero RPM',Protecciones:'OVP, UVP, SCP, OTP, OPP, SIP',Conectores:'2x 4+4 pines CPU, 1x 12VHPWR (600 W), 4x 6+2 pines PCIe, 14x SATA',Formato:'ATX (160 mm de fondo)',Garantía:'10 años'} },

  /* ---- Gabinetes ---- */
  { id:'case-nzxt-h5', name:'NZXT H5 Flow ATX', category:'gabinetes', brand:'NZXT', price:94, stock:9, icon:'case',
    formFactors:['ATX','mATX','ITX'], gpuMaxLen:365, perf:{}, tags:['ATX','Flujo de aire'],
    specs:{Formato:'ATX / Micro-ATX / Mini-ITX',Material:'Acero SECC, panel frontal perforado',Ventiladores:'2x 120 mm incluidos, soporte hasta 7','Longitud máxima GPU':'365 mm','Altura máxima cooler':'165 mm','Radiadores':'Frontal hasta 280 mm, superior 240 mm',Bahías:'2x 2.5", 1x 3.5"',Puertos:'USB-C 3.2 Gen 2, 2x USB-A 3.2, audio combo',Dimensiones:'447 x 220 x 464 mm'} },
  { id:'case-corsair-4000d', name:'Corsair 4000D Airflow', category:'gabinetes', brand:'Corsair', price:89, stock:14, icon:'case',
    formFactors:['ATX','mATX','ITX'], gpuMaxLen:360, perf:{}, tags:['ATX','Airflow'],
    specs:{Formato:'ATX / Micro-ATX / Mini-ITX',Material:'Acero, panel frontal de malla de acero',Ventiladores:'2x 120 mm AirGuide incluidos, soporte hasta 6','Longitud máxima GPU':'360 mm','Altura máxima cooler':'170 mm','Radiadores':'Frontal hasta 360 mm, superior 240 mm',Bahías:'2x 2.5", 2x 3.5"',Puertos:'USB-C 3.1, 2x USB-A 3.0, audio combo',Gestión:'Sistema RapidRoute de canalizado',Dimensiones:'453 x 230 x 466 mm'} },
  { id:'case-tt-versa-h18', name:'Thermaltake Versa H18 mATX', category:'gabinetes', brand:'Thermaltake', price:54, stock:17, icon:'case',
    formFactors:['mATX','ITX'], gpuMaxLen:330, perf:{}, tags:['mATX','Compacto','Económico'],
    specs:{Formato:'Micro-ATX / Mini-ITX',Material:'Acero SPCC, panel frontal de malla',Ventiladores:'1x 120 mm trasero incluido, soporte hasta 4','Longitud máxima GPU':'330 mm','Altura máxima cooler':'155 mm','Radiadores':'Frontal hasta 240 mm',Bahías:'2x 2.5", 1x 3.5"',Puertos:'2x USB 3.0, audio combo',Dimensiones:'390 x 200 x 380 mm'} },
  { id:'case-lian-li-216', name:'Lian Li Lancool 216', category:'gabinetes', brand:'Lian Li', price:109, stock:6, icon:'case',
    formFactors:['ATX','mATX','ITX'], gpuMaxLen:392, perf:{}, tags:['ATX','2x 160mm','Premium'],
    specs:{Formato:'ATX / Micro-ATX / Mini-ITX',Material:'Acero 0.8 mm, lateral de vidrio templado',Ventiladores:'2x 160 mm frontales + 1x 120 mm trasero incluidos','Longitud máxima GPU':'392 mm','Altura máxima cooler':'180 mm','Radiadores':'Frontal hasta 360 mm, superior 240 mm',Bahías:'4x 2.5", 2x 3.5"',Puertos:'USB-C 3.1, 2x USB-A 3.0, audio combo',Dimensiones:'470 x 235 x 480 mm'} },

  /* ---- Sistemas operativos ---- */
  { id:'os-win11-home', name:'Windows 11 Home 64-bit OEM', category:'software', brand:'Microsoft', price:119, stock:30, icon:'os',
    perf:{}, tags:['Windows 11','OEM','64-bit'],
    specs:{Edición:'Windows 11 Home',Arquitectura:'64-bit',Licencia:'OEM (ligada al hardware)',Requisitos:'CPU 1 GHz+ 2 núcleos, 4 GB RAM, 64 GB de almacenamiento, TPM 2.0, UEFI Secure Boot',Idioma:'Español / Inglés',Actualizaciones:'Soporte de actualizaciones de seguridad continuo',Extras:'Microsoft Store, Copilot, DirectX 12 Ultimate'} },
  { id:'os-win11-pro', name:'Windows 11 Pro 64-bit OEM', category:'software', brand:'Microsoft', price:149, stock:24, icon:'os',
    perf:{}, tags:['Windows 11','Pro','BitLocker'],
    specs:{Edición:'Windows 11 Pro',Arquitectura:'64-bit',Licencia:'OEM (ligada al hardware)',Requisitos:'CPU 1 GHz+ 2 núcleos, 4 GB RAM, 64 GB de almacenamiento, TPM 2.0, UEFI Secure Boot',Extras:'BitLocker, Hyper-V, Escritorio remoto, Grupo de directivas, Azure AD Join',Idioma:'Español / Inglés',Actualizaciones:'Soporte extendido para empresas'} },
  { id:'os-ubuntu-2404', name:'Ubuntu 24.04 LTS (licencia libre)', category:'software', brand:'Canonical', price:0, stock:99, icon:'os',
    perf:{}, tags:['Linux','LTS','Gratuito'],
    specs:{Edición:'Ubuntu Desktop 24.04 LTS',Arquitectura:'64-bit / ARM64',Licencia:'Gratuita (GPL / código abierto)',Soporte:'Hasta abril de 2029 (12 años con Ubuntu Pro)',Requisitos:'CPU 2 GHz doble núcleo, 4 GB RAM, 25 GB de almacenamiento',Escritorio:'GNOME 46',Extras:'Snap, Wayland, kernel 6.8'} },

  /* ---- Periféricos ---- */
  { id:'kb-logi-mx-keys', name:'Logitech MX Keys S', category:'perifericos', brand:'Logitech', price:99, stock:16, icon:'keyboard',
    perf:{}, tags:['Inalámbrico','Low profile'],
    specs:{Tipo:'Membrana de bajo perfil (Perfect Stroke)',Conexión:'Bluetooth LE + receptor Logi Bolt USB-A',Iluminación:'Retroiluminación inteligente',Batería:'Recargable USB-C, hasta 10 días',Multidispositivo:'3 dispositivos con Easy-Switch',Compatibilidad:'Windows, macOS, Linux, iPadOS',Extras:'Teclas de función personalizables (Logi Options+)',Dimensiones:'430 x 132 x 20 mm'} },
  { id:'kb-logi-g-pro-tkl', name:'Logitech G Pro X TKL Lightspeed', category:'perifericos', brand:'Logitech', price:179, stock:7, icon:'keyboard',
    perf:{}, tags:['Mecánico','Gaming','TKL'],
    specs:{Tipo:'Mecánico GX (switches intercambiables en formato MX)',Formato:'Tenkeyless (87 teclas)',Conexión:'Lightspeed inalámbrico, Bluetooth, USB-C',Iluminación:'LIGHTSYNC RGB por tecla',Batería:'Hasta 50 h con RGB',Interruptores:'GX Red lineal / GX Brown táctil / GX Blue clicky',Compatibilidad:'Windows, macOS',Peso:'980 g'} },
  { id:'mouse-logi-mx-master3s', name:'Logitech MX Master 3S', category:'perifericos', brand:'Logitech', price:99, stock:19, icon:'mouse',
    perf:{}, tags:['Ergonómico','8K DPI','Silencioso'],
    specs:{Sensor:'Darkfield 8000 DPI (funciona en vidrio)',Botones:'7 programables',Scroll:'MagSpeed electromagnético + rueda lateral',Conexión:'Bluetooth LE + Logi Bolt',Batería:'USB-C, hasta 70 días',Clics:'Silenciosos (90% menos ruido)',Multidispositivo:'3 con Easy-Switch',Compatibilidad:'Windows, macOS, Linux',Peso:'141 g'} },
  { id:'mouse-logi-g502x', name:'Logitech G502 X Lightspeed', category:'perifericos', brand:'Logitech', price:139, stock:11, icon:'mouse',
    perf:{}, tags:['Gaming','25.6K DPI'],
    specs:{Sensor:'HERO 25K (100-25600 DPI)',Botones:'13 programables, switches híbridos LIGHTFORCE',Scroll:'Doble modo hiper rápido',Conexión:'Lightspeed inalámbrico / USB-C',Batería:'Hasta 130 h',Peso:'102 g (ajustable con contrapeso)',Compatibilidad:'Windows, macOS',Extras:'Compatible con POWERPLAY'} },
  { id:'headset-logi-g733', name:'Logitech G733 Lightspeed', category:'perifericos', brand:'Logitech', price:129, stock:13, icon:'headset',
    perf:{}, tags:['Inalámbrico','7.1','278 g'],
    specs:{Drivers:'PRO-G 40 mm',Audio:'DTS Headphone:X 2.0 surround 7.1',Micrófono:'Extraíble, cardioide con Blue VO!CE',Conexión:'Lightspeed inalámbrico 2.4 GHz',Batería:'Hasta 29 h',Peso:'278 g',Almohadillas:'Memoria con doble capa, diadema suspendida',Compatibilidad:'Windows, macOS, PS5, Nintendo Switch'} },

  /* ---- Accesorios ---- */
  { id:'acc-dell-dock', name:'Dell Universal Dock D6000', category:'accesorios', brand:'Dell', price:159, stock:8, icon:'dock',
    perf:{}, tags:['USB-C','Triple monitor'],
    specs:{Conexión:'USB-C / USB-A (DisplayLink)',Video:'2x HDMI 2.0 + 1x DisplayPort (hasta 3 monitores 4K)',Red:'Ethernet Gigabit',USB:'3x USB-A 3.0, 2x USB-A 2.0, 1x USB-C',Audio:'Combo 3.5 mm frontal',Potencia:'Hasta 65 W de carga al portátil',Compatibilidad:'Windows, macOS (requiere driver DisplayLink)'} },
  { id:'acc-logi-c920', name:'Logitech C920 HD Pro Webcam', category:'accesorios', brand:'Logitech', price:69, stock:23, icon:'cam',
    perf:{}, tags:['1080p','Autofoco'],
    specs:{Resolución:'1080p a 30 fps / 720p a 30 fps',Sensor:'Full HD con lente de cristal',Enfoque:'Autofoco continuo',Campo:'Diagonal 78°',Micrófonos:'2 estéreo omnidireccionales',Montaje:'Clip universal + rosca para trípode',Conexión:'USB-A 2.0',Compatibilidad:'Windows, macOS, ChromeOS'} },
  { id:'acc-apc-ups', name:'APC Back-UPS 600VA', category:'accesorios', brand:'APC', price:74, stock:14, icon:'ups',
    perf:{}, tags:['600VA','Protección'],
    specs:{Capacidad:'600 VA / 330 W',Topología:'Line-interactive',Forma:'Onda senoidal simulada',Tomas:'8 (4 con respaldo de batería + protección)',Tiempo:'Hasta 15 min con PC de oficina',Protección:'Red/telefonía/coaxial, AVR de 2 etapas',Batería:'12 V 7 Ah reemplazable',Garantía:'2 años, equipo conectado hasta $75,000'} },
  { id:'acc-noctua-u12s', name:'Noctua NH-U12S chromax.black', category:'accesorios', brand:'Noctua', price:59, stock:10, icon:'cooler',
    height:158, sockets:['LGA1700','AM5','AM4'], perf:{}, tags:['120mm','Silencioso','158mm'],
    specs:{Tipo:'Torre de aire, 1 ventilador de 120 mm',Altura:'158 mm',Ventilador:'Noctua NF-F12 PWM (300-1500 RPM)','Nivel de ruido':'22.4 dB(A) máx.','Flujo de aire':'93.4 m³/h',Heatpipes:'5 de cobre de 6 mm',Sockets:'Intel LGA1700/1200/115x, AMD AM5/AM4/AM3(+)',TDP:'Recomendado para CPUs de hasta 180 W con buen flujo',Garantía:'6 años'} }
];

const byId = id => PRODUCTS.find(p => p.id === id);
const byCat = id => PRODUCTS.filter(p => p.category === id);
const BRANDS = Array.from(new Set(PRODUCTS.map(p => p.brand))).sort();

/* Imágenes por categoría (carpeta img/) */
const CAT_IMG = {
  laptops:'img/laptops.png', monitores:'img/monitores.png', procesadores:'img/procesadores.png',
  placas:'img/placas.png', memorias:'img/memorias.png', almacenamiento:'img/almacenamiento.png',
  graficas:'img/graficas.png', fuentes:'img/fuentes.png', gabinetes:'img/gabinetes.png',
  software:'img/software.png', perifericos:'img/perifericos.png', accesorios:'img/accesorios.png',
  escritorio:'img/gabinetes.png'
};
/* Imágenes por producto (carpeta img/Img/, nombradas igual que el producto) */
const PROD_IMG_SET = new Set(["AMD Radeon RX 7600 8GB","AMD Ryzen 5 5600","AMD Ryzen 5 7600","AMD Ryzen 7 7700X","AMD Ryzen 9 7900X","APC Back-UPS 600VA","ASUS Prime H610M-K D4","ASUS Prime Z690-P WiFi","ASUS ROG Strix G16 (RTX 4070)","ASUS TUF Gaming X670E-Plus","ASUS VivoBook 15 X1504","Corsair 4000D Airflow","Corsair CX650 80+ Bronze 650W","Corsair RM1000x 80+ Gold 1000W","Corsair RM750e 80+ Gold 750W","Corsair Vengeance 32GB (2x16) DDR5-5600","Corsair Vengeance LPX 16GB (2x8) DDR4-3600","Dell Inspiron 15 3520","Dell Universal Dock D6000","Dell XPS 13 9315","EVGA 500 W1 80+ White 500W","Gigabyte B550 AORUS Elite V2","Gigabyte B760M DS3H DDR4","HP Pavilion 15-eg3000","HP Victus 16 (RTX 4060)","Intel Core i5-12400F","Intel Core i5-13400","Intel Core i7-13700K","Intel Core i9-13900K","Kingston A400 480GB SATA","Kingston Fury Beast 16GB (2x8) DDR4-3200","Kingston Fury Beast 16GB DDR5-5200","Kingston Fury Beast 32GB (2x16) DDR4-3600","Kingston Fury Beast 32GB (2x16) DDR5-6000","Kingston Fury Beast 8GB DDR4-3200","Kingston NV2 1TB PCIe 4.0","LG 24MP400 24 IPS","LG UltraGear 27GP850 27","Lenovo IdeaPad 3 15ALC6","Lenovo ThinkPad E14 Gen 5","Lian Li Lancool 216","Logitech C920 HD Pro Webcam","Logitech G Pro X TKL Lightspeed","Logitech G502 X Lightspeed","Logitech G733 Lightspeed","Logitech MX Keys S","Logitech MX Master 3S","MSI PRO B650M-A WiFi","MSI PRO B660M-A DDR4","NVIDIA GeForce GTX 1050 Ti 4GB","NVIDIA GeForce GTX 1650 4GB","NVIDIA GeForce GTX 1660 Super 6GB","NVIDIA GeForce RTX 3060 12GB","NVIDIA GeForce RTX 4060 8GB","NVIDIA GeForce RTX 4070 12GB","NVIDIA GeForce RTX 4080 16GB","NZXT H5 Flow ATX","Noctua NH-U12S chromax.black","Samsung 970 EVO Plus 1TB NVMe","Samsung 980 500GB NVMe","Samsung 990 PRO 2TB PCIe 4.0","Samsung Odyssey G5 27 QHD","Samsung ViewFinity S7 27 4K","Seagate BarraCuda 2TB 7200RPM","Seasonic Focus GX-850 80+ Gold 850W","Thermaltake Versa H18 mATX","Ubuntu 24.04 LTS (licencia libre)","WD Black SN850X 2TB","Windows 11 Home 64-bit OEM","Windows 11 Pro 64-bit OEM"]);
const prodImg = p => {
  if (!p || !p.name) return '';
  const key = p.name.replace(/"/g, '');
  return PROD_IMG_SET.has(key) ? 'img/Img/' + encodeURIComponent(key) + '.jpg' : '';
};
const catImg = p => prodImg(p) || CAT_IMG[p?.category] || '';
const thumbHTML = (p, cls) => catImg(p)
  ? `<img class="${cls}" src="${catImg(p)}" alt="" loading="lazy">`
  : `<span class="picon" style="width:34px;height:34px">${ICONS[p.icon] || ICONS.box}</span>`;

/* Kits de escritorio preconfigurados para el recomendador */
const DESKTOP_KITS = [
  { id:'kit-esencial', name:'KRONOX Esencial (escritorio)', category:'escritorio', brand:'KRONOX', icon:'case',
    parts:['cpu-i5-13400','mb-b760-giga','ram-king-16-ddr4','ssd-samsung-500','psu-500w','case-tt-versa-h18','os-win11-home'],
    uses:{estudio:3,oficina:3,programacion:2,diseno:1,gaming:1,video:1}, perf:{cpu:60,gpu:10}, ramGB:16,
    why:'CPU de 10 núcleos con gráficos integrados: suficiente para ofimática, clases en línea y edición ligera sin gastar en una GPU dedicada.' },
  { id:'kit-dev', name:'KRONOX Dev Station (escritorio)', category:'escritorio', brand:'KRONOX', icon:'case',
    parts:['cpu-i7-13700k','mb-z690-asus','ram-king-32-ddr5','ssd-samsung-990-2tb','psu-750w','case-corsair-4000d','os-win11-pro'],
    uses:{estudio:1,oficina:2,programacion:3,diseno:2,gaming:2,video:3}, perf:{cpu:84,gpu:10}, ramGB:32,
    why:'16 núcleos y 32 GB DDR5 compilando en paralelo, con NVMe 4.0 de 2 TB para contenedores, máquinas virtuales y repositorios grandes.' },
  { id:'kit-gaming', name:'KRONOX Gaming 1080p (escritorio)', category:'escritorio', brand:'KRONOX', icon:'case',
    parts:['cpu-r5-7600','mb-b650-msi','ram-king-16-ddr5','ssd-kingston-nv2-1tb','gpu-rtx4060','psu-650w','case-nzxt-h5','os-win11-home'],
    uses:{estudio:1,oficina:1,programacion:2,diseno:2,gaming:3,video:2}, perf:{cpu:66,gpu:66}, ramGB:16,
    why:'Plataforma AM5 con Zen 4 y RTX 4060 con DLSS 3: 1080p en ultra y 1440p jugable, con ruta de actualización a CPUs AM5 futuros.' },
  { id:'kit-creator', name:'KRONOX Creator (escritorio)', category:'escritorio', brand:'KRONOX', icon:'case',
    parts:['cpu-r7-7700x','mb-b650-msi','ram-king-32-ddr5','ssd-samsung-1tb','gpu-rtx4060','psu-750w','case-corsair-4000d','os-win11-pro'],
    uses:{estudio:1,oficina:2,programacion:3,diseno:3,gaming:2,video:3}, perf:{cpu:76,gpu:66}, ramGB:32,
    why:'8 núcleos Zen 4 con 32 GB DDR5 y CUDA/NVENC para previsualización y exportación rápida en Premiere, DaVinci o After Effects.' },
  { id:'kit-ultra', name:'KRONOX Ultra 1440p (escritorio)', category:'escritorio', brand:'KRONOX', icon:'case',
    parts:['cpu-i9-13900k','mb-z690-asus','ram-king-32-ddr5','ssd-wd-2tb','gpu-rtx4070','psu-850w','case-lian-li-216','os-win11-pro'],
    uses:{estudio:0,oficina:2,programacion:3,diseno:3,gaming:3,video:3}, perf:{cpu:100,gpu:82}, ramGB:32,
    why:'24 núcleos y RTX 4070 con 12 GB GDDR6X: 1440p en ultra, render 3D y timelines 4K multicámara sin cuellos de botella.' }
];
DESKTOP_KITS.forEach(k => {
  k.price = k.parts.reduce((s, id) => s + (byId(id)?.price || 0), 0);
  k.stock = Math.min(...k.parts.map(id => byId(id)?.stock ?? 0));
});

/* Componentes "que ya tengo" para el recomendador de upgrades */
const OWNED_BASE = [
  { id:'own-gtx1050ti', category:'graficas', name:'NVIDIA GTX 1050 Ti 4GB', perf:22, tdp:75 },
  { id:'own-gtx1650',   category:'graficas', name:'NVIDIA GTX 1650 4GB',    perf:28, tdp:75 },
  { id:'own-gtx1660s',  category:'graficas', name:'NVIDIA GTX 1660 Super 6GB', perf:45, tdp:125 },
  { id:'own-rtx3060',   category:'graficas', name:'NVIDIA RTX 3060 12GB',   perf:62, tdp:170 },
  { id:'own-rx570',     category:'graficas', name:'AMD Radeon RX 570 4GB',  perf:33, tdp:150 },
  { id:'own-i3-10100',  category:'procesadores', name:'Intel Core i3-10100', perf:30, tdp:65 },
  { id:'own-i5-8400',   category:'procesadores', name:'Intel Core i5-8400',  perf:38, tdp:65 },
  { id:'own-r3-3200g',  category:'procesadores', name:'AMD Ryzen 3 3200G',   perf:26, tdp:65 },
  { id:'own-r5-3600',   category:'procesadores', name:'AMD Ryzen 5 3600',    perf:48, tdp:65 },
  { id:'own-ram4',      category:'memorias', name:'4 GB DDR4-2400 (1 módulo)', perf:12, ramType:'DDR4', ramGB:4 },
  { id:'own-ram8',      category:'memorias', name:'8 GB DDR4-2666 (1 módulo)', perf:30, ramType:'DDR4', ramGB:8 },
  { id:'own-ram16',     category:'memorias', name:'16 GB DDR4-3200 (2 módulos)', perf:55, ramType:'DDR4', ramGB:16 },
  { id:'own-hdd',       category:'almacenamiento', name:'HDD 1 TB 7200 RPM SATA', perf:8 },
  { id:'own-sata-ssd',  category:'almacenamiento', name:'SSD SATA 480 GB 2.5"', perf:40 },
  { id:'own-nvme-500',  category:'almacenamiento', name:'SSD NVMe 500 GB PCIe 3.0', perf:62 }
];

/* Códigos de promoción */
const PROMOS = {
  KRONOX10: { pct:10, label:'KRONOX10', desc:'Descuento general' },
  KRONOX20: { pct:20, label:'KRONOX20', desc:'Descuento general' },
  EDU15:    { pct:15, label:'EDU15',    desc:'Estudiantes' },
  TECH25:   { pct:25, label:'TECH25',   desc:'Tecnología' },
  VERANO5:  { pct:5,  label:'VERANO5',  desc:'Temporada' },
  LAUNCH50: { pct:50, label:'LAUNCH50', desc:'Lanzamiento especial' }
};
const IVA = 0.13;
const TEST_USER = { email:'admin@kronoxlabs.com', password:'Admin1234', name:'Administrador', phone:'+503 7000-0000' };

/* ------------------------------------------------------------
   3. Estado global
   ------------------------------------------------------------ */
const State = {
  get users() {
    const u = Store.get('users', []);
    if (!u.some(x => x.email === TEST_USER.email)) { u.push({ ...TEST_USER }); Store.set('users', u); }
    return u;
  },
  saveUsers(u) { Store.set('users', u); },
  get session() { return Store.get('session', null); },
  set session(v) { v ? Store.set('session', v) : Store.del('session'); },
  get quote() { return Store.get('quote', { items: [], promo: null }); },
  set quote(v) { Store.set('quote', v); },
  get favs() { return Store.get('favs', []); },
  set favs(v) { Store.set('favs', v); },
  get build() { return Store.get('build', {}); },
  set build(v) { Store.set('build', v); },
  get history() { return Store.get('history', null); },
  set history(v) { Store.set('history', v); },
  get coupons() { return Store.get('coupons', null); },
  set coupons(v) { Store.set('coupons', v); },
  profile() {
    const s = this.session; if (!s) return null;
    return this.users.find(u => u.email === s.email) || null;
  }
};

/* Historial de ejemplo (se siembra una sola vez al registrarse/iniciar sesión) */
function seedHistory(email) {
  const h = Store.get('history_' + email, null);
  if (h) return h;
  const today = new Date();
  const d = n => { const x = new Date(today); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  const mk = (id, date, items, promo) => {
    const sub = items.reduce((s, i) => s + i.price * i.qty, 0);
    const disc = promo ? sub * (PROMOS[promo]?.pct || 0) / 100 : 0;
    const total = (sub - disc) * (1 + IVA);
    return { id, date, items, promo, subtotal: sub, discount: disc, total };
  };
  const seeded = [
    mk('KF-4821', d(21), [
      { id:'cpu-r5-7600', name:'AMD Ryzen 5 7600', qty:1, price:199 },
      { id:'mb-b650-msi', name:'MSI PRO B650M-A WiFi', qty:1, price:169 },
      { id:'ram-king-16-ddr5', name:'Kingston Fury Beast 16GB DDR5-5200', qty:1, price:58 }
    ], 'KRONOX10'),
    mk('KF-4906', d(6), [
      { id:'gpu-rtx4060', name:'NVIDIA GeForce RTX 4060 8GB', qty:1, price:319 },
      { id:'psu-650w', name:'Corsair CX650 80+ Bronze 650W', qty:1, price:69 },
      { id:'ssd-kingston-nv2-1tb', name:'Kingston NV2 1TB PCIe 4.0', qty:1, price:59 }
    ], null)
  ];
  Store.set('history_' + email, seeded);
  return seeded;
}
const history = email => Store.get('history_' + email, []);
const addHistory = (email, rec) => { const h = history(email); h.unshift(rec); Store.set('history_' + email, h.slice(0, 30)); return h; };

/* ------------------------------------------------------------
   4. Toasts
   ------------------------------------------------------------ */
function toast(msg, kind = '') {
  let wrap = $('.toasts');
  if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toasts'; document.body.appendChild(wrap); }
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = `<span style="width:16px;height:16px;flex:none;color:${kind === 'err' ? 'var(--err)' : kind === 'ok' ? 'var(--ok)' : 'var(--accent)'}">${kind === 'ok' ? ICONS.check : kind === 'err' ? ICONS.x : ICONS.info}</span><span>${esc(msg)}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .2s'; setTimeout(() => el.remove(), 220); }, 2600);
}

/* ------------------------------------------------------------
   5. Modal base
   ------------------------------------------------------------ */
function openModal(html, opts = {}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${opts.size || ''}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('open'));
  const close = () => { ov.classList.remove('open'); setTimeout(() => ov.remove(), 180); };
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  $$('[data-close]', ov).forEach(b => b.addEventListener('click', close));
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); }
  });
  return { el: ov, close };
}

/* ------------------------------------------------------------
   6. Shell compartido: navbar, footer, modal de auth
   ------------------------------------------------------------ */
const NAV_LINKS = [
  { href:'index.html', label:'Inicio', page:'inicio' },
  { href:'catalogo.html', label:'Catálogo', page:'index' },
  { href:'compatibilidad.html', label:'Compatibilidad', page:'compatibilidad' },
  { href:'cotizador.html', label:'Cotizador', page:'cotizador' },
  { href:'recomendador.html', label:'Recomendador', page:'recomendador' },
  { href:'nosotros.html', label:'Nosotros', page:'nosotros' },
  { href:'cuenta.html', label:'Mi cuenta', page:'cuenta' }
];

function renderNav() {
  const host = $('#navbar'); if (!host) return;
  const s = State.session;
  const qCount = State.quote.items.reduce((n, i) => n + i.qty, 0);
  const initial = s ? (s.name || s.email).trim().charAt(0).toUpperCase() : '';
  host.innerHTML = `
  <nav class="nav">
    <div class="nav-inner">
      <button class="icon-btn nav-burger" id="burger" aria-label="Menú">${ICONS.menu}</button>
      <a class="logo" href="index.html">
        <img class="logo-mark" src="img/logo-k-glow.png" alt="Kronox Forge">
        <span class="logo-txt">KRONOX <b>FORGE</b></span>
      </a>
      <div class="nav-links">
        <a class="nav-link ${PAGE === 'inicio' ? 'active' : ''}" href="index.html">Inicio</a>
        <div class="nav-cat" id="navCat">
          <button class="nav-link nav-cat-btn ${PAGE === 'index' ? 'active' : ''}" id="navCatBtn" aria-haspopup="true" aria-expanded="false">
            <span class="nc-ic">${ICONS.layers}</span> Catálogo
            <svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
          <div class="cat-mega hidden" id="catMega">
            <div class="cat-mega-grid">
              <a class="cat-mega-item" href="catalogo.html"><span class="cm-ic">${ICONS.layers}</span><span class="cm-tx">Todas<small>${PRODUCTS.length} productos</small></span></a>
              ${CATEGORIES.map(c => `<a class="cat-mega-item" href="catalogo.html?cat=${c.id}"><span class="cm-ic">${ICONS[c.icon]}</span><span class="cm-tx">${c.name}<small>${PRODUCTS.filter(p => p.category === c.id).length} productos</small></span></a>`).join('')}
            </div>
          </div>
        </div>
        ${NAV_LINKS.filter(l => l.page !== 'index' && l.page !== 'cuenta' && l.page !== 'inicio').map(l => `<a class="nav-link ${PAGE === l.page ? 'active' : ''}" href="${l.href}">${l.label}</a>`).join('')}
      </div>
      <div class="nav-search">
        <div class="search-input-wrap">
          ${ICONS.search.replace('<svg', '<svg width="14" height="14"')}
          <input type="search" id="gsearch" placeholder="Buscar en el catálogo…" autocomplete="off" aria-label="Buscador global">
        </div>
        <div id="gsuggest"></div>
      </div>
      <div class="nav-actions">
        <a class="icon-btn" href="cotizador.html" title="Cotizador" aria-label="Cotizador">${ICONS.cart}${qCount ? `<span class="badge-count">${qCount}</span>` : ''}</a>
        ${s ? `
          <div style="position:relative">
            <button class="nav-user" id="userBtn" title="${esc(s.name || s.email)}"><span class="avatar">${esc(initial)}</span></button>
            <div class="menu menu-clean hidden" id="userMenu">
              <a href="cuenta.html">Administrar cuenta</a>
              <button id="logoutBtn">Cerrar sesión</button>
            </div>
          </div>` : `
          <button class="btn btn-sm btn-primary" id="loginBtn">${ICONS.user} Ingresar</button>`}
      </div>
    </div>
    <div class="mobile-menu" id="mobileMenu">
      <a class="mm-link ${PAGE === 'inicio' ? 'active' : ''}" href="index.html"><span>Inicio</span><svg class="mm-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></a>
      <button type="button" class="mm-link mm-cat-toggle" id="mmCatToggle" aria-expanded="false"><span>Categorías</span><svg class="mm-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button>
      <div class="mm-cat-panel hidden" id="mmCatPanel">
        <a href="catalogo.html">Todas</a>
        ${CATEGORIES.map(c => `<a href="catalogo.html?cat=${c.id}">${c.name}</a>`).join('')}
      </div>
      <a class="mm-link ${PAGE === 'compatibilidad' ? 'active' : ''}" href="compatibilidad.html"><span>Compatibilidad</span><svg class="mm-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></a>
      <a class="mm-link ${PAGE === 'cotizador' ? 'active' : ''}" href="cotizador.html"><span>Cotizador</span><svg class="mm-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></a>
      <a class="mm-link ${PAGE === 'recomendador' ? 'active' : ''}" href="recomendador.html"><span>Recomendador</span><svg class="mm-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></a>
      <a class="mm-link ${PAGE === 'nosotros' ? 'active' : ''}" href="nosotros.html"><span>Nosotros</span><svg class="mm-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></a>
      <a class="mm-link ${PAGE === 'cuenta' ? 'active' : ''}" href="cuenta.html"><span>Mi cuenta</span><svg class="mm-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></a>
    </div>
  </nav>`;

  const burger = $('#burger');
  if (burger) {
    burger.addEventListener('click', e => { e.stopPropagation(); $('#mobileMenu')?.classList.toggle('open'); });
  }
  document.addEventListener('click', e => { if (!e.target.closest('.nav')) $('#mobileMenu')?.classList.remove('open'); });

  // Menú móvil: "Categorías" colapsado por defecto, se despliega solo al tocarlo
  const mmCatToggle = $('#mmCatToggle'), mmCatPanel = $('#mmCatPanel');
  if (mmCatToggle && mmCatPanel) {
    mmCatToggle.addEventListener('click', e => {
      e.stopPropagation();
      const open = mmCatPanel.classList.toggle('hidden');
      mmCatToggle.setAttribute('aria-expanded', String(!open));
      mmCatToggle.classList.toggle('open', !open);
    });
  }

  const catBtn = $('#navCatBtn'), catMega = $('#catMega');
  if (catBtn && catMega) {
    catBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = catMega.classList.toggle('hidden');
      catBtn.setAttribute('aria-expanded', String(!open));
    });
    catMega.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', () => { catMega.classList.add('hidden'); catBtn.setAttribute('aria-expanded', 'false'); });
    if (PAGE === 'index') {
      $$('.cat-mega-item', catMega).forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        const cat = new URL(a.href).searchParams.get('cat');
        CAT = defaultFilters(); if (cat) CAT.cats = [cat];
        catMega.classList.add('hidden'); catBtn.setAttribute('aria-expanded', 'false');
        renderSidebar(); renderCatalog();
        $('#catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }));
    }
  }
  $('#loginBtn')?.addEventListener('click', () => authModal('login'));
  const ub = $('#userBtn'), um = $('#userMenu');
  if (ub) ub.addEventListener('click', e => { e.stopPropagation(); um.classList.toggle('hidden'); });
  document.addEventListener('click', () => um?.classList.add('hidden'));
  um?.addEventListener('click', e => e.stopPropagation());
  $('#logoutBtn')?.addEventListener('click', () => {
    State.session = null; toast('Sesión cerrada'); renderNav();
    if (PAGE === 'cuenta') location.href = 'catalogo.html';
  });
  bindGlobalSearch();
}

function bindGlobalSearch() {
  const input = $('#gsearch'), box = $('#gsuggest');
  if (!input) return;
  const params = new URLSearchParams(location.search);
  if (params.get('q')) input.value = params.get('q');
  let sel = -1, list = [];
  const close = () => { box.innerHTML = ''; sel = -1; };
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 3) { close(); return; }
    list = PRODUCTS.filter(p => (p.name + ' ' + p.brand + ' ' + catName(p.category) + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q)).slice(0, 7);
    if (!list.length) { box.innerHTML = `<div class="suggest"><div class="suggest-empty">Sin coincidencias para "${esc(q)}"</div></div>`; return; }
    box.innerHTML = `<div class="suggest">${list.map((p, i) => `
      <button class="suggest-item ${i === sel ? 'sel' : ''}" data-id="${p.id}">
        <span style="width:16px;height:16px;color:var(--muted)">${ICONS[p.icon] || ICONS.box}</span>
        <span>${esc(p.name)}</span>
        <span class="s-price mono">${money(p.price)}</span>
      </button>`).join('')}
      <button class="suggest-item suggest-all" data-all="1">Ver los resultados</button>
    </div>`;
    $$('.suggest-item', box).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.all) { go(input.value.trim()); return; }
      openProduct(b.dataset.id); close();
    }));
  };
  const go = q => {
    if (PAGE === 'index') { setQuery(q); close(); }
    else location.href = 'catalogo.html?q=' + encodeURIComponent(q);
  };
  input.addEventListener('input', draw);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!list.length) return; e.preventDefault();
      sel = clamp(sel + (e.key === 'ArrowDown' ? 1 : -1), 0, list.length - 1); draw();
    } else if (e.key === 'Enter') { go(input.value.trim()); }
    else if (e.key === 'Escape') close();
  });
  document.addEventListener('click', e => { if (!e.target.closest('.nav-search')) close(); });
}

function renderFooter() {
  const host = $('#footer'); if (!host) return;
  host.innerHTML = `
  <footer class="footer">
    <div class="footer-inner">
      <div>
        <div class="row" style="gap:8px;margin-bottom:8px">
          <img class="logo-mark" src="img/logo-k-glow.png" alt="Kronox Forge">
          <b style="font-size:14px">KRONOX FORGE</b>
        </div>
        <p class="muted tiny" style="max-width:270px">Hardware verificado, cotizaciones transparentes y compatibilidad comprobada antes de comprar.</p>
      </div>
      <div>
        <h5>Navegación</h5>
        <ul>
          <li><a href="index.html">Inicio</a></li>
          <li><a href="catalogo.html">Catálogo</a></li>
          <li><a href="compatibilidad.html">Armador de PC</a></li>
          <li><a href="cotizador.html">Cotizador</a></li>
          <li><a href="recomendador.html">Recomendador</a></li>
          <li><a href="nosotros.html">Nosotros</a></li>
        </ul>
      </div>
      <div>
        <h5>Categorías</h5>
        <ul>
          <li><a href="catalogo.html?cat=laptops">Laptops</a></li>
          <li><a href="catalogo.html?cat=procesadores">Procesadores</a></li>
          <li><a href="catalogo.html?cat=graficas">Tarjetas gráficas</a></li>
          <li><a href="catalogo.html?cat=perifericos">Periféricos</a></li>
        </ul>
      </div>
      <div>
        <h5>Contacto</h5>
        <ul>
          <li>kronoxforgetechnology@gmail.com</li>
          <li>+503 7200 8919</li>
          <li>Lun–Vie 8:00–18:00 · Sáb 9:00–13:00</li>
          <li>San Salvador, El Salvador</li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${new Date().getFullYear()} Kronox Forge. Proyecto de demostración sin transacciones reales.</span>
      <span>Precios de referencia en USD · IVA 13% calculado en la cotización</span>
    </div>
  </footer>`;
}

/* ---- Modal de login / registro ---- */
function authModal(mode = 'login') {
  const m = openModal(`
    <div class="modal-head"><h3 id="authTitle">Iniciar sesión</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
    <div class="modal-body">
      <div class="tabs">
        <button class="tab ${mode === 'login' ? 'active' : ''}" data-tab="login">Iniciar sesión</button>
        <button class="tab ${mode === 'register' ? 'active' : ''}" data-tab="register">Crear cuenta</button>
      </div>
      <form id="authForm" novalidate>
        <label class="field reg-only hidden"><span>Nombre completo</span><input type="text" id="aName" placeholder="Juan Pérez"></label>
        <label class="field"><span>Correo electrónico</span><input type="email" id="aEmail" placeholder="tucorreo@ejemplo.com" autocomplete="email"></label>
        <label class="field"><span>Contraseña</span><input type="password" id="aPass" placeholder="Mínimo 6 caracteres" autocomplete="current-password"></label>
        <label class="field reg-only hidden"><span>Confirmar contraseña</span><input type="password" id="aPass2" placeholder="Repite la contraseña"></label>
        <div class="err-text" id="aErr"></div>
        <button class="btn btn-primary btn-block" type="submit" id="aSubmit">Entrar</button>
      </form>
      <div class="divider"></div>
      <p class="hint center">Cuenta de prueba: <b>admin@kronoxlabs.com</b> / <b>Admin1234</b></p>
    </div>`, { size: '' });

  let cur = mode;
  const paint = () => {
    $('#authTitle', m.el).textContent = cur === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
    $('#aSubmit', m.el).textContent = cur === 'login' ? 'Entrar' : 'Registrarme';
    $$('.reg-only', m.el).forEach(el => el.classList.toggle('hidden', cur === 'login'));
    $$('.tab', m.el).forEach(t => t.classList.toggle('active', t.dataset.tab === cur));
    $('#aErr', m.el).textContent = '';
  };
  $$('.tab', m.el).forEach(t => t.addEventListener('click', () => { cur = t.dataset.tab; paint(); }));
  paint();

  const fail = msg => { $('#aErr', m.el).textContent = msg; };
  const validEmail = v => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);

  $('#authForm', m.el).addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#aEmail', m.el).value.trim().toLowerCase();
    const pass = $('#aPass', m.el).value;
    $('#aEmail', m.el).classList.toggle('invalid', !validEmail(email));
    $('#aPass', m.el).classList.toggle('invalid', pass.length < 6);
    if (!validEmail(email)) return fail('Ingresa un correo electrónico válido.');
    if (pass.length < 6) return fail('La contraseña debe tener al menos 6 caracteres.');

    const users = State.users;
    if (cur === 'register') {
      const name = $('#aName', m.el).value.trim();
      const pass2 = $('#aPass2', m.el).value;
      if (name.length < 3) { $('#aName', m.el).classList.add('invalid'); return fail('Ingresa tu nombre completo.'); }
      $('#aName', m.el).classList.remove('invalid');
      if (pass !== pass2) { $('#aPass2', m.el).classList.add('invalid'); return fail('Las contraseñas no coinciden.'); }
      $('#aPass2', m.el).classList.remove('invalid');
      if (users.some(u => u.email === email)) return fail('Ya existe una cuenta con ese correo.');
      const nu = { email, password: pass, name, phone: '' };
      users.push(nu); State.saveUsers(users);
      State.session = { email, name };
      seedHistory(email);
      toast('Cuenta creada. Bienvenido, ' + name.split(' ')[0], 'ok');
    } else {
      const u = users.find(x => x.email === email && x.password === pass);
      if (!u) return fail('Correo o contraseña incorrectos.');
      State.session = { email: u.email, name: u.name };
      seedHistory(u.email);
      toast('Sesión iniciada como ' + (u.name || u.email), 'ok');
    }
    m.close(); renderNav();
    if (PAGE === 'cuenta') renderAccount();
    document.dispatchEvent(new CustomEvent('kf:auth'));
  });
}

/* ---- Favoritos y cotizador (acciones compartidas) ---- */
function isFav(id) { return State.favs.includes(id); }
function toggleFav(id) {
  const f = State.favs;
  const i = f.indexOf(id);
  if (i >= 0) { f.splice(i, 1); toast('Quitado de favoritos'); }
  else { f.push(id); toast('Guardado en favoritos', 'ok'); }
  State.favs = f;
  $$(`[data-fav="${id}"]`).forEach(b => b.classList.toggle('on', isFav(id)));
  if (PAGE === 'cuenta') renderAccount();
  if (PAGE === 'index') renderCatalog();
}
function addToQuote(id, qty = 1) {
  const q = State.quote;
  const it = q.items.find(i => i.id === id);
  if (it) it.qty += qty; else q.items.push({ id, qty });
  State.quote = q; renderNav();
  toast(`${byId(id)?.name || id} agregado al cotizador`, 'ok');
}

/* ---- Modal de detalle de producto ---- */
function openProduct(id) {
  const p = byId(id); if (!p) return;
  const specs = Object.entries(p.specs || {}).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('');
  const m = openModal(`
    <div class="modal-head">
      <h3>Detalle del producto</h3>
      <button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button>
    </div>
    <div class="modal-body">
      <div class="detail-hero">
        <div class="detail-media"><img class="detail-img" src="${catImg(p)}" alt="${esc(p.name)}"></div>
        <div class="brand tiny muted" style="text-transform:uppercase;letter-spacing:.06em">${esc(p.brand)} · ${esc(catName(p.category))}</div>
        <h2 class="detail-name">${esc(p.name)}</h2>
        <div class="detail-meta">
          <span class="price">${money(p.price)}</span>
          ${p.stock > 0
            ? `<span class="badge badge-ok"><span class="dot dot-ok"></span>${p.stock} en stock</span>`
            : `<span class="badge badge-err"><span class="dot dot-err"></span>Agotado</span>`}
          <button class="fav-btn ${isFav(p.id) ? 'on' : ''}" data-fav="${p.id}" title="Favorito">${ICONS.heart}</button>
        </div>
        ${(p.tags || []).length ? `<div class="pspecs detail-tags">${(p.tags || []).map(t => `<span class="pspec">${esc(t)}</span>`).join('')}</div>` : ''}
      </div>
      <h4 class="section-title">Especificaciones técnicas</h4>
      <table class="spec-table"><tbody>${specs}</tbody></table>
      <div class="compat-search hidden" id="dCompatSearch">
        <div class="cs-head">
          <b>Buscar compatibilidad con una computadora</b>
          <button class="x-btn" id="dcsClose" aria-label="Cerrar">${ICONS.x}</button>
        </div>
        <p class="tiny muted" style="margin:0 0 8px">Elige tu computadora de la lista o escribe para filtrarla. Te diremos si <b>${esc(p.name)}</b> es compatible.</p>
        <input type="search" id="dcsInput" class="cs-input" placeholder="Ej. Dell Inspiron 15 3520, Mechrevo Aurora 16 Pro…" autocomplete="off">
        <div id="dcsSuggest" class="cs-suggest"></div>
        <div id="dcsResult" class="cs-result"></div>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-sm" id="dAddVerifier">${ICONS.layers} Agregar al verificador de compatibilidad</button>
      <button class="btn btn-sm" id="dCompatSearchBtn">${ICONS.search} Buscar compatibilidad</button>
      <button class="btn btn-sm btn-primary" id="dQuote" ${p.stock <= 0 ? 'disabled' : ''}>${ICONS.cart} Agregar al cotizador</button>
    </div>`, { size: 'modal-lg' });

  $('[data-fav]', m.el).addEventListener('click', () => toggleFav(p.id));
  $('#dQuote', m.el).addEventListener('click', () => { addToQuote(p.id); m.close(); });
  $('#dAddVerifier', m.el).addEventListener('click', () => {
    const slot = SLOTS.find(s => s.category === p.category);
    if (slot) { BUILD = State.build || {}; BUILD[slot.key] = p.id; State.build = BUILD; toast('Agregado al constructor del verificador', 'ok'); }
    m.close();
    location.href = 'compatibilidad.html';
  });
  initModalCompatSearch(m, p);
}

/* ---- Buscador de compatibilidad dentro del modal de producto ---- */
function initModalCompatSearch(m, p) {
  const panel = $('#dCompatSearch', m.el);
  const btn = $('#dCompatSearchBtn', m.el);
  const input = $('#dcsInput', m.el);
  const sug = $('#dcsSuggest', m.el);
  const res = $('#dcsResult', m.el);
  if (!panel || !btn) return;
  btn.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) { draw(); input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  });
  $('#dcsClose', m.el)?.addEventListener('click', () => panel.classList.add('hidden'));
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const all = LAPTOP_LIST();
    const list = (q ? all.filter(l => (l.name + ' ' + l.brand + ' ' + l.cpu + ' ' + l.gpu).toLowerCase().includes(q)) : all).slice(0, 40);
    sug.innerHTML = list.length
      ? list.map(l => `<button class="suggest-item" data-lid="${l.id}"><span style="width:16px;height:16px;color:var(--muted);flex:none">${ICONS.laptop}</span><span>${esc(l.name)}</span><span class="s-price tiny muted">${esc(l.ram)}</span></button>`).join('')
      : `<div class="suggest-empty">No encontramos ese equipo.</div>`;
    $$('[data-lid]', sug).forEach(b => b.addEventListener('click', () => { input.value = laptopById(b.dataset.lid).name; draw(); showCompatResult(b.dataset.lid); }));
  };
  function showCompatResult(lid) {
    const l = laptopById(lid); if (!l) return;
    const r = productLaptopCompat(p, l);
    res.innerHTML = `
      <div class="compat-flag ${r.ok ? 'ok' : 'bad'}" style="margin:10px 0 8px">
        <span class="dot ${r.ok ? 'dot-ok' : 'dot-err'}"></span>
        <span>${r.ok ? 'Compatible con' : 'No compatible con'} ${esc(l.name)}</span>
      </div>
      <p class="tiny muted" style="margin:0 0 8px">${esc(r.note)}</p>
      ${r.rec ? `<div class="cs-rec"><div class="tiny muted" style="margin-bottom:6px">Recomendación del mismo tipo</div><button class="cs-rec-item" data-openrec2="${r.rec.id}">${thumbHTML(r.rec, 'cs-rec-img')}<span class="cs-rec-tx"><b>${esc(r.rec.name)}</b><span class="price price-sm mono">${money(r.rec.price)}</span></span></button></div>` : ''}`;
    $('[data-openrec2]', res)?.addEventListener('click', () => { m.close(); openProduct(r.rec.id); });
  }
  input.addEventListener('input', draw);
}

/* Compatibilidad de un producto (componente/periférico) con una laptop */
function productLaptopCompat(p, l) {
  const info = laptopUpgradeInfo(l);
  switch (p.category) {
    case 'memorias':
      return info.ram.ok
        ? { ok: true, note: `${l.name} admite ampliar o cambiar la RAM. Verifica el tipo y la capacidad máxima antes de comprar.` }
        : { ok: false, note: `La RAM de ${l.name} está soldada a la placa, por lo que no se puede ampliar con módulos.`, rec: recommendFor('memorias', p) };
    case 'almacenamiento':
      return info.storage.ok
        ? { ok: true, note: `${l.name} permite agregar o cambiar el almacenamiento. Revisa el formato (M.2 NVMe / 2.5\" SATA) de tu ranura.` }
        : { ok: false, note: `El almacenamiento de ${l.name} no es ampliable por el usuario.`, rec: recommendFor('almacenamiento', p) };
    case 'graficas':
      return { ok: false, note: `La tarjeta gráfica de una laptop como ${l.name} está integrada y no se puede reemplazar internamente.`, rec: null };
    case 'procesadores': case 'placas': case 'fuentes': case 'gabinetes':
      return { ok: false, note: `${catName(p.category)} es un componente de PC de escritorio; no es instalable en la laptop ${l.name}.`, rec: null };
    case 'monitores': case 'perifericos': case 'accesorios':
      return { ok: true, note: `${catName(p.category)} se conecta de forma externa (USB/HDMI/Bluetooth) y funciona con ${l.name}.` };
    case 'software':
      return { ok: true, note: `Compatible: el sistema operativo puede instalarse en ${l.name} si cumple los requisitos.` };
    case 'laptops':
      return { ok: false, note: `${p.name} ya es un equipo completo; selecciona un componente o periférico para verificar su compatibilidad.`, rec: null };
    default:
      return { ok: true, note: `Compatible de forma general con ${l.name}.` };
  }
}
function recommendFor(cat, exclude) {
  return PRODUCTS.filter(x => x.category === cat && x.id !== (exclude && exclude.id) && x.stock > 0).sort((a, b) => a.price - b.price)[0] || null;
}

/* ---- Tarjeta de producto reutilizable ---- */
function productCard(p) {
  return `
  <article class="pcard" data-open="${p.id}">
    <div class="pthumb">
      <img src="${catImg(p)}" alt="${esc(p.name)}" loading="lazy">
      <span class="pthumb-tag">${esc(catName(p.category))}</span>
      ${p.stock <= 0 ? '<span class="pthumb-tag err" style="left:auto;right:7px">Agotado</span>' : ''}
    </div>
    <div>
      <div class="brand">${esc(p.brand)}</div>
      <h3>${esc(p.name)}</h3>
    </div>
    <div class="pspecs">${(p.tags || []).slice(0, 3).map(t => `<span class="pspec">${esc(t)}</span>`).join('')}</div>
    <div class="pcard-foot">
      <div>
        <div class="price mono">${money(p.price)}</div>
        <div class="stock-line">${p.stock > 0 ? p.stock + ' disponibles' : 'Agotado'}</div>
      </div>
      <span class="spacer"></span>
      <button class="fav-btn ${isFav(p.id) ? 'on' : ''}" data-fav="${p.id}" title="Favorito">${ICONS.heart}</button>
      <button class="icon-btn" data-add="${p.id}" title="Agregar al cotizador" style="width:28px;height:28px">${ICONS.plus}</button>
    </div>
  </article>`;
}
function bindCardEvents(root = document) {
  $$('[data-open]', root).forEach(c => c.addEventListener('click', e => {
    if (e.target.closest('[data-fav],[data-add]')) return;
    openProduct(c.dataset.open);
  }));
  $$('[data-fav]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); toggleFav(b.dataset.fav); }));
  $$('[data-add]', root).forEach(b => b.addEventListener('click', e => { e.stopPropagation(); addToQuote(b.dataset.add); }));
}

/* ------------------------------------------------------------
   7. Motor de compatibilidad (compartido)
   ------------------------------------------------------------ */
const SLOTS = [
  { key:'cpu',     label:'Procesador',        category:'procesadores',   icon:'cpu',    required:true  },
  { key:'mb',      label:'Placa madre',       category:'placas',         icon:'board',  required:true  },
  { key:'ram',     label:'Memoria RAM',       category:'memorias',       icon:'ram',    required:true  },
  { key:'storage', label:'Almacenamiento',    category:'almacenamiento', icon:'ssd',    required:true  },
  { key:'gpu',     label:'Tarjeta gráfica',   category:'graficas',       icon:'gpu',    required:false },
  { key:'psu',     label:'Fuente de poder',   category:'fuentes',        icon:'psu',    required:true  },
  { key:'case',    label:'Gabinete',          category:'gabinetes',      icon:'case',   required:true  },
  { key:'os',      label:'Sistema operativo', category:'software',       icon:'os',     required:false }
];

const boardGen4 = mb => /PCIe (4|5)\.0/.test(((mb?.specs || {}).Almacenamiento || '') + ((mb?.specs || {}).PCIe || ''));
const driveGen4 = s => /PCIe 4\.0/.test(s?.iface || '');
const hasIGPU = cpu => !/No incluye/i.test((cpu?.specs || {}).Gráficos || '');

/* Devuelve la lista de comprobaciones con estado: ok | err | warn | info */
function runChecks(build) {
  const g = k => build[k] ? byId(build[k]) : null;
  const cpu = g('cpu'), mb = g('mb'), ram = g('ram'), sto = g('storage'),
        gpu = g('gpu'), psu = g('psu'), box = g('case');
  const out = [];
  const add = (status, title, desc) => out.push({ status, title, desc });

  const missing = SLOTS.filter(s => s.required && !build[s.key]).map(s => s.label);
  if (missing.length) add('info', 'Configuración incompleta', 'Falta seleccionar: ' + missing.join(', ') + '. Las reglas dependientes quedan pendientes.');

  if (cpu && mb) {
    if (cpu.socket === mb.socket) {
      add('ok', 'Socket de CPU y placa madre', `${cpu.socket} en ${cpu.name} coincide con el zócalo ${mb.socket} de ${mb.name}. Montaje físico y eléctrico correcto.`);
    } else {
      add('err', 'Socket incompatible', `${cpu.name} usa socket ${cpu.socket}, pero ${mb.name} es ${mb.socket}. El procesador no asienta en la placa; elige una placa ${cpu.socket} o un CPU ${mb.socket}.`);
    }
  }
  if (cpu && mb && cpu.socket === mb.socket) {
    const gen = mb.chipset || '';
    const highEnd = cpu.tdp >= 105;
    if (highEnd && /^H6|^B660|^B760|^A5|^A6/.test(gen)) {
      add('warn', 'VRM justo para este procesador', `${cpu.name} tiene un TDP base de ${cpu.tdp} W (picos mayores en turbo). ${mb.name} (${gen}) lo soporta, pero bajo carga sostenida el VRM puede limitar el boost. Recomendable un chipset Z690/Z790 o X670.`);
    } else if (gen) {
      add('ok', 'Chipset y entrega de potencia', `El chipset ${gen} de ${mb.name} cubre sin problemas el consumo de ${cpu.name} (${cpu.tdp} W TDP base).`);
    }
    if (!mb.ramTypes.includes('DDR4') && cpu.ramTypes.includes('DDR4') && mb.ramTypes.includes('DDR5')) {
      add('info', 'Plataforma DDR5', `${mb.name} trabaja exclusivamente con DDR5; ${cpu.name} admite DDR4 y DDR5, así que deberás usar módulos DDR5.`);
    }
  }
  if (ram && mb) {
    if (mb.ramTypes.includes(ram.ramType)) {
      add('ok', 'Tipo de memoria compatible', `${ram.name} es ${ram.ramType} y ${mb.name} dispone de ranuras ${mb.ramTypes.join(' / ')}. Frecuencia ${ram.ramSpeed} MHz dentro del rango soportado.`);
    } else {
      add('err', 'Memoria incompatible con la placa', `${ram.name} es ${ram.ramType}, pero ${mb.name} solo acepta ${mb.ramTypes.join(' / ')}. DDR4 y DDR5 tienen muescas y voltajes distintos: no entran físicamente.`);
    }
  }
  if (ram && cpu && mb && mb.ramTypes.includes(ram.ramType) && cpu.ramTypes && !cpu.ramTypes.includes(ram.ramType)) {
    add('warn', 'Controlador de memoria del CPU', `${cpu.name} declara soporte nativo para ${cpu.ramTypes.join(' / ')}. ${ram.ramType} funcionaría fuera de especificación y puede requerir ajustes manuales.`);
  }
  if (ram && ram.modules === 1 && ram.ramGB <= 8) {
    add('warn', 'Un solo módulo y poca capacidad', 'Un DIMM único desactiva el dual channel y recorta hasta un 15% el rendimiento en gráficos integrados. Considera un kit 2x8 GB o 2x16 GB.');
  }

  if (psu && (cpu || gpu)) {
    const load = (cpu?.tdp || 0) + (gpu?.tdp || 0);
    const need = Math.ceil(load * 1.2);
    if (need <= psu.watts) {
      add('ok', 'Potencia de la fuente', `Consumo estimado CPU+GPU: ${load} W. Con el margen de seguridad del 20% se requieren ${need} W y ${psu.name} entrega ${psu.watts} W (${psu.efficiency}).`);
    } else {
      add('err', 'Fuente insuficiente', `Consumo estimado CPU+GPU: ${load} W. Con el margen del 20% se requieren ${need} W, pero ${psu.name} solo entrega ${psu.watts} W. Sube a una fuente de ${Math.ceil(need / 50) * 50} W o más.`);
    }
    if (gpu && /12VHPWR|16 pines/.test(JSON.stringify(gpu.specs || {})) && !/12VHPWR/.test(JSON.stringify(psu.specs || {}))) {
      add('warn', 'Conector PCIe 5.0 (12VHPWR)', `${gpu.name} usa conector de 16 pines y ${psu.name} no lo incluye nativamente. Necesitarás el adaptador incluido con la tarjeta (2x o 3x 8 pines).`);
    }
  } else if (psu) {
    add('info', 'Potencia de la fuente', 'Selecciona procesador y/o tarjeta gráfica para calcular el consumo con el margen del 20%.');
  }

  if (box && mb) {
    if (box.formFactors && box.formFactors.includes(mb.formFactor)) {
      add('ok', 'Formato de la placa en el gabinete', `${mb.name} es ${mb.formFactor} y ${box.name} admite ${box.formFactors.join(' / ')}.`);
    } else {
      add('err', 'La placa no cabe en el gabinete', `${mb.name} es ${mb.formFactor}, pero ${box.name} solo admite ${box.formFactors.join(' / ')}.`);
    }
  }
  if (box && gpu && box.gpuMaxLen) {
    if (gpu.length <= box.gpuMaxLen) {
      add('ok', 'Espacio para la tarjeta gráfica', `${gpu.name} mide ${gpu.length} mm y ${box.name} admite hasta ${box.gpuMaxLen} mm. Quedan ${box.gpuMaxLen - gpu.length} mm libres para flujo de aire.`);
    } else {
      add('err', 'La GPU no entra en el gabinete', `${gpu.name} mide ${gpu.length} mm y ${box.name} solo admite ${box.gpuMaxLen} mm.`);
    }
  }
  if (sto && mb) {
    if (sto.iface === 'SATA III' && (sto.form || '').startsWith('3.5')) {
      add('info', 'Unidad SATA de 3.5"', `${sto.name} requiere una bahía de 3.5" y un cable SATA de datos (normalmente incluidos con la placa).`);
    } else if (driveGen4(sto) && !boardGen4(mb)) {
      add('warn', 'SSD PCIe 4.0 en placa PCIe 3.0', `${sto.name} es PCIe 4.0, pero ${mb.name} solo expone M.2 PCIe 3.0. Funcionará limitado a ~3500 MB/s; estás pagando velocidad que no podrás usar.`);
    } else if (sto.iface.startsWith('NVMe')) {
      add('ok', 'Interfaz de almacenamiento', `${sto.name} (${sto.iface}, ${sto.form}) es compatible con la ranura M.2 de ${mb.name}.`);
    }
  }
  if (cpu && !gpu && !hasIGPU(cpu)) {
    add('err', 'Sin salida de video', `${cpu.name} no incluye gráficos integrados y no hay tarjeta gráfica seleccionada. El equipo no dará imagen: agrega una GPU o cambia a un procesador con iGPU.`);
  }
  if (cpu && gpu && Math.abs((cpu.perf?.cpu || 50) - (gpu.perf?.gpu || 50)) > 40) {
    const weak = (cpu.perf?.cpu || 0) < (gpu.perf?.gpu || 0) ? cpu.name : gpu.name;
    add('warn', 'Posible cuello de botella', `La diferencia de rendimiento entre ${cpu.name} y ${gpu.name} es amplia. ${weak} limitará al otro componente en juegos y cargas mixtas.`);
  }
  if (ram && (cpu || gpu) && ram.ramGB < 16 && (gpu?.perf?.gpu || 0) >= 55) {
    add('warn', 'Memoria insuficiente para el perfil', `${ram.ramGB} GB se queda corto para un equipo con ${gpu?.name || 'esta GPU'}: se recomienda 16 GB mínimo y 32 GB para edición o AAA actuales.`);
  }
  if (build.os && build.os === 'os-ubuntu-2404' && gpu && gpu.brand === 'NVIDIA') {
    add('info', 'Controladores en Linux', 'Ubuntu 24.04 instala los drivers NVIDIA propietarios desde "Controladores adicionales"; verifica la compatibilidad con CUDA si usas la GPU para cómputo.');
  }
  return out;
}

function checkCounts(list) {
  return {
    err: list.filter(c => c.status === 'err').length,
    warn: list.filter(c => c.status === 'warn').length,
    ok: list.filter(c => c.status === 'ok').length,
    info: list.filter(c => c.status === 'info').length
  };
}
const STATUS_ICON = { ok: ICONS.check, err: ICONS.x, warn: ICONS.info, info: ICONS.info };
function checkHTML(c) {
  return `<div class="check-item ${c.status}">
    <span style="width:15px;height:15px;flex:none;margin-top:2px">${STATUS_ICON[c.status]}</span>
    <span class="ci-body"><span class="ci-title">${esc(c.title)}</span><span class="ci-desc">${esc(c.desc)}</span></span>
  </div>`;
}

/* Recomendaciones cruzadas a partir de UN componente */
function compatibleWith(p) {
  if (!p) return [];
  const g = [];
  const push = (title, items) => { if (items.length) g.push({ title, items: items.slice(0, 6) }); };
  const r = (prod, why) => ({ p: prod, why });

  if (p.category === 'procesadores') {
    push('Placas madre compatibles', byCat('placas').filter(m => m.socket === p.socket)
      .map(m => r(m, `Socket ${m.socket} idéntico al del ${p.name}; chipset ${m.chipset} soporta la serie del procesador y memorias ${m.ramTypes.join('/')}.`)));
    const types = p.ramTypes || [];
    push('Módulos de memoria compatibles', byCat('memorias').filter(x => types.includes(x.ramType))
      .map(x => r(x, `${x.ramType} figura entre los tipos que integra el controlador de memoria del ${p.name}; a ${x.ramSpeed} MHz trabaja dentro de especificación.`)));
    push('Fuentes de poder recomendadas', byCat('fuentes').filter(x => x.watts >= Math.ceil((p.tdp + 170) * 1.2 / 50) * 50)
      .map(x => r(x, `${x.watts} W cubren el TDP de ${p.tdp} W más una GPU de gama media con el margen de seguridad del 20%.`)));
    push('Tarjetas gráficas sin cuello de botella', byCat('graficas').filter(x => Math.abs((x.perf?.gpu || 0) - (p.perf?.cpu || 0)) <= 40)
      .map(x => r(x, `Índice de rendimiento equilibrado (${x.perf.gpu} de GPU frente a ${p.perf.cpu} de CPU): ninguna de las dos piezas frena a la otra.`)));
    push('Disipadores con soporte para ' + p.socket, byCat('accesorios').filter(x => (x.sockets || []).includes(p.socket))
      .map(x => r(x, `Kit de montaje incluido para ${p.socket}; altura de ${x.height} mm y capacidad de disipación acorde a ${p.tdp} W de TDP base.`)));
  }

  if (p.category === 'placas') {
    push('Procesadores compatibles', byCat('procesadores').filter(c => c.socket === p.socket)
      .map(c => r(c, `Ambos usan socket ${p.socket}; el chipset ${p.chipset} lo reconoce sin necesidad de actualización de BIOS en la mayoría de revisiones.`)));
    push('Memorias compatibles', byCat('memorias').filter(x => p.ramTypes.includes(x.ramType))
      .map(x => r(x, `Ranuras ${p.ramTypes.join('/')} en ${p.name}; este módulo ${x.ramType}-${x.ramSpeed} encaja y su velocidad está dentro del rango validado.`)));
    push('Gabinetes con el formato adecuado', byCat('gabinetes').filter(x => (x.formFactors || []).includes(p.formFactor))
      .map(x => r(x, `Soporta placas ${p.formFactor} (el formato de ${p.name}) con puntos de anclaje y espacio trasero para el cableado.`)));
    const nvme = boardGen4(p);
    push('Almacenamiento recomendado', byCat('almacenamiento').filter(x => x.iface.startsWith('NVMe') && (!driveGen4(x) || nvme))
      .map(x => r(x, nvme ? `Ranura M.2 PCIe 4.0 en ${p.name}: ${x.name} funcionará a su velocidad nominal (${x.specs['Lectura seq.'] || '—'}).` : `Ranura M.2 PCIe 3.0 en ${p.name}; ${x.name} es PCIe 3.0 y aprovecha todo el ancho de banda disponible.`)));
    push('Fuentes de poder', byCat('fuentes').filter(x => x.watts >= 550)
      .map(x => r(x, `${x.watts} W y conector EPS de 4+4 pines para el VRM de ${p.name}; certificación ${x.efficiency}.`)));
  }

  if (p.category === 'memorias') {
    push('Placas madre con ranuras ' + p.ramType, byCat('placas').filter(m => m.ramTypes.includes(p.ramType))
      .map(m => r(m, `Ranuras ${p.ramType} (${m.ramTypes.join('/')}); la muesca y el voltaje de ${p.name} coinciden con el estándar del zócalo DIMM.`)));
    const sockets = Array.from(new Set(byCat('placas').filter(m => m.ramTypes.includes(p.ramType)).map(m => m.socket)));
    push('Procesadores que admiten ' + p.ramType, byCat('procesadores').filter(c => (c.ramTypes || []).includes(p.ramType) && sockets.includes(c.socket))
      .map(c => r(c, `El controlador de memoria del ${c.name} declara soporte para ${p.ramType}; con placas ${sockets.join(' o ')} funciona a ${p.ramSpeed} MHz.`)));
    push('Módulos combinables', byCat('memorias').filter(x => x.id !== p.id && x.ramType === p.ramType && Math.abs(x.ramSpeed - p.ramSpeed) <= 400)
      .map(x => r(x, `Mismo tipo ${x.ramType} y frecuencia cercana (${x.ramSpeed} vs ${p.ramSpeed} MHz). Al mezclar, el sistema bajará a la menor; lo ideal es un kit emparejado.`)));
    push('Fuentes de poder', byCat('fuentes').filter(x => x.watts >= 500).slice(0, 3)
      .map(x => r(x, `Cualquier fuente ATX estándar alimenta la memoria desde el rail de 3.3/5 V; ${x.watts} W dejan margen para CPU y GPU.`)));
  }

  if (p.category === 'almacenamiento') {
    if (p.iface.startsWith('NVMe')) {
      const need4 = driveGen4(p);
      push('Placas con ranura M.2 adecuada', byCat('placas').filter(m => !need4 || boardGen4(m))
        .map(m => r(m, need4 ? `M.2 PCIe 4.0 confirmado en ${m.name}: ${p.name} alcanzará sus ${p.specs['Lectura seq.'] || ''} nominales.` : `Ranura M.2 disponible en ${m.name}; ${p.name} (${p.iface}) trabaja a velocidad completa.`)));
    } else {
      push('Placas con puertos SATA', byCat('placas')
        .map(m => r(m, `${(m.specs.Almacenamiento || '').match(/\dx SATA/) ? (m.specs.Almacenamiento.match(/\dx SATA/)[0]) : 'Puertos SATA'} disponibles para conectar ${p.name} con cable de datos SATA III.`)));
      push('Gabinetes con bahía compatible', byCat('gabinetes').filter(x => (p.form || '').startsWith('3.5') ? /3\.5/.test(JSON.stringify(x.specs)) : true)
        .map(x => r(x, `${x.name} incluye bahías de ${(x.specs.Bahías || '—')}, suficientes para montar ${p.name} (${p.form}).`)));
    }
    push('Sistemas operativos recomendados', byCat('software')
      .map(o => r(o, o.price === 0 ? `${o.name} detecta y monta la unidad NVMe/SATA sin controladores adicionales (kernel 6.8).` : `${o.name} incluye el controlador estándar de almacenamiento; recuerda inicializar la unidad en UEFI con GPT.`)));
  }

  if (p.category === 'graficas') {
    const need = Math.ceil(((p.tdp || 0) + 95) * 1.2);
    push('Fuentes de poder suficientes', byCat('fuentes').filter(x => x.watts >= need)
      .map(x => r(x, `TDP de ${p.tdp} W + CPU de ~95 W = ${need} W con margen del 20%. ${x.name} entrega ${x.watts} W (${x.efficiency}).`)));
    push('Gabinetes donde cabe', byCat('gabinetes').filter(x => (x.gpuMaxLen || 0) >= (p.length || 0))
      .map(x => r(x, `Longitud de ${p.length} mm frente a ${x.gpuMaxLen} mm máximos de ${x.name}: sobran ${x.gpuMaxLen - p.length} mm para flujo de aire.`)));
    push('Procesadores equilibrados', byCat('procesadores').filter(c => Math.abs((c.perf?.cpu || 0) - (p.perf?.gpu || 0)) <= 32)
      .map(c => r(c, `Índice ${c.perf.cpu} de CPU frente a ${p.perf.gpu} de GPU: pareja equilibrada para ${c.perf.cpu > p.perf.gpu ? 'no limitar' : 'aprovechar'} la tarjeta en juegos y render.`)));
    push('Monitores acordes a la GPU', byCat('monitores')
      .map(m => r(m, `${m.specs.Resolución} a ${m.specs.Refresco}: ${(p.perf?.gpu || 0) >= 70 ? 'esta GPU sostiene esa resolución y refresco' : 'esta GPU lo cubre en 1080p; en resoluciones mayores bajará la tasa de cuadros'}.`)));
    push('Placas con PCIe x16', byCat('placas').slice(0, 4)
      .map(m => r(m, `Ranura PCIe x16 de tamaño completo (${(m.specs.PCIe || '').split(',')[0] || 'disponible'}); la tarjeta PCIe 4.0 también funciona hacia atrás en PCIe 3.0.`)));
  }

  if (p.category === 'fuentes') {
    push('Tarjetas gráficas que puede alimentar', byCat('graficas').filter(x => ((x.tdp || 0) + 95) * 1.2 <= p.watts)
      .map(x => r(x, `TDP ${x.tdp} W + CPU estimada 95 W = ${Math.ceil((x.tdp + 95) * 1.2)} W con margen; ${p.name} (${p.watts} W) lo cubre.`)));
    push('Procesadores soportados', byCat('procesadores').filter(c => (c.tdp + 200) * 1.2 <= p.watts)
      .map(c => r(c, `TDP base ${c.tdp} W (picos superiores en turbo) + GPU de gama media; entra en los ${p.watts} W de ${p.name}.`)));
    push('Gabinetes ATX compatibles', byCat('gabinetes')
      .map(x => r(x, `Formato ATX estándar aceptado en ${x.name}; verifica la longitud del chasis si la fuente supera los 160 mm.`)));
  }

  if (p.category === 'gabinetes') {
    push('Placas que admite', byCat('placas').filter(m => (p.formFactors || []).includes(m.formFactor))
      .map(m => r(m, `${m.name} es ${m.formFactor} y ${p.name} admite ${p.formFactors.join(' / ')}.`)));
    push('Tarjetas gráficas que caben', byCat('graficas').filter(x => (x.length || 0) <= (p.gpuMaxLen || 0))
      .map(x => r(x, `${x.length} mm de largo frente a ${p.gpuMaxLen} mm máximos de ${p.name}.`)));
    push('Fuentes de poder', byCat('fuentes')
      .map(f => r(f, `Formato ATX admitido en ${p.name}; ${f.watts} W con certificación ${f.efficiency}.`)));
  }

  if (p.category === 'laptops') {
    push('Monitores externos recomendados', byCat('monitores')
      .map(m => r(m, `Salida ${(p.specs.Puertos || '').includes('HDMI') ? 'HDMI' : 'USB-C/DisplayPort'} del portátil compatible con ${m.specs.Conexiones || 'las entradas del monitor'} (${m.specs.Resolución}).`)));
    push('Docking y expansión', byCat('accesorios').filter(x => x.id === 'acc-dell-dock' || x.id === 'acc-apc-ups' || x.id === 'acc-logi-c920')
      .map(x => r(x, `Conexión por USB-C/USB-A disponible en ${p.name}; ${x.specs.Tipo || x.specs.Conexión || 'compatible'} con Windows y macOS.`)));
    push('Periféricos sugeridos', byCat('perifericos')
      .map(x => r(x, `${x.specs.Conexión || 'Conexión USB'}; multidispositivo, útil para alternar entre el portátil y otro equipo.`)));
  }

  if (p.category === 'monitores') {
    push('Tarjetas gráficas para aprovecharlo', byCat('graficas').filter(x => /4K|UHD/.test(p.specs.Resolución || '') ? (x.perf?.gpu || 0) >= 70 : true)
      .map(x => r(x, `${x.specs.Salidas || 'DisplayPort y HDMI'} cubren ${p.specs.Resolución} a ${p.specs.Refresco}; índice de GPU ${x.perf?.gpu || '—'}.`)));
    push('Laptops con salida de video compatible', byCat('laptops').filter(x => (p.perf?.gpu || (x.perf?.gpu || 0)) >= 0)
      .map(x => r(x, `${x.specs.Puertos || ''} incluye salida para ${p.specs.Conexiones || 'HDMI/DisplayPort'}.`)));
  }

  if (p.category === 'software') {
    push('Equipos con requisitos cumplidos', PRODUCTS.filter(x => x.category === 'laptops' || x.category === 'procesadores').slice(0, 6)
      .map(x => r(x, `${x.name} supera los requisitos mínimos (${x.specs.Procesador || x.specs.Pantalla || ''}).`)));
    push('Almacenamiento sugerido', byCat('almacenamiento').filter(x => x.capGB >= 480).slice(0, 4)
      .map(x => r(x, `${x.capGB >= 1000 ? (x.capGB / 1000) + ' TB' : x.capGB + ' GB'} dejan espacio suficiente para el sistema, actualizaciones y aplicaciones.`)));
  }

  if (p.category === 'perifericos' || p.category === 'accesorios') {
    push('Laptops compatibles', byCat('laptops').slice(0, 4)
      .map(x => r(x, `Puertos disponibles en ${x.name}: ${x.specs.Puertos || 'USB-A / USB-C'}; conexión del accesorio directa o con adaptador incluido.`)));
    push('Equipos de escritorio sugeridos', DESKTOP_KITS.slice(0, 3).map(k => ({ p: k, why: `Equipo armado con ${k.parts.length} componentes y puertos frontales USB-C/USB-A para este accesorio.` })));
  }

  return g;
}

/* ------------------------------------------------------------
   8. Página: catalogo.html — catálogo
   ------------------------------------------------------------ */
const PRICE_BOUNDS = {
  min: 0,
  max: Math.ceil(Math.max(...PRODUCTS.map(p => p.price)) / 100) * 100
};
let CAT = null;

function defaultFilters() {
  return {
    q: '', cats: [], brands: [], min: PRICE_BOUNDS.min, max: PRICE_BOUNDS.max,
    stockOnly: false, sort: 'relevancia'
  };
}

function renderSidebar() {
  const host = $('#sidebar'); if (!host) return;
  const counts = id => PRODUCTS.filter(p => p.category === id).length;
  host.innerHTML = `
    <div class="side-group">
      <h4>Precio</h4>
      <div class="range-wrap">
        <div class="range-track"></div><div class="range-fill" id="rFill"></div>
        <input type="range" id="rMin" min="${PRICE_BOUNDS.min}" max="${PRICE_BOUNDS.max}" step="10" value="${CAT.min}" aria-label="Precio mínimo">
        <input type="range" id="rMax" min="${PRICE_BOUNDS.min}" max="${PRICE_BOUNDS.max}" step="10" value="${CAT.max}" aria-label="Precio máximo">
      </div>
      <div class="range-vals"><span id="rMinL" class="mono">${money(CAT.min)}</span><span id="rMaxL" class="mono">${money(CAT.max)}</span></div>
    </div>
    <div class="side-group">
      <h4>Marca</h4>
      <div id="brandList">${BRANDS.map(b => `
        <label class="check"><input type="checkbox" data-brand="${esc(b)}" ${CAT.brands.includes(b) ? 'checked' : ''}> ${esc(b)}
        <span class="count">${PRODUCTS.filter(p => p.brand === b).length}</span></label>`).join('')}</div>
    </div>
    <div class="side-group">
      <h4>Disponibilidad</h4>
      <label class="check"><input type="checkbox" id="stockOnly" ${CAT.stockOnly ? 'checked' : ''}> Solo con stock
      <span class="count">${PRODUCTS.filter(p => p.stock > 0).length}</span></label>
    </div>
    <button class="btn btn-sm btn-block" id="clearFilters">Limpiar filtros</button>`;

  $$('#catList .side-link').forEach(b => b.addEventListener('click', () => {
    const c = b.dataset.cat;
    CAT.cats = !c ? [] : (CAT.cats.includes(c) ? CAT.cats.filter(x => x !== c) : [c]);
    CAT.page = 1; renderSidebar(); renderCatalog();
  }));
  const rmin = $('#rMin'), rmax = $('#rMax');
  const syncRange = () => {
    let a = +rmin.value, b = +rmax.value;
    if (a > b - 10) { if (document.activeElement === rmin) a = Math.max(PRICE_BOUNDS.min, b - 10); else b = Math.min(PRICE_BOUNDS.max, a + 10); rmin.value = a; rmax.value = b; }
    CAT.min = a; CAT.max = b;
    $('#rMinL').textContent = money(a); $('#rMaxL').textContent = money(b);
    const span = PRICE_BOUNDS.max - PRICE_BOUNDS.min;
    $('#rFill').style.left = ((a - PRICE_BOUNDS.min) / span * 100) + '%';
    $('#rFill').style.width = ((b - a) / span * 100) + '%';
    renderCatalog();
  };
  rmin.addEventListener('input', syncRange); rmax.addEventListener('input', syncRange); syncRange();
  $$('[data-brand]').forEach(c => c.addEventListener('change', () => {
    const b = c.dataset.brand;
    CAT.brands = c.checked ? [...CAT.brands, b] : CAT.brands.filter(x => x !== b);
    renderCatalog();
  }));
  $('#stockOnly').addEventListener('change', e => { CAT.stockOnly = e.target.checked; renderCatalog(); });
  $('#clearFilters').addEventListener('click', () => {
    CAT = defaultFilters(); CAT.q = $('#catalogSearch')?.value || '';
    renderSidebar(); renderCatalog();
  });
}

function filteredProducts() {
  const q = CAT.q.trim().toLowerCase();
  let list = PRODUCTS.filter(p => {
    if (q && !(p.name + ' ' + p.brand + ' ' + catName(p.category) + ' ' + (p.tags || []).join(' ') + ' ' + JSON.stringify(p.specs)).toLowerCase().includes(q)) return false;
    if (CAT.cats.length && !CAT.cats.includes(p.category)) return false;
    if (CAT.brands.length && !CAT.brands.includes(p.brand)) return false;
    if (p.price < CAT.min || p.price > CAT.max) return false;
    if (CAT.stockOnly && p.stock <= 0) return false;
    return true;
  });
  const s = CAT.sort;
  if (s === 'precio-asc') list.sort((a, b) => a.price - b.price);
  else if (s === 'precio-desc') list.sort((a, b) => b.price - a.price);
  else if (s === 'nombre') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (s === 'stock') list.sort((a, b) => b.stock - a.stock);
  return list;
}

function renderCatalog() {
  const grid = $('#catalogGrid'), cnt = $('#resultCount');
  if (!grid) return;
  const list = filteredProducts();
  if (cnt) cnt.textContent = `${list.length} ${list.length === 1 ? 'producto' : 'productos'}`;
  const chips = [
    ...CAT.cats.map(c => `<span class="badge badge-accent">${esc(catName(c))}<button class="x-btn" data-rmcat="${c}" style="width:14px;height:14px;margin-left:2px">${ICONS.x}</button></span>`),
    ...CAT.brands.map(b => `<span class="badge">${esc(b)}<button class="x-btn" data-rmbrand="${esc(b)}" style="width:14px;height:14px;margin-left:2px">${ICONS.x}</button></span>`)
  ].join('');
  const chipHost = $('#activeChips');
  if (chipHost) { chipHost.innerHTML = chips; chipHost.classList.toggle('hidden', !chips); }
  $$('[data-rmcat]').forEach(b => b.addEventListener('click', () => { CAT.cats = CAT.cats.filter(x => x !== b.dataset.rmcat); renderSidebar(); renderCatalog(); }));
  $$('[data-rmbrand]').forEach(b => b.addEventListener('click', () => { CAT.brands = CAT.brands.filter(x => x !== b.dataset.rmbrand); renderSidebar(); renderCatalog(); }));

  if (!list.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Sin resultados</h3><p class="tiny">Ajusta los filtros o prueba con otro término de búsqueda.</p></div>`;
    return;
  }
  grid.innerHTML = list.map(productCard).join('');
  bindCardEvents(grid);
}

function setQuery(q) {
  CAT.q = q || '';
  const el = $('#catalogSearch'); if (el) el.value = CAT.q;
  renderCatalog();
  $('#catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initIndex() {
  CAT = defaultFilters();
  const params = new URLSearchParams(location.search);
  if (params.get('cat')) CAT.cats = [params.get('cat')];
  if (params.get('q')) CAT.q = params.get('q');
  if (params.get('id')) setTimeout(() => openProduct(params.get('id')), 220);

  renderSidebar();
  const cs = $('#catalogSearch');
  if (cs) {
    cs.value = CAT.q;
    let t; cs.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => setQuery(cs.value), 130); });
  }
  $('#sortSel')?.addEventListener('change', e => { CAT.sort = e.target.value; renderCatalog(); });
  $('#filtersToggle')?.addEventListener('click', () => $('#sidebar')?.classList.toggle('mobile-open'));
  renderCatalog();

  /* Landing: accesos rápidos */
  $('#tiles')?.addEventListener('click', e => {
    const a = e.target.closest('[data-goto]'); if (!a) return;
    const v = a.dataset.goto;
    if (v === 'all') { CAT = defaultFilters(); renderSidebar(); renderCatalog(); return; }
    CAT = defaultFilters(); CAT.cats = [v]; renderSidebar(); renderCatalog();
  });
  $('#heroSearch')?.addEventListener('input', e => setQuery(e.target.value));
}

/* ------------------------------------------------------------
   9. Página: compatibilidad.html
   ------------------------------------------------------------ */
let BUILD = {};

const slotMeta = (key, p) => {
  if (!p) return '';
  switch (key) {
    case 'cpu': return `${p.socket} · ${p.specs.Núcleos || ''} núcleos · ${p.tdp} W TDP`;
    case 'mb': return `${p.socket} · ${p.chipset} · ${p.ramTypes.join('/')} · ${p.formFactor}`;
    case 'ram': return `${p.ramType}-${p.ramSpeed} · ${p.ramGB} GB · ${p.modules} módulo(s)`;
    case 'storage': return `${p.iface} · ${(p.capGB >= 1000 ? (p.capGB / 1000) + ' TB' : p.capGB + ' GB')}`;
    case 'gpu': return `${p.vram} GB VRAM · ${p.tdp} W · ${p.length} mm`;
    case 'psu': return `${p.watts} W · ${p.efficiency}`;
    case 'case': return `${(p.formFactors || []).join('/')} · GPU hasta ${p.gpuMaxLen} mm`;
    case 'os': return p.specs.Edición || p.specs.Licencia || '';
    default: return (p.tags || []).slice(0, 2).join(' · ');
  }
};

function renderSlots() {
  const host = $('#slots'); if (!host) return;
  host.innerHTML = SLOTS.map(s => {
    const p = BUILD[s.key] ? byId(BUILD[s.key]) : null;
    return `
    <div class="slot ${p ? 'filled' : ''}" data-slot="${s.key}">
      <span class="slot-icon">${ICONS[s.icon]}</span>
      <div class="slot-info">
        <div class="slot-label">${esc(s.label)}${s.required ? '' : ' <span class="muted">(opcional)</span>'}</div>
        ${p ? `<div class="slot-name">${esc(p.name)}</div><div class="slot-meta">${esc(slotMeta(s.key, p))}</div>`
            : `<div class="slot-name muted" style="font-weight:400">Sin seleccionar</div>`}
      </div>
      ${p ? `<span class="slot-price mono">${money(p.price)}</span>` : ''}
      <span class="slot-act">
        ${p ? `<button class="icon-btn" data-clear="${s.key}" title="Quitar" style="width:28px;height:28px">${ICONS.x}</button>` : ''}
        <button class="btn btn-sm" data-pick="${s.key}">${p ? 'Cambiar' : 'Seleccionar'}</button>
      </span>
    </div>`;
  }).join('');
  $$('[data-pick]', host).forEach(b => b.addEventListener('click', () => openPicker(b.dataset.pick)));
  $$('[data-clear]', host).forEach(b => b.addEventListener('click', () => { delete BUILD[b.dataset.clear]; State.build = BUILD; renderBuilder(); }));
}

function openPicker(key) {
  const slot = SLOTS.find(s => s.key === key);
  const items = byCat(slot.category);
  const m = openModal(`
    <div class="modal-head"><h3>Elegir ${esc(slot.label.toLowerCase())}</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
    <div class="modal-body">
      <div class="search-input-wrap" style="margin-bottom:12px">${ICONS.search.replace('<svg', '<svg width="14" height="14"')}
        <input type="search" id="pickSearch" placeholder="Filtrar ${esc(slot.label.toLowerCase())}…"></div>
      <div class="pick-list" id="pickList"></div>
    </div>`, { size: 'modal-lg' });

  const draw = q => {
    const t = (q || '').toLowerCase();
    const list = items.filter(p => !t || (p.name + ' ' + p.brand + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(t));
    $('#pickList', m.el).innerHTML = list.length ? list.map(p => `
      <button class="pick ${BUILD[key] === p.id ? 'sel' : ''}" data-id="${p.id}">
        <img class="pick-img" src="${catImg(p)}" alt="" loading="lazy">
        <span class="p-main">
          <span class="slot-name" style="display:block">${esc(p.name)}</span>
          <span class="p-sub">${esc(slotMeta(key, p))}${p.stock <= 0 ? ' · <b style="color:var(--err)">Agotado</b>' : ''}</span>
        </span>
        <span class="p-price mono">${money(p.price)}</span>
      </button>`).join('') : `<div class="suggest-empty">Sin coincidencias.</div>`;
    $$('.pick', m.el).forEach(b => b.addEventListener('click', () => {
      BUILD[key] = b.dataset.id; State.build = BUILD; m.close(); renderBuilder();
    }));
  };
  draw('');
  $('#pickSearch', m.el).addEventListener('input', e => draw(e.target.value));
}

function renderBuilder() {
  renderSlots();
  const panel = $('#sumPanel');
  if (panel) {
    const sel = SLOTS.filter(s => BUILD[s.key]);
    const total = sel.reduce((t, s) => t + (byId(BUILD[s.key])?.price || 0), 0);
    const checks = runChecks(BUILD);
    const c = checkCounts(checks);
    panel.innerHTML = `
      <div class="panel-title">Resumen de la configuración</div>
      ${sel.length ? sel.map(s => {
        const p = byId(BUILD[s.key]);
        return `<div class="sum-line"><b>${esc(s.label)}</b><span class="mono">${money(p.price)}</span></div>`;
      }).join('') : '<p class="tiny muted">Selecciona componentes para ver el acumulado.</p>'}
      ${sel.length ? `<div class="sum-total"><span class="lbl muted tiny">TOTAL</span><span class="n mono">${money(total)}</span><button class="btn btn-xs btn-primary" id="loadQuote" ${sel.length && !c.err ? '' : 'disabled'} title="${c.err ? 'Resuelve los errores de compatibilidad antes de cotizar' : ''}">${ICONS.cart} Cotizar</button></div>` : ''}
      ${c.err ? '<p class="tiny" style="color:var(--err);margin:6px 0 0">Hay errores de compatibilidad: no se puede cotizar hasta resolverlos.</p>' : ''}
      <div class="divider"></div>
      <div class="row" style="justify-content:space-between;margin-bottom:9px">
        <span class="section-title" style="margin:0">Compatibilidad</span>
        <span class="row" style="gap:6px">
          ${c.err ? `<span class="badge badge-err">${c.err} error${c.err > 1 ? 'es' : ''}</span>` : ''}
          ${c.warn ? `<span class="badge badge-warn">${c.warn} aviso${c.warn > 1 ? 's' : ''}</span>` : ''}
          ${!c.err && !c.warn && c.ok ? `<span class="badge badge-ok">Todo correcto</span>` : ''}
        </span>
      </div>
      <div class="checks">${checks.filter(x => x.status === 'err' || x.status === 'warn').slice(0, 4).map(checkHTML).join('') || '<p class="tiny muted">Sin conflictos detectados.</p>'}</div>`;
    $('#loadQuote')?.addEventListener('click', () => {
      const q = State.quote;
      sel.forEach(s => {
        const it = q.items.find(i => i.id === BUILD[s.key]);
        if (it) it.qty += 1; else q.items.push({ id: BUILD[s.key], qty: 1 });
      });
      State.quote = q; renderNav();
      toast(`${sel.length} componentes cargados al cotizador`, 'ok');
      setTimeout(() => location.href = 'cotizador.html', 550);
    });
  }
  $$('.slot').forEach(el => el.classList.remove('bad'));
  const bad = runChecks(BUILD).filter(x => x.status === 'err');
  if (bad.length) { /* resaltado global en el reporte */ }
}

function openReport() {
  const checks = runChecks(BUILD);
  const c = checkCounts(checks);
  const sel = SLOTS.filter(s => BUILD[s.key]);
  const total = sel.reduce((t, s) => t + (byId(BUILD[s.key])?.price || 0), 0);
  const verdict = c.err ? ['err', 'Configuración con errores de compatibilidad'] : c.warn ? ['warn', 'Compatible con avisos a revisar'] : sel.length >= 6 ? ['ok', 'Configuración totalmente compatible'] : ['info', 'Configuración incompleta'];
  openModal(`
    <div class="modal-head">
      <h3>Reporte de compatibilidad</h3>
      <span class="badge badge-${verdict[0]}" style="margin-left:auto"><span class="dot dot-${verdict[0]}"></span>${verdict[1]}</span>
      <button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button>
    </div>
    <div class="modal-body">
      <div class="row" style="gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <span class="badge badge-ok">${c.ok} correctas</span>
        <span class="badge badge-err">${c.err} errores</span>
        <span class="badge badge-warn">${c.warn} avisos</span>
        <span class="badge">${c.info} informativas</span>
        <span class="spacer"></span>
        <b class="mono">${money(total)}</b>
      </div>
      ${checks.length ? `<div class="checks">${checks.map(checkHTML).join('')}</div>` : '<div class="empty"><h3>Sin datos</h3><p class="tiny">Selecciona al menos procesador y placa madre.</p></div>'}
    </div>
    <div class="modal-foot">
      <button class="btn btn-sm" data-close>Cerrar</button>
      <button class="btn btn-sm btn-primary" id="repQuote">${ICONS.cart} Cargar al cotizador</button>
    </div>`, { size: 'modal-lg' });
  $('#repQuote')?.addEventListener('click', () => $('#loadQuote')?.click());
}

/* ---- Parte B: verificador individual (upgrades de laptop) ---- */
const LAPTOP_LIST = () => (window.LAPTOPS || []);
function laptopById(id) { return LAPTOP_LIST().find(l => l.id === id); }

/* Reglas de actualización segun el modelo */
function laptopUpgradeInfo(l) {
  const name = (l.name || '').toLowerCase();
  const cpu = (l.cpu || '').toLowerCase();
  const ram = l.ramGB || 0;
  const solderRam = /(xps 13|xps 14|xps 16|air\b|alpha 13|unbounded 14s)/.test(name)
    || /(ultra \d+ \d{3}v|258v|266v|236v|lunar|core 5 2\d\du|core 5 315|core 5 220)/.test(cpu);
  const maxRam = ram <= 8 ? 32 : ram <= 16 ? 64 : ram <= 32 ? 64 : 128;
  const dualBay = /hdd/.test((l.storage || '').toLowerCase());
  const dedicated = /(rtx|gtx|radeon rx)/.test((l.gpu || '').toLowerCase());
  return {
    ram: {
      ok: !solderRam, max: maxRam,
      note: solderRam
        ? `Memoria soldada a la placa: no se puede ampliar. Viene fija con ${l.ram}.`
        : `Memoria ampliable: trae ${l.ram} en ranuras SO-DIMM y admite hasta ${maxRam} GB.`
    },
    storage: {
      ok: true,
      note: dualBay
        ? 'Almacenamiento ampliable: ranura M.2 NVMe libre adem\u00e1s de la bah\u00eda de 2.5\".'
        : `Almacenamiento ampliable: ranura M.2 NVMe para reemplazar o sumar un SSD (actual: ${l.storage}).`
    },
    gpu: {
      ok: false,
      note: dedicated
        ? `Gr\u00e1fica dedicada ${l.gpu} soldada a la placa: NO es actualizable en una laptop.`
        : `Gr\u00e1ficos integrados (${l.gpu}): NO son actualizables en una laptop.`
    }
  };
}

/* Grupos de upgrades compatibles con una laptop */
function laptopUpgradeGroups(l) {
  const info = laptopUpgradeInfo(l);
  const grab = cat => PRODUCTS.filter(p => p.category === cat);
  return [
    { key: 'memorias', label: 'RAM', icon: 'ram', ok: info.ram.ok, note: info.ram.note, items: grab('memorias') },
    { key: 'almacenamiento', label: 'Discos', icon: 'ssd', ok: info.storage.ok, note: info.storage.note, items: grab('almacenamiento') },
    { key: 'monitores', label: 'Monitores', icon: 'monitor', ok: true, note: 'Compatibles por HDMI / USB-C: se conectan como pantalla externa a cualquier laptop.', items: grab('monitores') },
    { key: 'perifericos', label: 'Perif\u00e9ricos', icon: 'keyboard', ok: true, note: 'Compatibles por USB / Bluetooth: funcionan en cualquier laptop sin configuraci\u00f3n.', items: grab('perifericos') },
    { key: 'accesorios', label: 'Accesorios', icon: 'dock', ok: true, note: 'Accesorios externos (dock, c\u00e1mara, UPS): compatibles por USB / USB-C.', items: grab('accesorios') },
    { key: 'graficas', label: 'Tarjeta gr\u00e1fica', icon: 'gpu', ok: false, note: info.gpu.note, items: grab('graficas') }
  ].filter(g => g.items.length);
}

/* Modal “Ver más” de un producto de upgrade */
function openUpgradeDetail(prodId, accept, note) {
  const p = byId(prodId); if (!p) return;
  const specEntries = Object.entries(p.specs || {});
  const m = openModal(`
    <div class="modal-head">
      <h3>${esc(p.name)}</h3>
      <button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button>
    </div>
    <div class="modal-body">
      <div class="row" style="gap:14px;align-items:flex-start;margin-bottom:14px">
        ${thumbHTML(p, 'rec-detail-img')}
        <div style="flex:1;min-width:0">
          <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.06em">${esc(p.brand)} · ${esc(catName(p.category))}</div>
          <div class="row" style="gap:10px;margin-top:6px;flex-wrap:wrap">
            <span class="price mono">${money(p.price)}</span>
            ${p.stock <= 0 ? '<span class="badge badge-err">Sin stock</span>' : `<span class="badge badge-ok">${p.stock} en stock</span>`}
          </div>
        </div>
      </div>
      <div class="compat-flag ${accept ? 'ok' : 'bad'}">
        <span class="dot ${accept ? 'dot-ok' : 'dot-err'}"></span>
        <span>${accept ? 'Compatible con tu equipo.' : 'Posible incompatibilidad con tu equipo.'} ${esc(note || '')}</span>
      </div>
      <div class="panel-title" style="margin-top:14px">Especificaciones y velocidades</div>
      ${specEntries.length ? `<div class="spec-grid">${specEntries.map(([k, v]) => `<div class="spec-row"><span class="sk">${esc(k)}</span><span class="sv">${esc(String(v))}</span></div>`).join('')}</div>` : '<p class="tiny muted">Sin especificaciones detalladas.</p>'}
    </div>
    <div class="modal-foot">
      <button class="btn btn-sm" data-close>Cerrar</button>
      <button class="btn btn-sm ${accept ? 'btn-ok' : 'btn-danger'}" id="upDetailAdd">${ICONS.cart} Agregar al carrito</button>
    </div>`, { size: 'modal-lg' });
  $('#upDetailAdd', m.el)?.addEventListener('click', () => { tryAddUpgrade(p.id, accept); m.close(); });
}

/* Agregar al carrito con confirmación si es incompatible */
function tryAddUpgrade(prodId, accept) {
  if (accept) { addToQuote(prodId); return; }
  const ok = window.confirm('Este producto puede ser incompatible para tu computadora. \u00bfDeseas adquirirlo de todas formas?');
  if (ok) { addToQuote(prodId); toast('Agregado pese a la posible incompatibilidad', 'err'); }
}

function initVerifier(preselect) {
  const input = $('#vSearch'), box = $('#vSuggest'), out = $('#vResults');
  if (!input) return;
  let sel = -1, list = [], groups = [], activeKey = null;

  const draw = () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { box.innerHTML = ''; return; }
    list = LAPTOP_LIST().filter(l => (l.name + ' ' + l.brand + ' ' + l.cpu + ' ' + l.gpu).toLowerCase().includes(q)).slice(0, 8);
    box.innerHTML = list.length ? `<div class="suggest">${list.map((l, i) => `
      <button class="suggest-item ${i === sel ? 'sel' : ''}" data-vid="${l.id}">
        <span style="width:16px;height:16px;color:var(--muted)">${ICONS.laptop}</span>
        <span>${esc(l.name)}</span><span class="s-price tiny muted">${esc(l.ram)} · ${esc(l.gpu)}</span>
      </button>`).join('')}</div>` : `<div class="suggest"><div class="suggest-empty">No encontramos ese equipo. Prueba con la marca y el modelo.</div></div>`;
    $$('[data-vid]', box).forEach(b => b.addEventListener('click', () => showLaptop(b.dataset.vid)));
  };
  input.addEventListener('input', () => { sel = -1; draw(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!list.length) return; e.preventDefault(); sel = clamp(sel + (e.key === 'ArrowDown' ? 1 : -1), 0, list.length - 1); draw(); }
    else if (e.key === 'Enter' && list[0]) showLaptop(list[0].id);
  });
  $('#vQuick')?.addEventListener('click', e => {
    const b = e.target.closest('[data-vid]'); if (b) showLaptop(b.dataset.vid);
  });

  function renderActiveGroup() {
    const g = groups.find(x => x.key === activeKey) || groups[0];
    const grid = $('#vGrid'); if (!grid || !g) return;
    $$('#catSwitch .cat-chip').forEach(b => b.classList.toggle('active', b.dataset.gk === g.key));
    grid.innerHTML = `
      <div class="rec-note ${g.ok ? 'ok' : 'bad'}">
        <span class="dot ${g.ok ? 'dot-ok' : 'dot-err'}"></span>
        <span>${esc(g.note)}</span>
      </div>
      <div class="rec-grid">
        ${g.items.map(it => `
          <div class="rec-card ${g.ok ? '' : 'rec-card-bad'}">
            ${thumbHTML(it, 'rec-card-img')}
            <div class="rec-card-body">
              <b class="rec-card-name">${esc(it.name)}</b>
              <span class="rec-card-price price-sm mono">${money(it.price)}</span>
            </div>
            <div class="rec-card-acts">
              <button class="btn btn-sm btn-ghost" data-more="${it.id}">Ver m\u00e1s</button>
              <button class="btn btn-sm ${g.ok ? 'btn-ok' : 'btn-danger'}" data-add="${it.id}" data-ok="${g.ok ? 1 : 0}">${ICONS.cart} Agregar</button>
            </div>
          </div>`).join('')}
      </div>`;
    $$('[data-add]', grid).forEach(b => b.addEventListener('click', () => tryAddUpgrade(b.dataset.add, b.dataset.ok === '1')));
    $$('[data-more]', grid).forEach(b => b.addEventListener('click', () => openUpgradeDetail(b.dataset.more, g.ok, g.note)));
  }

  function showLaptop(id) {
    const l = laptopById(id); if (!l) return;
    input.value = l.name; box.innerHTML = '';
    groups = laptopUpgradeGroups(l);
    activeKey = groups[0] && groups[0].key;
    const info = laptopUpgradeInfo(l);
    const specRows = [['Procesador', l.cpu], ['Memoria RAM', l.ram], ['Gr\u00e1ficos', l.gpu], ['Almacenamiento', l.storage]];
    out.innerHTML = `
      <div class="vr-layout">
        <aside class="vr-aside">
          <div class="card">
            <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.06em">${esc(l.brand)}</div>
            <h3 style="margin:3px 0 10px">${esc(l.name)}</h3>
            <div class="panel-title">Especificaciones</div>
            <div class="spec-grid spec-grid-1">
              ${specRows.map(([k, v]) => `<div class="spec-row"><span class="sk">${esc(k)}</span><span class="sv">${esc(v)}</span></div>`).join('')}
            </div>
            <div class="panel-title" style="margin-top:16px">\u00bfQu\u00e9 puedo actualizar?</div>
            <ul class="up-list">
              <li class="${info.ram.ok ? 'ok' : 'bad'}"><span class="dot ${info.ram.ok ? 'dot-ok' : 'dot-err'}"></span><div><b>RAM \u2014 ${info.ram.ok ? 'Actualizable' : 'No actualizable'}</b><span>${esc(info.ram.note)}</span></div></li>
              <li class="${info.storage.ok ? 'ok' : 'bad'}"><span class="dot ${info.storage.ok ? 'dot-ok' : 'dot-err'}"></span><div><b>Almacenamiento \u2014 ${info.storage.ok ? 'Actualizable' : 'No actualizable'}</b><span>${esc(info.storage.note)}</span></div></li>
              <li class="${info.gpu.ok ? 'ok' : 'bad'}"><span class="dot ${info.gpu.ok ? 'dot-ok' : 'dot-err'}"></span><div><b>Tarjeta gr\u00e1fica \u2014 ${info.gpu.ok ? 'Actualizable' : 'No actualizable'}</b><span>${esc(info.gpu.note)}</span></div></li>
            </ul>
          </div>
        </aside>
        <div class="vr-main">
          <h4 style="margin:0 0 3px">Mejoras compatibles con tu equipo</h4>
          <p class="tiny muted" style="margin:0 0 12px">Elige una categor\u00eda. El bot\u00f3n verde indica que tu equipo lo acepta; el rojo, una posible incompatibilidad.</p>
          <div class="cat-switch" id="catSwitch">
            ${groups.map(g => `<button class="cat-chip ${g.key === activeKey ? 'active' : ''}" data-gk="${g.key}"><span class="cc-ic">${ICONS[g.icon] || ''}</span>${esc(g.label)}<small>${g.items.length}</small></button>`).join('')}
          </div>
          <div id="vGrid"></div>
        </div>
      </div>`;
    $$('#catSwitch .cat-chip').forEach(b => b.addEventListener('click', () => { activeKey = b.dataset.gk; renderActiveGroup(); }));
    renderActiveGroup();
    out.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (preselect) showLaptop(preselect);
  return showLaptop;
}

function initCompat() {
  BUILD = State.build || {};
  renderBuilder();
  $('#verifyAll')?.addEventListener('click', openReport);
  $('#clearBuild')?.addEventListener('click', () => { BUILD = {}; State.build = {}; renderBuilder(); toast('Configuración limpiada'); });
  $('#quickBuild')?.addEventListener('click', () => {
    BUILD = { cpu:'cpu-r5-7600', mb:'mb-b650-msi', ram:'ram-king-16-ddr5', storage:'ssd-kingston-nv2-1tb', gpu:'gpu-rtx4060', psu:'psu-650w', case:'case-nzxt-h5', os:'os-win11-home' };
    State.build = BUILD; renderBuilder(); toast('Configuración de ejemplo cargada', 'ok');
  });
  $('#quickBuildIntel')?.addEventListener('click', () => {
    BUILD = { cpu:'cpu-i5-13400', mb:'mb-b760-giga', ram:'ram-king-16-ddr4', storage:'ssd-samsung-1tb', gpu:'gpu-gtx1660s', psu:'psu-500w', case:'case-corsair-4000d', os:'os-win11-home' };
    State.build = BUILD; renderBuilder(); toast('Configuración Intel DDR4 cargada', 'ok');
  });

  /* Tabs constructor / verificador */
  $$('.tab[data-view]').forEach(t => t.addEventListener('click', () => {
    $$('.tab[data-view]').forEach(x => x.classList.toggle('active', x === t));
    $('#viewBuilder').classList.toggle('hidden', t.dataset.view !== 'builder');
    $('#viewCheck').classList.toggle('hidden', t.dataset.view !== 'check');
  }));

  const pre = new URLSearchParams(location.search).get('check');
  const show = initVerifier(pre);
  if (pre) {
    $$('.tab[data-view]').forEach(x => x.classList.toggle('active', x.dataset.view === 'check'));
    $('#viewBuilder')?.classList.add('hidden');
    $('#viewCheck')?.classList.remove('hidden');
  }
  return show;
}

/* ------------------------------------------------------------
   10. Página: cotizador.html
   ------------------------------------------------------------ */
function quoteTotals(items, promo) {
  const subtotal = items.reduce((s, i) => s + (byId(i.id)?.price ?? i.price ?? 0) * i.qty, 0);
  const pct = promo && PROMOS[promo] ? PROMOS[promo].pct : 0;
  const discount = subtotal * pct / 100;
  const base = subtotal - discount;
  const tax = base * IVA;
  return { subtotal, pct, discount, base, tax, total: base + tax };
}

function renderQuote() {
  const q = State.quote;
  const tbody = $('#quoteBody'), emptyEl = $('#quoteEmpty'), panel = $('#quotePanel');
  if (!tbody) return;
  const items = q.items.map(i => ({ ...i, p: byId(i.id) })).filter(i => i.p);
  q.items = items.map(i => ({ id: i.id, qty: i.qty }));

  if (!items.length) {
    tbody.innerHTML = '';
    emptyEl?.classList.remove('hidden');
    $('#quoteTable')?.classList.add('hidden');
    if (panel) panel.innerHTML = `<div class="panel-title">Resumen</div><p class="tiny muted">Agrega productos desde el catálogo o el armador de PC para calcular la cotización.</p>
      <div class="divider"></div><a class="btn btn-sm btn-block btn-primary" href="catalogo.html">Ir al catálogo</a>`;
    renderNav();
    return;
  }
  emptyEl?.classList.add('hidden');
  $('#quoteTable')?.classList.remove('hidden');

  tbody.innerHTML = items.map(i => `
    <div class="q-card" data-row="${i.id}">
      <img class="q-img" src="${catImg(i.p)}" alt="" loading="lazy">
      <div class="q-card-main">
        <span class="qi-name">${esc(i.p.name)}</span>
        <span class="qi-sub">${esc(i.p.brand)} · ${esc(catName(i.p.category))}${i.p.stock <= 0 ? ' · <b style="color:var(--err)">sin stock</b>' : i.qty > i.p.stock ? ` · <b style="color:var(--warn)">solo ${i.p.stock} disponibles</b>` : ''}</span>
        <span class="qi-unit">${money(i.p.price)} <small>c/u</small></span>
      </div>
      <div class="q-card-side">
        <span class="qty">
          <button data-dec="${i.id}" aria-label="Disminuir">−</button>
          <input type="number" min="1" max="99" value="${i.qty}" data-qty="${i.id}" aria-label="Cantidad">
          <button data-inc="${i.id}" aria-label="Aumentar">+</button>
        </span>
        <span class="q-card-sub mono"><b>${money(i.p.price * i.qty)}</b></span>
        <button class="icon-btn q-del" data-del="${i.id}" title="Eliminar">${ICONS.trash}</button>
      </div>
    </div>`).join('');

  const t = quoteTotals(items.map(i => ({ id: i.id, qty: i.qty })), q.promo);
  panel.innerHTML = `
    <div class="panel-title">Resumen de la cotización</div>
    <div class="sum-line"><span>Subtotal (${items.reduce((n, i) => n + i.qty, 0)} artículos)</span><b class="mono">${money(t.subtotal)}</b></div>
    ${q.promo ? `
      <div class="sum-line"><span>Descuento ${esc(q.promo)} (−${t.pct}%)</span><b class="mono disc-line">−${money(t.discount)}</b></div>
      <div class="sum-line"><span>Base imponible</span><b class="mono">${money(t.base)}</b></div>` : ''}
    <div class="sum-line"><span>IVA 13%</span><b class="mono">${money(t.tax)}</b></div>
    <div class="total-box"><span class="lbl">Total final</span><span class="amt mono">${money(t.total)}</span></div>
    <div class="divider"></div>
    <div class="section-title">Código de promoción</div>
    ${q.promo ? `<div class="promo-badge">${ICONS.tag} ${esc(q.promo)} · −${t.pct}% <button id="rmPromo" aria-label="Quitar código">×</button></div>
      <p class="hint" style="margin:7px 0 0">${esc(PROMOS[q.promo].desc)}</p>`
    : `<div class="promo-row"><input type="text" id="promoInput" placeholder="Ej. KRONOX10" autocomplete="off"><button class="btn btn-sm" id="applyPromo">Aplicar</button></div>
      <div class="err-text" id="promoErr"></div>
      <p class="hint">Disponibles: ${Object.keys(PROMOS).join(', ')}</p>`}
    <div class="divider"></div>
    <div class="btn-group" style="flex-wrap:wrap;gap:8px">
      <button class="btn btn-primary btn-sm" id="btnPdf">${ICONS.print} PDF</button>
      <button class="btn btn-sm" id="btnMail">${ICONS.mail} Correo</button>
      ${State.session ? `<button class="btn btn-sm" id="btnSave">${ICONS.box} Guardar</button>` : `<button class="btn btn-sm" id="btnLoginQuote">${ICONS.user} Inicia sesión</button>`}
      <button class="btn btn-ghost btn-sm btn-clear" id="btnClear">${ICONS.trash} Vaciar</button>
    </div>`;

  $$('[data-inc]').forEach(b => b.addEventListener('click', () => setQty(b.dataset.inc, +b.dataset.inc, +1)));
  $$('[data-dec]').forEach(b => b.addEventListener('click', () => setQty(b.dataset.dec, 0, -1)));
  $$('[data-del]').forEach(b => b.addEventListener('click', () => {
    const q2 = State.quote; q2.items = q2.items.filter(i => i.id !== b.dataset.del); State.quote = q2; renderQuote(); toast('Producto eliminado');
  }));
  $$('[data-qty]').forEach(inp => inp.addEventListener('change', () => {
    const q2 = State.quote, it = q2.items.find(i => i.id === inp.dataset.qty);
    if (it) { it.qty = clamp(parseInt(inp.value) || 1, 1, 99); State.quote = q2; renderQuote(); }
  }));
  $('#applyPromo')?.addEventListener('click', applyPromo);
  $('#promoInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(); } });
  $('#rmPromo')?.addEventListener('click', () => { const q2 = State.quote; q2.promo = null; State.quote = q2; renderQuote(); toast('Código quitado'); });
  $('#btnPdf')?.addEventListener('click', printQuote);
  $('#btnMail')?.addEventListener('click', mailQuote);
  $('#btnClear')?.addEventListener('click', () => { State.quote = { items: [], promo: null }; renderQuote(); toast('Cotización vaciada'); });
  $('#btnSave')?.addEventListener('click', saveQuote);
  $('#btnLoginQuote')?.addEventListener('click', () => authModal('login'));
  renderNav();
}

function setQty(id, _cur, delta) {
  const q = State.quote, it = q.items.find(i => i.id === id);
  if (!it) return;
  it.qty = clamp(it.qty + delta, 1, 99);
  State.quote = q; renderQuote();
}

function applyPromo() {
  const inp = $('#promoInput'), err = $('#promoErr');
  const code = (inp.value || '').trim().toUpperCase();
  if (!code) { err.textContent = 'Ingresa un código de promoción.'; inp.classList.add('invalid'); return; }
  if (!PROMOS[code]) { err.textContent = `El código "${code}" no es válido o expiró.`; inp.classList.add('invalid'); return; }
  const q = State.quote; q.promo = code; State.quote = q;
  const used = State.coupons || [];
  if (!used.some(u => u.code === code)) { used.unshift({ code, pct: PROMOS[code].pct, date: new Date().toISOString().slice(0, 10) }); State.coupons = used.slice(0, 20); }
  renderQuote();
  toast(`Código ${code} aplicado: −${PROMOS[code].pct}%`, 'ok');
}

function quoteRecord() {
  const q = State.quote;
  const items = q.items.map(i => { const p = byId(i.id); return { id: i.id, name: p.name, brand: p.brand, qty: i.qty, price: p.price }; });
  const t = quoteTotals(items, q.promo);
  const s = State.profile();
  return {
    id: 'KF-' + Math.floor(1000 + Math.random() * 9000),
    date: new Date().toISOString().slice(0, 10),
    client: s ? s.name : 'Cliente sin registrar',
    email: s ? s.email : '',
    items, ...t, promo: q.promo
  };
}

function printQuote() {
  const rec = quoteRecord();
  const host = $('#printDoc');
  host.innerHTML = `
    <div class="print-head">
      <div>
        <h1>KRONOX FORGE</h1>
        <div class="tiny">Hardware y componentes verificados<br>San Salvador, El Salvador · kronoxforgetechnology@gmail.com · +503 7200 8919</div>
      </div>
      <div class="print-meta">
        <b>COTIZACIÓN ${esc(rec.id)}</b><br>
        Fecha: ${esc(rec.date)}<br>
        Cliente: ${esc(rec.client)}<br>
        ${rec.email ? 'Correo: ' + esc(rec.email) : ''}
      </div>
    </div>
    <table class="print-table">
      <thead><tr><th style="width:52%">Producto</th><th>Marca</th><th class="num">Cant.</th><th class="num">Unitario</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${rec.items.map(i => `<tr><td>${esc(i.name)}</td><td>${esc(i.brand)}</td><td class="num">${i.qty}</td><td class="num">${money(i.price)}</td><td class="num">${money(i.price * i.qty)}</td></tr>`).join('')}</tbody>
    </table>
    <div class="print-totals">
      <div><span>Subtotal</span><span>${money(rec.subtotal)}</span></div>
      ${rec.promo ? `<div><span>Descuento ${esc(rec.promo)} (−${rec.pct}%)</span><span>−${money(rec.discount)}</span></div>` : ''}
      <div><span>IVA 13%</span><span>${money(rec.tax)}</span></div>
      <div class="print-grand"><span>TOTAL</span><span>${money(rec.total)}</span></div>
    </div>
    <div class="print-foot">
      Cotización válida por 15 días a partir de la fecha de emisión. Precios en dólares estadounidenses (USD), sujetos a disponibilidad de inventario.
      IVA del 13% calculado sobre la base imponible después del descuento. Este documento no constituye una factura ni un comprobante de pago.
      <br>Generado el ${new Date().toLocaleString('es-SV')} · Kronox Forge
    </div>`;
  window.print();
}

function mailQuote() {
  const rec = quoteRecord();
  const lines = rec.items.map(i => `  • ${i.name} — ${i.qty} x ${money(i.price)} = ${money(i.price * i.qty)}`).join('\n');
  const body =
`COTIZACIÓN ${rec.id} — KRONOX FORGE
Fecha: ${rec.date}
Cliente: ${rec.client}

PRODUCTOS
${lines}

RESUMEN
  Subtotal:            ${money(rec.subtotal)}${rec.promo ? `
  Descuento ${rec.promo} (-${rec.pct}%): -${money(rec.discount)}` : ''}
  IVA 13%:             ${money(rec.tax)}
  TOTAL FINAL:         ${money(rec.total)}

Cotización válida por 15 días. Precios en USD, sujetos a disponibilidad.`;
  location.href = 'mailto:kronoxforgetechnology@gmail.com?subject=' + encodeURIComponent(`Cotización ${rec.id} — Kronox Forge`) + '&body=' + encodeURIComponent(body);
}

function saveQuote() {
  const s = State.session;
  if (!s) return authModal('login');
  if (!State.quote.items.length) return toast('La cotización está vacía', 'err');
  addHistory(s.email, quoteRecord());
  toast('Cotización guardada en tu historial', 'ok');
}

function initCotizador() { renderQuote(); }

/* ------------------------------------------------------------
   11. Página: recomendador.html
   ------------------------------------------------------------ */
const USES = [
  { id:'estudio',      name:'Estudio básico',            hint:'Clases, documentos, navegación' },
  { id:'oficina',      name:'Trabajo de oficina',        hint:'Ofimática, videollamadas, ERP' },
  { id:'programacion', name:'Programación y desarrollo', hint:'IDEs, contenedores, compilación' },
  { id:'diseno',       name:'Diseño gráfico',            hint:'Illustrator, Photoshop, Figma' },
  { id:'gaming',       name:'Gaming',                    hint:'Juegos AAA y competitivos' },
  { id:'video',        name:'Edición de video',          hint:'Premiere, DaVinci, 4K' }
];
let PROFILE = { use:'estudio', budget:900, form:'laptop', brands:[] };

function candidatePool() {
  const laptops = PRODUCTS.filter(p => p.category === 'laptops');
  if (PROFILE.form === 'laptop') return laptops.map(p => ({ kind:'laptop', p, uses:p.uses, price:p.price, stock:p.stock }));
  if (PROFILE.form === 'escritorio') return DESKTOP_KITS.map(k => ({ kind:'kit', p:k, uses:k.uses, price:k.price, stock:k.stock }));
  return [...laptops.map(p => ({ kind:'laptop', p, uses:p.uses, price:p.price, stock:p.stock })),
          ...DESKTOP_KITS.map(k => ({ kind:'kit', p:k, uses:k.uses, price:k.price, stock:k.stock }))];
}

function scoreCandidate(c) {
  const useScore = ((c.uses?.[PROFILE.use] ?? 0) / 3) * 100;
  const over = c.price - PROFILE.budget;
  const priceScore = over <= 0
    ? clamp(100 - (PROFILE.budget - c.price) / PROFILE.budget * 22, 62, 100)
    : clamp(100 - (over / PROFILE.budget) * 165, 0, 55);
  const brandScore = !PROFILE.brands.length
    ? 70
    : (PROFILE.brands.includes(c.p.brand) ? 100 : (c.kind === 'kit' ? 70 : 25));
  const stock = c.stock > 0 ? 100 : 20;
  const total = Math.round(useScore * 0.5 + priceScore * 0.33 + brandScore * 0.12 + stock * 0.05);
  return { useScore, priceScore, total };
}

function explain(c, sc) {
  const bits = [];
  const u = USES.find(x => x.id === PROFILE.use);
  const fit = c.uses?.[PROFILE.use] ?? 0;
  bits.push(fit >= 3 ? `Pensado para ${u.name.toLowerCase()}: ${c.p.why || (c.p.perf?.cpu ? `${c.p.perf.cpu}/100 en CPU` : '')}` :
            fit === 2 ? `Cumple con ${u.name.toLowerCase()} aunque no es su enfoque principal` :
            `Uso limitado para ${u.name.toLowerCase()}`);
  if (c.kind === 'laptop') {
    bits.push(`${c.p.specs.Procesador || ''}`);
    bits.push(`${c.p.ramGB} GB de RAM · ${c.p.specs.Almacenamiento || ''}`);
    if (c.p.perf?.gpu >= 50) bits.push(`GPU dedicada con índice ${c.p.perf.gpu}/100`);
  } else {
    const parts = c.p.parts.map(id => byId(id)?.name).filter(Boolean);
    bits.push(`${parts.length} componentes: ${parts.slice(0, 3).join(', ')}…`);
  }
  bits.push(c.price <= PROFILE.budget ? `${money(c.price)}, dentro de tu presupuesto de ${money(PROFILE.budget)}`
    : `${money(c.price)}, ${money(c.price - PROFILE.budget)} por encima de tu presupuesto`);
  return bits.filter(Boolean).join(' · ');
}

function renderProfileForm() {
  const host = $('#profileForm'); if (!host) return;
  host.innerHTML = `
    <div class="form-grid">
      <div class="full">
        <span class="q-label">¿Para qué usarás el equipo?</span>
        <div class="radio-cards" id="useCards">
          ${USES.map(u => `<button type="button" class="radio-card ${PROFILE.use === u.id ? 'active' : ''}" data-use="${u.id}">${u.name}<small>${u.hint}</small></button>`).join('')}
        </div>
      </div>
      <div>
        <span class="q-label">Presupuesto máximo: <b id="budLbl" class="mono">${money(PROFILE.budget)}</b></span>
        <input type="range" class="solo" id="budRange" min="200" max="3000" step="50" value="${PROFILE.budget}">
        <div class="range-vals"><span>$200</span><span>$3,000</span></div>
      </div>
      <div>
        <span class="q-label">¿Laptop o escritorio?</span>
        <div class="toggle-group" id="formToggle">
          <button type="button" data-form="laptop" class="${PROFILE.form === 'laptop' ? 'active' : ''}">Laptop</button>
          <button type="button" data-form="escritorio" class="${PROFILE.form === 'escritorio' ? 'active' : ''}">Escritorio</button>
          <button type="button" data-form="ambos" class="${PROFILE.form === 'ambos' ? 'active' : ''}">Ambos</button>
        </div>
      </div>
      <div class="full">
        <span class="q-label">Marca de preferencia <span class="hint">(opcional, varias)</span></span>
        <div class="chips" id="brandChips">
          ${BRANDS.map(b => `<button type="button" class="chip ${PROFILE.brands.includes(b) ? 'active' : ''}" data-brand="${esc(b)}">${esc(b)}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="btn-group" style="margin-top:16px">
      <button class="btn btn-primary" id="findBtn">${ICONS.spark} Encontrar mi PC ideal</button>
      <button class="btn btn-ghost" id="resetProfile">Restablecer</button>
    </div>`;

  $$('#useCards [data-use]').forEach(b => b.addEventListener('click', () => {
    PROFILE.use = b.dataset.use;
    $$('#useCards [data-use]').forEach(x => x.classList.toggle('active', x === b));
  }));
  $('#budRange').addEventListener('input', e => { PROFILE.budget = +e.target.value; $('#budLbl').textContent = money(PROFILE.budget); });
  $$('#formToggle [data-form]').forEach(b => b.addEventListener('click', () => {
    PROFILE.form = b.dataset.form;
    $$('#formToggle [data-form]').forEach(x => x.classList.toggle('active', x === b));
  }));
  $$('#brandChips [data-brand]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.brand;
    PROFILE.brands = PROFILE.brands.includes(v) ? PROFILE.brands.filter(x => x !== v) : [...PROFILE.brands, v];
    b.classList.toggle('active');
  }));
  $('#findBtn').addEventListener('click', renderRecommendations);
  $('#resetProfile').addEventListener('click', () => { PROFILE = { use:'estudio', budget:900, form:'laptop', brands:[] }; renderProfileForm(); $('#recResults').innerHTML = ''; });
}

function renderRecommendations() {
  const host = $('#recResults'); if (!host) return;
  let pool = candidatePool();
  // Filtro estricto por marca: si el usuario elige una o varias marcas,
  // solo se muestran equipos de esas marcas (no se mezclan otras).
  if (PROFILE.brands.length) pool = pool.filter(c => PROFILE.brands.includes(c.p.brand));
  const scored = pool.map(c => ({ c, sc: scoreCandidate(c) }))
    .sort((a, b) => b.sc.total - a.sc.total).slice(0, 6);
  const u = USES.find(x => x.id === PROFILE.use);
  if (!scored.length) {
    host.innerHTML = `
      <div class="rec-empty">
        <h2 style="font-size:15px;margin:0 0 6px">Sin resultados para ${esc(PROFILE.brands.join(', '))}</h2>
        <p class="tiny muted" style="margin:0">Aún no tenemos equipos de esa marca en el catálogo. Prueba con otra marca o quita el filtro de marca.</p>
      </div>`;
    return;
  }
  host.innerHTML = `
    <div class="row-between" style="margin-bottom:12px">
      <h2 style="font-size:15px">Mejores opciones para <span style="color:var(--accent)">${esc(u.name)}</span></h2>
      <span class="result-count">${scored.length} resultados · presupuesto ${money(PROFILE.budget)}</span>
    </div>
    <div class="rec-scroll">
      <div class="rec-grid3 rec-grid3-perfil">
        ${scored.map(({ c, sc }, i) => `
          <div class="rc3">
            <div class="rc3-top">
              ${thumbHTML(c.p, 'rc3-img')}
              <span class="score ${sc.total >= 70 ? '' : sc.total >= 45 ? 'mid' : 'low'}">${sc.total}<small>/100</small></span>
            </div>
            <div class="rc3-body">
              ${i === 0 ? '<span class="badge badge-ok" style="align-self:flex-start">Mejor opci\u00f3n</span>' : ''}
              <b class="rc3-name">${esc(c.p.name)}</b>
              <div class="row" style="gap:6px"><span class="badge">${c.kind === 'kit' ? 'Escritorio armado' : 'Laptop'}</span><span class="spacer"></span><span class="price price-sm mono">${money(c.price)}</span></div>
              <p class="rc3-why">${esc(explain(c, sc))}</p>
              <div class="rc3-acts">
                ${c.kind === 'laptop'
                  ? `<button class="btn btn-sm" data-openrec="${c.p.id}">Ver detalle</button>
                     <button class="btn btn-sm btn-primary" data-addrec="${c.p.id}">${ICONS.cart} Cotizar</button>`
                  : `<button class="btn btn-sm" data-kitdetail="${c.p.id}">Componentes</button>
                     <button class="btn btn-sm btn-primary" data-kit="${c.p.id}">${ICONS.cart} Cotizar</button>`}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;

  $$('[data-addrec]', host).forEach(b => b.addEventListener('click', () => addToQuote(b.dataset.addrec)));
  $$('[data-openrec]', host).forEach(b => b.addEventListener('click', () => openProduct(b.dataset.openrec)));
  $$('[data-kit]', host).forEach(b => b.addEventListener('click', () => {
    const k = DESKTOP_KITS.find(x => x.id === b.dataset.kit);
    k.parts.forEach(id => addToQuote(id));
  }));
  $$('[data-kitdetail]', host).forEach(b => b.addEventListener('click', () => {
    const k = DESKTOP_KITS.find(x => x.id === b.dataset.kitdetail);
    openModal(`
      <div class="modal-head"><h3>${esc(k.name)}</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
      <div class="modal-body">
        <p class="tiny muted">${esc(k.why)}</p>
        <div class="divider"></div>
        <div class="pick-list" style="max-height:none">
          ${k.parts.map(id => { const p = byId(id); return `
            <div class="pick" style="cursor:default">
              <span style="width:18px;height:18px;color:var(--muted);flex:none">${ICONS[p.icon]}</span>
              <span class="p-main"><span class="slot-name" style="display:block">${esc(p.name)}</span><span class="p-sub">${esc(catName(p.category))}</span></span>
              <span class="p-price mono">${money(p.price)}</span>
            </div>`; }).join('')}
        </div>
        <div class="sum-total"><span class="lbl muted tiny">TOTAL DEL EQUIPO</span><span class="n mono">${money(k.price)}</span></div>
      </div>
      <div class="modal-foot"><button class="btn btn-sm" data-close>Cerrar</button>
        <button class="btn btn-sm btn-primary" id="kitAdd">${ICONS.cart} Cotizar todo</button></div>`, { size: 'modal-lg' });
    $('#kitAdd')?.addEventListener('click', () => { k.parts.forEach(id => addToQuote(id)); });
  }));
}

/* ---- Herramienta B: recomendador de upgrades ---- */
let OWNED = null;

function renderOwnedSelect() {
  const sel = $('#ownedSel'); if (!sel) return;
  const groups = {};
  OWNED_BASE.forEach(o => { (groups[catName(o.category)] = groups[catName(o.category)] || []).push(o); });
  sel.innerHTML = `<option value="">Selecciona el componente que ya tienes…</option>` +
    Object.entries(groups).map(([g, arr]) => `<optgroup label="${esc(g)}">${arr.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}</optgroup>`).join('') +
    `<optgroup label="Del catálogo actual">${PRODUCTS.filter(p => ['graficas','procesadores','memorias','almacenamiento'].includes(p.category)).map(p => `<option value="cat:${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>`;
}

function renderUpgrades() {
  const host = $('#upResults'); if (!host) return;
  if (!OWNED) { host.innerHTML = `<div class="empty"><h3>Selecciona tu componente actual</h3><p class="tiny">El sistema comparará su rendimiento contra el catálogo y ordenará las mejoras por costo-beneficio.</p></div>`; return; }
  const pool = PRODUCTS.filter(p => p.category === OWNED.category && p.id !== OWNED.id);
  const base = OWNED.perf || 10;
  const rows = pool.map(p => {
    const cur = (p.perf && (p.perf.gpu ?? p.perf.cpu ?? p.perf.ram ?? p.perf.sto)) || 50;
    const gain = Math.max(0, Math.round((cur - base) / Math.max(base, 1) * 100));
    const price = Math.max(p.price, 1);
    const value = gain / price * 100;
    return { p, cur, gain, value, price };
  }).filter(r => r.gain > 0).sort((a, b) => b.value - a.value).slice(0, 7);

  host.innerHTML = `
    <div class="row-between" style="margin-bottom:12px;flex-wrap:wrap">
      <div>
        <h2 style="font-size:15px">Upgrades recomendados</h2>
        <p class="tiny muted" style="margin:2px 0 0">Componente actual: <b style="color:var(--text)">${esc(OWNED.name)}</b> · índice de rendimiento ${base}/100</p>
      </div>
      <span class="result-count">${rows.length} opciones ordenadas por costo-beneficio</span>
    </div>
    ${rows.length ? `<div class="rec-scroll"><div class="rec-grid3">${rows.map((r, i) => `
      <div class="rc3">
        <div class="rc3-top">
          ${thumbHTML(r.p, 'rc3-img')}
          <span class="score ${r.gain >= 80 ? '' : r.gain >= 30 ? 'mid' : 'low'}">+${r.gain}<small>%</small></span>
        </div>
        <div class="rc3-body">
          ${i === 0 ? '<span class="badge badge-ok" style="align-self:flex-start">Mejor valor</span>' : ''}
          <b class="rc3-name">${esc(r.p.name)}</b>
          <div class="row" style="gap:6px"><span class="badge badge-accent">${(r.value).toFixed(1)} pts/$</span><span class="spacer"></span><span class="price price-sm mono">${money(r.price)}</span></div>
          <p class="rc3-why">${esc(upgradeWhy(r))}</p>
          <div class="rc3-acts">
            <button class="btn btn-sm" data-openup="${r.p.id}">Especificaciones</button>
            <button class="btn btn-sm btn-primary" data-addup="${r.p.id}">${ICONS.cart} Cotizar</button>
          </div>
        </div>
      </div>`).join('')}</div></div>` : `<div class="empty"><h3>Sin mejoras disponibles</h3><p class="tiny">Tu componente actual ya est\u00e1 en el tope del cat\u00e1logo para esa categor\u00eda.</p></div>`}`;

  $$('[data-addup]', host).forEach(b => b.addEventListener('click', () => addToQuote(b.dataset.addup)));
  $$('[data-openup]', host).forEach(b => b.addEventListener('click', () => openProduct(b.dataset.openup)));
}

function upgradeWhy(r) {
  const o = OWNED;
  if (o.category === 'graficas') {
    const tdpOk = r.p.tdp <= o.tdp + 25;
    return `De ${o.name} (${o.perf}) a ${r.p.name} (${r.cur}): +${r.gain}% de rendimiento gráfico con ${r.p.vram} GB de VRAM frente a ${4}. ` +
      (tdpOk ? `El consumo (${r.p.tdp} W) es similar al actual, tu fuente sigue sirviendo.` : `Consume ${r.p.tdp} W vs ${o.tdp} W: verifica que tu fuente entregue al menos ${Math.ceil((r.p.tdp + 95) * 1.2)} W.`);
  }
  if (o.category === 'procesadores') {
    const same = byCat('placas').some(m => m.socket === (r.p.socket) && m.socket === 'AM4');
    return `De ${o.perf} a ${r.cur} en índice de CPU (+${r.gain}%): ${r.p.specs.Núcleos} núcleos / ${r.p.specs.Hilos} hilos y socket ${r.p.socket}. ` +
      (same ? 'Conservas tu placa AM4 con una actualización de BIOS.' : `Requiere placa ${r.p.socket} y memoria ${r.p.ramTypes.join('/')}; es un cambio de plataforma completo.`);
  }
  if (o.category === 'memorias') {
    return `De ${o.ramGB} GB ${o.ramType} a ${r.p.ramGB} GB ${r.p.ramType}-${r.p.ramSpeed} (+${r.gain}%). ` +
      (r.p.ramType === o.ramType ? `Mismo tipo ${o.ramType}: compatible con tu placa actual, solo cambia los módulos.` : `Cambio de ${o.ramType} a ${r.p.ramType}: necesitas una placa madre con ranuras ${r.p.ramType}.`);
  }
  return `De ${o.perf} a ${r.cur} en velocidad de almacenamiento (+${r.gain}%): ${r.p.iface} con ${r.p.specs['Lectura seq.'] || '—'} de lectura. ` +
    (r.p.iface === 'SATA III' ? 'Interfaz SATA, idéntica a la actual.' : `Interfaz ${r.p.iface}: requiere ranura M.2 en la placa madre.`);
}

function initRecomendador() {
  renderProfileForm();
  renderOwnedSelect();
  $$('.tab[data-rview]').forEach(t => t.addEventListener('click', () => {
    $$('.tab[data-rview]').forEach(x => x.classList.toggle('active', x === t));
    $('#viewPerfil').classList.toggle('hidden', t.dataset.rview !== 'perfil');
    $('#viewUpgrade').classList.toggle('hidden', t.dataset.rview !== 'upgrade');
  }));
  const sel = $('#ownedSel');
  sel?.addEventListener('change', () => {
    const v = sel.value;
    if (!v) { OWNED = null; renderUpgrades(); return; }
    if (v.startsWith('cat:')) {
      const p = byId(v.slice(4));
      OWNED = { id:p.id, category:p.category, name:p.name, tdp:p.tdp || 65, ramType:p.ramType, ramGB:p.ramGB,
        perf: (p.perf?.gpu ?? p.perf?.cpu ?? p.perf?.ram ?? p.perf?.sto) || 40 };
    } else OWNED = OWNED_BASE.find(o => o.id === v);
    renderUpgrades();
  });
  renderUpgrades();
  if (new URLSearchParams(location.search).get('auto')) renderRecommendations();
}

/* ------------------------------------------------------------
   12. Página: cuenta.html
   ------------------------------------------------------------ */
let ACC_TAB = 'perfil';

function renderAccount() {
  const gate = $('#loginGate'), root = $('#accountRoot');
  if (!gate || !root) return;
  const s = State.session;
  if (!s) {
    gate.classList.remove('hidden'); root.classList.add('hidden');
    $('#gateLogin')?.addEventListener('click', () => authModal('login'));
    return;
  }
  gate.classList.add('hidden'); root.classList.remove('hidden');
  const u = State.profile() || s;
  const h = history(u.email);
  const favs = State.favs.map(id => byId(id)).filter(Boolean);
  const coupons = State.coupons || [];

  $$('.side-nav [data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === ACC_TAB));
  const panel = $('#accPanel');

  if (ACC_TAB === 'perfil') {
    panel.innerHTML = `
      <div class="card">
        <div class="row" style="gap:14px;margin-bottom:16px">
          <span class="avatar" style="width:46px;height:46px;font-size:18px">${esc((u.name || u.email).charAt(0).toUpperCase())}</span>
          <div><h2 style="font-size:17px">${esc(u.name || 'Sin nombre')}</h2><p class="tiny muted" style="margin:0">${esc(u.email)}</p></div>
        </div>
        <form id="profileForm">
          <div class="form-grid">
            <label class="field"><span>Nombre completo</span><input type="text" id="pfName" value="${esc(u.name || '')}"></label>
            <label class="field"><span>Teléfono</span><input type="tel" id="pfPhone" value="${esc(u.phone || '')}" placeholder="+503 0000-0000"></label>
            <label class="field"><span>Correo electrónico</span><input type="email" value="${esc(u.email)}" disabled></label>
            <label class="field"><span>Miembro desde</span><input type="text" value="${esc(u.since || '2026')}" disabled></label>
          </div>
          <div class="err-text" id="pfErr"></div>
          <button class="btn btn-primary btn-sm" type="submit">${ICONS.edit} Guardar cambios</button>
        </form>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="panel-title">Resumen de actividad</div>
        <div class="kv"><span class="k">Cotizaciones guardadas</span><b>${h.length}</b></div>
        <div class="kv"><span class="k">Componentes favoritos</span><b>${favs.length}</b></div>
        <div class="kv"><span class="k">Cupones utilizados</span><b>${coupons.length}</b></div>
        <div class="kv"><span class="k">Artículos en el cotizador</span><b>${State.quote.items.reduce((n, i) => n + i.qty, 0)}</b></div>
      </div>`;
    $('#profileForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#pfName').value.trim(), phone = $('#pfPhone').value.trim();
      if (name.length < 3) { $('#pfName').classList.add('invalid'); $('#pfErr').textContent = 'El nombre debe tener al menos 3 caracteres.'; return; }
      $('#pfErr').textContent = '';
      const users = State.users;
      const i = users.findIndex(x => x.email === u.email);
      if (i >= 0) { users[i] = { ...users[i], name, phone, since: users[i].since || '2026' }; State.saveUsers(users); }
      State.session = { email: u.email, name };
      renderNav(); renderAccount(); toast('Perfil actualizado', 'ok');
    });
  }

  if (ACC_TAB === 'historial') {
    panel.innerHTML = `
      <h2 style="font-size:15px;margin-bottom:12px">Historial de cotizaciones</h2>
      ${h.length ? h.map(c => `
        <div class="hist-item">
          <span class="picon" style="width:38px;height:38px">${ICONS.box}</span>
          <div style="flex:1;min-width:0">
            <div class="row" style="gap:8px;flex-wrap:wrap">
              <b class="hist-id">${esc(c.id)}</b><span class="badge">${esc(c.date)}</span>
              ${c.promo ? `<span class="badge badge-ok">${esc(c.promo)} −${c.pct}%</span>` : ''}
              <span class="tiny muted">${c.items.reduce((n, i) => n + i.qty, 0)} artículos</span>
            </div>
            <div class="tiny muted" style="margin-top:3px">${c.items.map(i => esc(i.name)).slice(0, 3).join(' · ')}${c.items.length > 3 ? ' …' : ''}</div>
          </div>
          <div style="text-align:right">
            <div class="price mono">${money(c.total)}</div>
            <div class="btn-group" style="margin-top:6px;justify-content:flex-end">
              <button class="btn btn-sm" data-hview="${esc(c.id)}">${ICONS.info} Ver</button>
              <button class="btn btn-sm" data-hload="${esc(c.id)}">${ICONS.cart} Reabrir</button>
            </div>
          </div>
        </div>`).join('') : '<div class="empty"><h3>Sin cotizaciones</h3><p class="tiny">Guarda una cotización desde el cotizador para verla aquí.</p></div>'}`;
    $$('[data-hview]', panel).forEach(b => b.addEventListener('click', () => {
      const c = h.find(x => x.id === b.dataset.hview);
      openModal(`
        <div class="modal-head"><h3>Cotización ${esc(c.id)}</h3><button class="x-btn" data-close aria-label="Cerrar">${ICONS.x}</button></div>
        <div class="modal-body">
          <div class="kv"><span class="k">Fecha</span><span>${esc(c.date)}</span></div>
          <div class="kv"><span class="k">Cliente</span><span>${esc(c.client || u.name || '—')}</span></div>
          ${c.promo ? `<div class="kv"><span class="k">Cupón</span><span>${esc(c.promo)} (−${c.pct}%)</span></div>` : ''}
          <div class="divider"></div>
          <div class="pick-list" style="max-height:none">${c.items.map(i => `
            <div class="pick" style="cursor:default"><span class="p-main"><span class="slot-name" style="display:block">${esc(i.name)}</span>
            <span class="p-sub">${i.qty} × ${money(i.price)}</span></span><span class="p-price mono">${money(i.price * i.qty)}</span></div>`).join('')}</div>
          <div class="divider"></div>
          <div class="sum-line"><span>Subtotal</span><b class="mono">${money(c.subtotal)}</b></div>
          ${c.discount ? `<div class="sum-line"><span>Descuento</span><b class="mono disc-line">−${money(c.discount)}</b></div>` : ''}
          <div class="sum-line"><span>IVA 13%</span><b class="mono">${money(c.tax || (c.total - (c.subtotal - (c.discount || 0))))}</b></div>
          <div class="sum-total"><span class="lbl muted tiny">TOTAL</span><span class="n mono">${money(c.total)}</span></div>
        </div>
        <div class="modal-foot"><button class="btn btn-sm" data-close>Cerrar</button></div>`, { size: 'modal-lg' });
    }));
    $$('[data-hload]', panel).forEach(b => b.addEventListener('click', () => {
      const c = h.find(x => x.id === b.dataset.hload);
      State.quote = { items: c.items.filter(i => byId(i.id)).map(i => ({ id: i.id, qty: i.qty })), promo: c.promo && PROMOS[c.promo] ? c.promo : null };
      renderNav(); toast('Cotización cargada en el cotizador', 'ok');
      setTimeout(() => location.href = 'cotizador.html', 600);
    }));
  }

  if (ACC_TAB === 'cupones') {
    panel.innerHTML = `
      <h2 style="font-size:15px;margin-bottom:4px">Códigos de promoción usados</h2>
      <p class="tiny muted">Se registran automáticamente al aplicarlos en el cotizador.</p>
      <div class="divider"></div>
      ${coupons.length ? coupons.map(c => `
        <div class="hist-item">
          <span class="picon" style="width:38px;height:38px;color:#86EFAC">${ICONS.tag}</span>
          <div style="flex:1"><b>${esc(c.code)}</b><div class="tiny muted">${esc(PROMOS[c.code]?.desc || 'Descuento')}</div></div>
          <span class="badge badge-ok">−${c.pct}%</span><span class="tiny muted">${esc(c.date)}</span>
        </div>`).join('') : '<div class="empty"><h3>Sin cupones usados</h3><p class="tiny">Prueba KRONOX10, EDU15 o LAUNCH50 en el cotizador.</p></div>'}
      <div class="divider"></div>
      <h3 class="section-title">Códigos disponibles</h3>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">
        ${Object.entries(PROMOS).map(([k, v]) => `<div class="card" style="padding:11px"><b>${esc(k)}</b><div class="tiny muted">${v.desc} · −${v.pct}%</div></div>`).join('')}
      </div>`;
  }

  if (ACC_TAB === 'favoritos') {
    panel.innerHTML = `
      <h2 style="font-size:15px;margin-bottom:12px">Componentes favoritos</h2>
      ${favs.length ? `<div class="fav-grid">${favs.map(productCard).join('')}</div>` : '<div class="empty"><h3>Sin favoritos</h3><p class="tiny">Toca el corazón en cualquier producto del catálogo para guardarlo aquí.</p></div>'}`;
    bindCardEvents(panel);
  }
}

function initCuenta() {
  $$('.side-nav [data-tab]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault(); ACC_TAB = b.dataset.tab; renderAccount();
  }));
  const hash = location.hash.replace('#', '');
  if (['perfil', 'historial', 'cupones', 'favoritos'].includes(hash)) ACC_TAB = hash;
  renderAccount();
}

/* ------------------------------------------------------------
   13. Arranque
   ------------------------------------------------------------ */
function boot() {
  renderNav();
  renderFooter();
  document.addEventListener('kf:nav', renderNav);
  if (PAGE === 'index') initIndex();
  if (PAGE === 'compatibilidad') initCompat();
  if (PAGE === 'cotizador') initCotizador();
  if (PAGE === 'recomendador') initRecomendador();
  if (PAGE === 'cuenta') initCuenta();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();


