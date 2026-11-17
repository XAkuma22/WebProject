/* =============================================================================
   catalog.js
   Product specs, support topics and the article search index (data + matching).
   ============================================================================= */
(() => {
  'use strict';
  const PF = window.PF;
  if (!PF || PF.redirecting) return;
  const { h, icon, norm, stem } = PF;

  const model = (name, year, tag, v) => ({ name, year, tag, v });
  const PRODUCTS = {
    fruitphone: {
      name: 'FruitPhone', href: 'fruitphone.html', img: 'fruitphone.png',
      labels: ['Display', 'Chip', 'Camera', 'Battery', 'Storage', 'Biometrics', 'Charging'],
      models: [
        model('FruitPhone Phone 17', '2025', 'Pro-level power and our brightest display yet.', ['6.3" OLED · 120 Hz', 'F5 · 6-core CPU', '48 MP dual system', 'Up to 30 hrs video playback', '256 GB – 512 GB', 'Face ID', 'USB-C · 30 W fast charge · wireless']),
        model('FruitPhone Phone 16', '2024', 'Brilliant capability, beautifully balanced for everyday use.', ['6.1" OLED · 60 Hz', 'F4 · 6-core CPU', '48 MP dual system', 'Up to 22 hrs video playback', '128 GB – 512 GB', 'Face ID', 'USB-C · 25 W fast charge · wireless']),
        model('FruitPhone Phone 15', '2023', 'The milestone FruitPhone featuring universal USB-C.', ['6.1" OLED · 60 Hz', 'F3 · 6-core CPU', '48 MP main + ultra-wide', 'Up to 20 hrs video playback', '128 GB – 512 GB', 'Face ID', 'USB-C · 20 W fast charge · wireless']),
        model('FruitPhone Phone 14', '2022', 'Dependable performance that delivers incredible value.', ['6.1" OLED · 60 Hz', 'F2 · 6-core CPU', '12 MP dual system', 'Up to 20 hrs video playback', '128 GB – 512 GB', 'Face ID', 'FruitPort connector · 20 W fast charge'])
      ]
    },
    fruitmac: {
      name: 'FruitMac', href: 'fruitmac.html', img: 'fruitmac.png',
      labels: ['Display', 'Chip', 'Memory', 'Storage', 'Power', 'Ports'],
      models: [
        model('FruitMac Pro 16', '2026', 'Mind-blowing performance engineered for pros who push the limits.', ['16.2" mini-LED · 120 Hz', 'M-series Max · 14-core CPU', '36 GB – 128 GB', '512 GB – 8 TB', 'Up to 22 hrs battery', 'USB-C ×3 · HDMI · SD card · MagCharge']),
        model('FruitMac Air 16', '2025', 'Expansive screen space meets astonishing thinness and speed.', ['15.3" LED · 60 Hz', 'M-series · 10-core CPU', '16 GB – 32 GB', '256 GB – 2 TB', 'Up to 18 hrs battery', 'USB-C ×2 · MagCharge']),
        model('FruitMac Pro 15', '2024', 'Uncompromised pro power packed into a remarkably portable frame.', ['13.6" LED · 60 Hz', 'M-series · 8-core CPU', '16 GB – 24 GB', '256 GB – 2 TB', 'Up to 18 hrs battery', 'USB-C ×2 · MagCharge']),
        model('FruitMac Air 15', '2024', 'A versatile powerhouse designed to handle any workflow effortlessly.', ['Supports up to 3 displays', 'M-series · 10-core CPU', '16 GB – 64 GB', '256 GB – 8 TB', 'Plug-in · low-power design', 'USB-C ×4 · HDMI · Ethernet'])
      ]
    },
    fruitpad: {
      name: 'FruitPad', href: 'fruitpad.html', img: 'fruitpad.png',
      labels: ['Display', 'Chip', 'Storage', 'Camera', 'Battery', 'Connectivity'],
      models: [
        model('FruitPad Pro 16', '2025', 'Groundbreaking performance and our absolute thinnest design.', ['13" OLED · 120 Hz', 'M-series · 9-core CPU', '256 GB – 2 TB', '12 MP + depth scanner', 'Up to 10 hrs', 'Wi-Fi 7 · optional 5G']),
        model('FruitPad Air 16', '2025', 'Remarkably thin, light, and packed with serious capability.', ['11" LED · 60 Hz', 'F4X · 8-core CPU', '128 GB – 1 TB', '12 MP wide', 'Up to 10 hrs', 'Wi-Fi 6E · optional 5G']),
        model('FruitPad Pro 15', '2024', 'The essential FruitPad experience with powerful everyday versatility.', ['10.9" LED · 60 Hz', 'F3 · 6-core CPU', '64 GB – 256 GB', '12 MP wide', 'Up to 10 hrs', 'Wi-Fi 6 · optional 5G']),
        model('FruitPad Air 15', '2024', 'Big capabilities and pocket-friendly power wrapped in a portable design.', ['8.3" LED · 60 Hz', 'F4 · 6-core CPU', '128 GB – 512 GB', '12 MP wide', 'Up to 10 hrs', 'Wi-Fi 6E · optional 5G'])
      ]
    },
    fruitwatch: {
      name: 'FruitWatch', href: 'fruitwatch.html', img: 'fruitwatch.png',
      labels: ['Display', 'Case', 'Sensors', 'Battery', 'Water resistance', 'Connectivity'],
      models: [
       model('FruitWatch Series 4', '2026', 'Our ultimate sports and adventure companion.', ['49 mm · 3000-nit always-on', 'Titanium', 'ECG · blood oxygen · depth · temperature', 'Up to 72 hrs low-power mode', '100 m · dive rated', 'Dual-frequency GPS · cellular']),
        model('FruitWatch Series 3', '2025', 'Advanced health insights and a brilliant display.', ['46 / 42 mm · 2000-nit always-on', 'Aluminum', 'ECG · blood oxygen · temperature', 'Up to 24 hrs', '50 m', 'GPS · optional cellular']),
        model('FruitWatch Series 2', '2024', 'Sleek design with an expansive, bright screen.', ['46 / 42 mm · 1000-nit always-on', 'Aluminum', 'ECG · blood oxygen', 'Up to 18 hrs', '50 m', 'GPS · optional cellular']),
        model('FruitWatch Series 1', '2023', 'Essential health, fitness, and safety features.', ['44 / 40 mm', 'Aluminum', 'Heart rate · fall detection', 'Up to 18 hrs', '50 m', 'GPS · optional cellular'])
      ]
    },
    fruitpods: {
      name: 'FruitPods', href: 'fruitpods.html', img: 'fruitpods.png',
      labels: ['Audio', 'Noise control', 'Chip', 'Battery', 'Water resistance', 'Connectivity'],
      models: [
        model('FruitPods Ear 4', '2025', 'Our most advanced acoustic engineering with industry-leading noise control.', ['Adaptive EQ · spatial audio', 'Active noise cancellation + Transparency', 'F-H3', 'Up to 8 hrs (30 with case)', 'IP57 sweat and water resistant', 'Bluetooth 5.4']),
        model('FruitPods Ear 3', '2024', 'All-day open-fit comfort paired with crisp, immersive sound.', ['Spatial audio', 'Active noise cancellation', 'F-H2', 'Up to 5 hrs (30 with case)', 'IP54', 'Bluetooth 5.3']),
        model('FruitPods Ear 2', '2024', 'Breathtaking over-ear high fidelity designed for pure audio immersion.', ['40 mm drivers · spatial audio', 'Active noise cancellation', 'F-H2 ×2', 'Up to 20 hrs', 'Splash resistant', 'Bluetooth 5.3']),
        model('FruitPods Ear 1', '2022', 'The classic, comfortable everyday earbuds tuned for stellar sound.', ['Spatial audio', 'Transparency mode', 'F-H1', 'Up to 6 hrs (30 with case)', 'IP54', 'Bluetooth 5.0'])
      ]
    }
  };

  const TOPICS = [
    { id: 'battery', icon: 'battery', short: 'Battery', title: 'Battery & Charging Problems', articles: [
      { title: 'If your FruitPhone battery is draining too fast', desc: 'Learn how to maximize battery life and diagnose sudden power drops.', href: 'articlebattery.html', keywords: 'battery drain draining power low usage' },
      { title: "If your FruitPhone won't charge or turn on", desc: 'Steps to take if your device is unresponsive when plugged into power.', href: 'articlebattery.html#charging', keywords: 'charge charging cable adapter dead turn on power restart' }
    ] },
    { id: 'security', icon: 'lock', short: 'Security', title: 'Passcode & Security Issues', articles: [
      { title: 'If you forgot your FruitPhone passcode', desc: 'How to put your device in recovery mode to erase and set it up again.', href: 'articlepasscode.html', keywords: 'passcode password forgot locked disabled recovery restore erase' }
    ] },
    { id: 'biometrics', icon: 'scan', short: 'Touch ID & Face ID', title: 'Touch ID & Face ID Issues', articles: [
      { title: "If your Touch ID or Face ID isn't working", desc: 'How to troubleshoot Touch ID or Face ID not recognizing your fingerprint or face.', href: 'articletouch.html', keywords: 'touch id face id fingerprint biometric unlock sensor camera' }
    ] },
    { id: 'network', icon: 'wifi', short: 'Wi-Fi & Network', title: 'Wi-Fi & Network Issues', articles: [
      { title: "If you're having trouble connecting to Wi-Fi", desc: 'How to troubleshoot common Wi-Fi connectivity issues.', href: 'articlenetwork.html', keywords: 'wifi wi fi wireless network internet router connection offline' }
    ] }
  ];

  /* ---------- Shared article search ---------------------------------------- */
  const STOP = new Set(['the', 'and', 'how', 'can', 'you', 'why', 'with', 'what', 'have', 'has', 'does', 'for', 'are', 'this', 'that', 'help', 'not', 'my', 'is', 'it', 'on', 'to', 'me', 'am', 'its', 'when']);
  const CATALOG = TOPICS.flatMap((t) => t.articles.map((a) => Object.assign({}, a, { topic: t, haystack: norm([a.title, a.desc, a.keywords, t.title].join(' ')) })));

  function matchArticles(text, limit = 4) {
    const terms = norm(text).split(' ').filter((w) => w.length > 1 && !STOP.has(w)).map(stem);
    if (!terms.length) return [];
    return CATALOG
      .map((c) => ({ c, score: terms.filter((t) => c.haystack.includes(t)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.c);
  }

  function articleCard(a, large) {
    const tile = h('span', { class: 'rec-card__tile', html: icon(a.topic.icon, large ? 28 : 40) });
    const body = large
      ? h('span', { class: 'rec-card__body' }, h('span', { class: 'rec-card__title' }, a.title), h('span', { class: 'rec-card__meta' }, a.topic.title), h('span', { class: 'rec-card__desc' }, a.desc))
      : [h('span', { class: 'rec-card__title' }, a.title), h('span', { class: 'rec-card__meta' }, a.topic.title)];
    return h('li', {}, h('a', { class: 'rec-card' + (large ? ' rec-card--lg' : ''), href: a.href }, tile, body));
  }

  Object.assign(PF, { PRODUCTS, TOPICS, CATALOG, matchArticles, articleCard });
})();
