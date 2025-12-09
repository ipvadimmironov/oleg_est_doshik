// Виртуальный размер игры (под ваши макеты)
const VIRTUAL_WIDTH = 1080;
const VIRTUAL_HEIGHT = 1920;

// Конфиг картинок (из папки assets/firstScreen):
// src — путь, duration — сколько мс кадр показывается (для анимаций)
const IMAGE_CONFIG = [
  { src: 'assets/firstScreen/background.png', duration: 0 },
  { src: 'assets/firstScreen/back1.png', duration: 0 },
  { src: 'assets/firstScreen/back2.png', duration: 750 },
  { src: 'assets/firstScreen/back3.png', duration: 1250 },
  // fighter 1
  { src: 'assets/firstScreen/back-selected-1-1.png', duration: 50 },
  { src: 'assets/firstScreen/back-selected-1-2.png', duration: 150 },
  { src: 'assets/firstScreen/back-selected-1-3.png', duration: 150 },
  { src: 'assets/firstScreen/back-selected-1-4.png', duration: 50 },
  { src: 'assets/firstScreen/back-selected-1-5.png', duration: 50 },
  { src: 'assets/firstScreen/back-selected-1-6.png', duration: 50 },
  { src: 'assets/firstScreen/back-selected-1-7.png', duration: 50 },
  // fighter 2
  { src: 'assets/firstScreen/back-selected-2-1.png', duration: 50 },
  { src: 'assets/firstScreen/back-selected-2-2.png', duration: 150 },
  { src: 'assets/firstScreen/back-selected-2-3.png', duration: 150 },
  { src: 'assets/firstScreen/back-selected-2-4.png', duration: 50 },
  { src: 'assets/firstScreen/back-selected-2-5.png', duration: 50 },
  { src: 'assets/firstScreen/back-selected-2-6.png', duration: 50 },
  { src: 'assets/firstScreen/back-selected-2-7.png', duration: 50 }
];

// Прямоугольники клика по бойцам в системе координат 1080x1920
// Подправите по фактическим макетам.
const FIGHTER_ZONE_TOP = {
  x1: 200,
  x2: 880,
  y1: 350,
  y2: 850
};

const FIGHTER_ZONE_BOTTOM = {
  x1: 200,
  x2: 880,
  y1: 1070,
  y2: 1570
};

let loadedImages = {};
let isImagesLoaded = false;

let currentScreen = 'select'; // 'select' | 'game'
let isAnimating = false;

// Для отслеживания свайпов
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let lastInteractionWasSwipe = false;
const SWIPE_DISTANCE_PX = 40;

function $(id) {
  return document.getElementById(id);
}

function getImageConfig(src) {
  return IMAGE_CONFIG.find((item) => item.src === src) || null;
}

function getImageDuration(src, fallbackMs) {
  const cfg = getImageConfig(src);
  return cfg ? cfg.duration : fallbackMs;
}

function resizeGameCanvas() {
  const canvas = $('game-canvas');
  const root = $('game-root');
  if (!canvas || !root) return;

  const availWidth = window.innerWidth;
  const availHeight = window.innerHeight;

  const scale = Math.min(
    availWidth / VIRTUAL_WIDTH,
    availHeight / VIRTUAL_HEIGHT
  );

  const width = VIRTUAL_WIDTH * scale;
  const height = VIRTUAL_HEIGHT * scale;

  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
}

function updateOrientationOverlay() {
  const overlay = $('orientation-overlay');
  const isLandscape = window.innerWidth > window.innerHeight;

  if (!overlay) return;

  if (isLandscape) {
    overlay.style.display = 'flex';
  } else {
    overlay.style.display = 'none';
  }
}

function preloadImages(files, onProgress, onDone) {
  let loaded = 0;
  const total = files.length;

  if (total === 0) {
    isImagesLoaded = true;
    onDone();
    return;
  }

  files.forEach((file) => {
    const img = new Image();
    img.onload = img.onerror = () => {
      loaded += 1;
      loadedImages[file.src] = img;
      if (typeof onProgress === 'function') {
        onProgress(loaded, total);
      }
      if (loaded === total) {
        isImagesLoaded = true;
        onDone();
      }
    };
    img.src = file.src;
  });
}

function showLoader(show) {
  const loader = $('loader-overlay');
  if (!loader) return;
  loader.style.display = show ? 'flex' : 'none';
}

function setScreen(name) {
  currentScreen = name;
  const select = $('screen-select');
  const game = $('screen-game');

  if (select) {
    select.classList.toggle('screen--active', name === 'select');
  }
  if (game) {
    game.classList.toggle('screen--active', name === 'game');
  }
}

function spawnSwipeBubble(virtualX) {
  const canvas = $('game-canvas');
  if (!canvas) return;

  const bubble = document.createElement('div');
  bubble.className = 'swipe-bubble';

  const text =
    Math.random() < 0.3 ? 'тыкай, а не свайпай' : 'хули свайпаешь';
  bubble.textContent = text;

  // Переводим координату в проценты и ограничиваем, чтобы не уехало за края
  const leftPercent = (virtualX / VIRTUAL_WIDTH) * 100;
  const clamped = Math.max(10, Math.min(90, leftPercent));
  bubble.style.left = clamped + '%';

  canvas.appendChild(bubble);

  bubble.addEventListener('animationend', () => {
    bubble.remove();
  });
}

function clearLayers() {
  const base = $('layer-base');
  const ov1 = $('layer-overlay-1');
  const ov2 = $('layer-overlay-2');
  [base, ov1, ov2].forEach((img) => {
    if (!img) return;
    img.removeAttribute('src');
    img.style.opacity = '0';
  });
}

function playIntroSequence() {
  clearLayers();
  const base = $('layer-base');
  const ov1 = $('layer-overlay-1');
  const ov2 = $('layer-overlay-2');

  if (!base || !ov1 || !ov2) return;

  // Сразу показываем back1
  const srcBack1 = 'assets/firstScreen/back1.png';
  const srcBack2 = 'assets/firstScreen/back2.png';
  const srcBack3 = 'assets/firstScreen/back3.png';

  base.src = srcBack1;
  base.style.opacity = '1';

  const delay2 = getImageDuration(srcBack2, 500);
  const delay3 = getImageDuration(srcBack3, 250);

  // Показ back2 через его duration
  setTimeout(() => {
    ov1.src = srcBack2;
    ov1.style.opacity = '1';
  }, delay2);

  // Показ back3 через сумму delay2 + duration back3
  setTimeout(() => {
    ov2.src = srcBack3;
    ov2.style.opacity = '1';
  }, delay2 + delay3);
}

function playFighterSelection(fighterIndex) {
  if (isAnimating) return;
  isAnimating = true;

  const ov2 = $('layer-overlay-2');
  if (!ov2) {
    isAnimating = false;
    return;
  }

  const frames = [
    `assets/firstScreen/back-selected-${fighterIndex}-1.png`,
    `assets/firstScreen/back-selected-${fighterIndex}-2.png`,
    `assets/firstScreen/back-selected-${fighterIndex}-3.png`,
    `assets/firstScreen/back-selected-${fighterIndex}-4.png`,
    `assets/firstScreen/back-selected-${fighterIndex}-5.png`,
    `assets/firstScreen/back-selected-${fighterIndex}-6.png`,
    `assets/firstScreen/back-selected-${fighterIndex}-7.png`
  ];

  let frameIndex = 0;

  function showNextFrame() {
    if (frameIndex >= frames.length) {
      // Небольшая пауза и переходим на второй экран
      setTimeout(() => {
        setScreen('game');
        isAnimating = false;
      }, 150);
      return;
    }

    const src = frames[frameIndex];
    ov2.src = src;
    ov2.style.opacity = '1';
    frameIndex += 1;

    const delay = getImageDuration(src, 150);
    setTimeout(showNextFrame, delay);
  }

  showNextFrame();
}

function isPointInRect(x, y, rect) {
  return x >= rect.x1 && x <= rect.x2 && y >= rect.y1 && y <= rect.y2;
}

function handleCanvasClick(event) {
  if (lastInteractionWasSwipe) {
    // Игнорируем синтетический клик после свайпа
    lastInteractionWasSwipe = false;
    return;
  }

  if (currentScreen !== 'select' || isAnimating) return;

  const canvas = $('game-canvas');
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const relX = event.clientX - rect.left;
  const relY = event.clientY - rect.top;

  const virtualX = (relX / rect.width) * VIRTUAL_WIDTH;
  const virtualY = (relY / rect.height) * VIRTUAL_HEIGHT;

  if (isPointInRect(virtualX, virtualY, FIGHTER_ZONE_TOP)) {
    playFighterSelection(1);
  } else if (isPointInRect(virtualX, virtualY, FIGHTER_ZONE_BOTTOM)) {
    playFighterSelection(2);
  }
}

function initGame() {
  resizeGameCanvas();
  updateOrientationOverlay();

  const canvas = $('game-canvas');
  const backButton = $('back-to-select');

  if (canvas) {
    canvas.addEventListener('click', handleCanvasClick);

    canvas.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length === 0) return;
        const t = event.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchStartTime = Date.now();
        lastInteractionWasSwipe = false;
      },
      { passive: true }
    );

    canvas.addEventListener(
      'touchend',
      (event) => {
        if (event.changedTouches.length === 0) return;
        const t = event.changedTouches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist >= SWIPE_DISTANCE_PX) {
          lastInteractionWasSwipe = true;

          const rect = canvas.getBoundingClientRect();
          const relX = t.clientX - rect.left;
          const virtualX = (relX / rect.width) * VIRTUAL_WIDTH;

          spawnSwipeBubble(virtualX);

          event.preventDefault();
        }
      },
      { passive: false }
    );
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      setScreen('select');
      isAnimating = false;
      playIntroSequence();
    });
  }

  window.addEventListener('resize', () => {
    resizeGameCanvas();
    updateOrientationOverlay();
  });

  window.addEventListener('orientationchange', () => {
    resizeGameCanvas();
    updateOrientationOverlay();
  });

  showLoader(true);

  const loaderText = $('loader-text');

  preloadImages(
    IMAGE_CONFIG,
    (loaded, total) => {
      if (loaderText) {
        loaderText.textContent = `Загрузка... ${loaded} / ${total}`;
      }
    },
    () => {
      showLoader(false);
      setScreen('select');
      playIntroSequence();
    }
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}


