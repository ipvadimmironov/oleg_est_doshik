(function () {
  function withCacheBust2(path) {
    // Кеширование снова включено — просто возвращаем путь.
    return path;
  }

  function createImage(src, className) {
    const img = document.createElement('img');
    img.src = withCacheBust2(src);
    img.className = className;
    img.alt = '';
    return img;
  }

  function setImageSrc(img, path) {
    img.src = withCacheBust2(path);
  }

  function initSecondScreen() {
    const screen = document.getElementById('screen-game');
    if (!screen) return;

    // Чтобы инициализировать только один раз
    if (screen.dataset.initialized === '1') return;
    screen.dataset.initialized = '1';

    screen.classList.add('second-screen');

    const layout = document.createElement('div');
    layout.className = 'second-layout';
    screen.appendChild(layout);

    // Верхняя полоска с «жизнями»
    const topbar = document.createElement('div');
    topbar.className = 'second-topbar';

    const topbarLeft = document.createElement('div');
    topbarLeft.className = 'second-topbar-left';

    const topbarRight = document.createElement('div');
    topbarRight.className = 'second-topbar-right';

    topbar.appendChild(topbarLeft);
    topbar.appendChild(topbarRight);

    layout.appendChild(topbar);

    const leftIcons = [];
    const rightIcons = [];

    for (let i = 0; i < 5; i++) {
      const li = createImage(
        'assets/secondScreen/l-f.png',
        'second-topbar-icon'
      );
      leftIcons.push(li);
      topbarLeft.appendChild(li);
    }

    for (let i = 0; i < 5; i++) {
      const ri = createImage(
        'assets/secondScreen/r-f.png',
        'second-topbar-icon'
      );
      rightIcons.push(ri);
      topbarRight.appendChild(ri);
    }

    // Полоски прогресса под верхней полосой
    const progressRow = document.createElement('div');
    progressRow.className = 'second-progress-row';

    const progressLeft = document.createElement('div');
    progressLeft.className = 'second-progress second-progress--left';
    const progressLeftInner = document.createElement('div');
    progressLeftInner.className = 'second-progress__inner';
    progressLeft.appendChild(progressLeftInner);

    const progressRight = document.createElement('div');
    progressRight.className = 'second-progress second-progress--right';
    const progressRightInner = document.createElement('div');
    progressRightInner.className = 'second-progress__inner';
    progressRight.appendChild(progressRightInner);

    progressRow.appendChild(progressLeft);
    progressRow.appendChild(progressRight);

    layout.appendChild(progressRow);

    const leftImg = createImage(
      'assets/secondScreen/L-1.png',
      'second-slot second-slot--left'
    );

    const rightImg = createImage(
      'assets/secondScreen/R-1.png',
      'second-slot second-slot--right'
    );

    const bottomImg = createImage(
      'assets/secondScreen/B-1.png',
      'second-slot second-slot--bottom'
    );

    layout.appendChild(leftImg);
    layout.appendChild(rightImg);
    layout.appendChild(bottomImg);

    // ----- Игровая логика -----
    const MAX_SCORE = 50;
    let playerScore = 0;
    let cpuScore = 0;
    let gameOver = false;

    let cpuTimer = null; // таймер очков CPU
    let playerAnimTimer = null;
    let cpuAnimTimer = null;
    let playerStopTimeout = null;
    let playerFrameIndex = 0;
    let cpuFrameIndex = 0;

    let buttonState = 0; // 0 -> b-1, 1 -> b-2

    const BUTTON_FRAMES = [
      'assets/secondScreen/B-1.png',
      'assets/secondScreen/B-2.png'
    ];

    const LEFT_FRAMES = [
      'assets/secondScreen/L-1.png',
      'assets/secondScreen/L-2.png',
      'assets/secondScreen/L-3.png'
    ];

    const RIGHT_FRAMES = [
      'assets/secondScreen/R-1.png',
      'assets/secondScreen/R-2.png',
      'assets/secondScreen/R-3.png'
    ];

    const LEFT_WIN = 'assets/secondScreen/L-pobeda.png';
    const RIGHT_WIN = 'assets/secondScreen/R-pobeda.png';
    const BUTTON_WIN = 'assets/secondScreen/B-Pobeda.png';

    // 1 - левый герой выбран на первом экране, 2 - правый; по умолчанию 1
    const selectedFighter = window.selectedFighter || 1;
    const playerIsLeft = selectedFighter === 1;

    const playerImgEl = playerIsLeft ? leftImg : rightImg;
    const cpuImgEl = playerIsLeft ? rightImg : leftImg;

    const playerFrames = playerIsLeft ? LEFT_FRAMES : RIGHT_FRAMES;
    const cpuFrames = playerIsLeft ? RIGHT_FRAMES : LEFT_FRAMES;

    const playerWinSrc = playerIsLeft ? LEFT_WIN : RIGHT_WIN;
    const cpuWinSrc = playerIsLeft ? RIGHT_WIN : LEFT_WIN;

    // Адаптивная скорость компьютера
    let cpuIntervalMs = 2000;
    let cpuSpeedMode = null; // 'slower' | 'equal' | 'faster'
    let lastPlayerClickTime = null;
    let playerIntervalSum = 0;
    let playerIntervalCount = 0;

    function restartCpuTimer() {
      if (cpuTimer) {
        clearInterval(cpuTimer);
        cpuTimer = null;
      }
      cpuTimer = setInterval(() => {
        addCpuPoint();
      }, cpuIntervalMs);
    }

    const SEGMENT_POINTS = MAX_SCORE / 5; // 2 очка на один «жетон»

    const playerIcons = playerIsLeft ? leftIcons : rightIcons;
    const cpuIcons = playerIsLeft ? rightIcons : leftIcons;

    const playerProgressInner = playerIsLeft
      ? progressLeftInner
      : progressRightInner;
    const cpuProgressInner = playerIsLeft
      ? progressRightInner
      : progressLeftInner;

    function updateSideProgress(score, icons, progressInner) {
      const remainingSegments = Math.max(
        0,
        Math.ceil((MAX_SCORE - score) / SEGMENT_POINTS)
      ); // 5..0

      icons.forEach((icon, index) => {
        icon.style.visibility = index < remainingSegments ? 'visible' : 'hidden';
      });

      const pointsIntoSegment = score % SEGMENT_POINTS;
      const percentUsed = (pointsIntoSegment / SEGMENT_POINTS) * 100;
      const percentRemaining = 100 - percentUsed;
      progressInner.style.width = `${percentRemaining}%`;
    }

    function startPlayerAnimation() {
      if (playerAnimTimer || gameOver) return;
      playerAnimTimer = setInterval(() => {
        playerFrameIndex = (playerFrameIndex + 1) % playerFrames.length;
        setImageSrc(playerImgEl, playerFrames[playerFrameIndex]);
      }, 200);
    }

    function stopPlayerAnimation() {
      if (!playerAnimTimer) return;
      clearInterval(playerAnimTimer);
      playerAnimTimer = null;
    }

    function resetPlayerIdleTimeout() {
      if (playerStopTimeout) {
        clearTimeout(playerStopTimeout);
      }
      playerStopTimeout = setTimeout(() => {
        stopPlayerAnimation();
        playerStopTimeout = null;
      }, 1500);
    }

    function startCpuAnimation() {
      if (cpuAnimTimer) return;
      cpuAnimTimer = setInterval(() => {
        cpuFrameIndex = (cpuFrameIndex + 1) % cpuFrames.length;
        setImageSrc(cpuImgEl, cpuFrames[cpuFrameIndex]);
      }, 200);
    }

    function stopCpuAnimation() {
      if (!cpuAnimTimer) return;
      clearInterval(cpuAnimTimer);
      cpuAnimTimer = null;
    }

    let endModal = null;
    let endOverlayClickHandler = null;
    let allowManualEndModal = false;

    function openEndModal() {
      if (endModal) {
        endModal.style.display = 'flex';
        return;
      }

      const screenEl = document.getElementById('screen-game');
      if (!screenEl) return;

      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.inset = '0';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'flex-start';
      overlay.style.justifyContent = 'center';
      overlay.style.zIndex = '200';

      const box = document.createElement('div');
      box.style.backgroundColor = '#121c2e';
      box.style.border = '2px solid #fff';
      box.style.borderRadius = '12px';
      box.style.padding = '24px 16px';
      box.style.minWidth = '260px';
      box.style.maxWidth = '320px';
      box.style.display = 'flex';
      box.style.flexDirection = 'column';
      box.style.gap = '12px';
      box.style.color = '#fff';
      box.style.fontFamily =
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      box.style.textAlign = 'center';
      box.style.marginTop = '400px';

      function makeButton(label) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.style.padding = '10px 14px';
        btn.style.borderRadius = '999px';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '14px';
        btn.style.backgroundColor = '#1f6feb';
        btn.style.color = '#fff';
        btn.style.whiteSpace = 'normal';
        btn.style.wordBreak = 'keep-all';
        btn.addEventListener('click', (e) => e.stopPropagation());
        return btn;
      }

      const btnCourse = makeButton('Курс GO Прорвёмся');
      btnCourse.addEventListener('click', () => {
        window.open('https://clck.ru/3QgbhP', '_blank');
      });

      const btnBought = makeButton('Я уже купил курс');
      btnBought.addEventListener('click', () => {
        // У обоих персонажей победная картинка
        setImageSrc(leftImg, LEFT_WIN);
        setImageSrc(rightImg, RIGHT_WIN);

        // Полностью останавливаем анимации и таймеры до следующей игры
        stopPlayerAnimation();
        stopCpuAnimation();
        if (cpuTimer) {
          clearInterval(cpuTimer);
          cpuTimer = null;
        }

        overlay.style.display = 'none';
      });

      const btnAuthor = makeButton('Автор игры: Вадим Миронов');
      btnAuthor.addEventListener('click', () => {
        window.open('https://t.me/ipVadimMironov', '_blank');
      });

      const btnAgain = makeButton('Играть ещё');
      btnAgain.addEventListener('click', () => {
        overlay.style.display = 'none';
        if (window.backToSelect) {
          window.backToSelect();
        } else {
          window.location.reload();
        }
      });

      box.appendChild(btnCourse);
      box.appendChild(btnBought);
      box.appendChild(btnAuthor);
      box.appendChild(btnAgain);

      overlay.appendChild(box);
      screenEl.appendChild(overlay);

      endModal = overlay;
    }

    function enableEndOverlayClick() {
      const screenEl = document.getElementById('screen-game');
      if (!screenEl || endOverlayClickHandler) return;

      endOverlayClickHandler = () => {
        if (allowManualEndModal) {
          openEndModal();
        }
      };
      screenEl.addEventListener('click', endOverlayClickHandler);
    }

    function finishGame(winner) {
      if (gameOver) return;
      gameOver = true;

      if (cpuTimer) {
        clearInterval(cpuTimer);
        cpuTimer = null;
      }

      if (playerStopTimeout) {
        clearTimeout(playerStopTimeout);
        playerStopTimeout = null;
      }

      if (winner === 'player') {
        // У игрока — победный кадр, у компьютера анимация продолжается
        stopPlayerAnimation();
        setImageSrc(playerImgEl, playerWinSrc);
      } else if (winner === 'cpu') {
        // У компьютера победный кадр, у игрока фиксируется текущий
        stopCpuAnimation();
        setImageSrc(cpuImgEl, cpuWinSrc);
        stopPlayerAnimation();
      }

      setImageSrc(bottomImg, BUTTON_WIN);

      // Сначала ждём 3 секунды и автоматически показываем модалку,
      // а уже после этого разрешаем ручной вызов по клику.
      enableEndOverlayClick();
      setTimeout(() => {
        openEndModal();
        allowManualEndModal = true;
      }, 3000);
    }

    function addPlayerPoint() {
      if (gameOver) return;
      playerScore += 1;
      updateSideProgress(playerScore, playerIcons, playerProgressInner);
      if (playerScore >= MAX_SCORE) {
        finishGame('player');
      }
    }

    function addCpuPoint() {
      if (gameOver) return;
      cpuScore += 1;
      updateSideProgress(cpuScore, cpuIcons, cpuProgressInner);
      if (cpuScore >= MAX_SCORE) {
        finishGame('cpu');
      }
    }

    function toggleButtonFrame() {
      if (gameOver) return;
      buttonState = buttonState === 0 ? 1 : 0;
      setImageSrc(bottomImg, BUTTON_FRAMES[buttonState]);
    }

    // Смена кадров у компьютера всегда идёт с частотой 200 мс
    startCpuAnimation();

    // Инициализируем прогресс-бары и иконки
    updateSideProgress(playerScore, playerIcons, playerProgressInner);
    updateSideProgress(cpuScore, cpuIcons, cpuProgressInner);

    // Тап по кнопке — очко игроку, старт/продление анимации игрока
    bottomImg.style.cursor = 'pointer';
    bottomImg.addEventListener('click', () => {
      if (gameOver) return;

      const now = Date.now();
      if (lastPlayerClickTime !== null) {
        const dt = now - lastPlayerClickTime;
        if (dt > 50 && dt < 10000) {
          playerIntervalSum += dt;
          playerIntervalCount += 1;

          if (!cpuSpeedMode && playerIntervalCount >= 2) {
            const avg = playerIntervalSum / playerIntervalCount;
            const r = Math.random();
            let factor;

            if (r < 0.3) {
              factor = 1.3; // медленнее
              cpuSpeedMode = 'slower';
            } else if (r < 0.6) {
              factor = 1.0; // такой же
              cpuSpeedMode = 'equal';
            } else {
              factor = 0.7; // быстрее
              cpuSpeedMode = 'faster';
            }

            cpuIntervalMs = Math.max(150, Math.min(4000, avg * factor));
            restartCpuTimer();
          }
        }
      }
      lastPlayerClickTime = now;

      toggleButtonFrame();
      addPlayerPoint();
      startPlayerAnimation();
      resetPlayerIdleTimeout();
    });

    // Очки компьютеру — с адаптивным интервалом
    restartCpuTimer();
  }

  // Экспортируем глобально, чтобы дергать из game.js
  window.initSecondScreen = initSecondScreen;

  // На случай, если подключат файл сразу и экран уже активен
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSecondScreen);
  } else {
    initSecondScreen();
  }
})();


