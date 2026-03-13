const TRANSPARENCY_THRESHOLD = 0.1;

const track = document.querySelector(".carousel-track");
const rooms = document.querySelectorAll(".img-text");
const btnLeft = document.querySelector(".arrow-left");
const btnRight = document.querySelector(".arrow-right");
const timerElement = document.getElementById("timer");
const firstScreen = document.getElementById("first-screen");
const startScreen = document.getElementById("start-screen");
const difficultyButtons = document.querySelectorAll(".difficulty-button");
const carousel = document.getElementById("carousel");
const gameOverScreen = document.getElementById("game-over");
const gameOverMessage = document.getElementById("game-over-message");
const restartButton = document.getElementById("restart-button");
const backButton = document.getElementById("back-button");
const menuButton = document.getElementById("menu-button");
const pauseMenu = document.getElementById("pause-menu");
const resumeButton = document.getElementById("resume-button");
const quitButton = document.getElementById("quit-button");

/* =========================
   VARIABLES GLOBALES JEU
========================= */

let index = 0;
let timeLeft = 120;
let monsterCount = 0;
let timerInterval = null;
let monsterInterval = null;
let glitchInterval = null;
let timestampInterval = null;
let doorInterval = null;
let masterVolume = 0.5;
let musicVolume = 0.5;
let clickVolume = 0.5;
let settingsFromFirst = false;
let sensitivity = 5;

/* =========================
   VOLUME HELPER
========================= */

const BASE_VOLUMES = {
  "ambiance-music": 1.0,
  "first-screen-music": 0.9,
  "win-sound": 1.0,
  "wiiin-sound": 0.3,
  "dead-sound": 1.0,
  "iiii-sound": 0.6,
  "time-sound": 1.0,
  "monster-glitch-sound": 0.9,
  "r-door-sound": 1.0,
  "l-door-sound": 1.0,
  "hover-sound": 0.8,
  "clicking-sound": 0.8,
  "camera-sound": 0.7,
  "missed-sound": 0.6,
  "loading-sound": 0.4,
};

function getVolume(id) {
  const base = BASE_VOLUMES[id] ?? 0.5;
  const el = document.getElementById(id);
  if (!el) return 0;
  const isMusicClass = el.classList.contains("sound-music");
  const isClickClass = el.classList.contains("sound-click");
  if (isMusicClass) return Math.min(1, masterVolume * musicVolume * base);
  if (isClickClass) return Math.min(1, masterVolume * clickVolume * base);
  return Math.min(1, masterVolume * base);
}

function applyVolumes() {
  Object.keys(BASE_VOLUMES).forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.volume = getVolume(id);
  });
}

/* =========================
   STOP ALL SOUNDS
========================= */

function stopAllSounds() {
  document.querySelectorAll("audio:not(#first-screen-music)").forEach((el) => {
    el.pause();
    el.currentTime = 0;
  });
}

function stopEverything() {
  clearIntervals();
  document.querySelectorAll("audio").forEach((el) => {
    el.pause();
    el.currentTime = 0;
  });
}

/* =========================
   MUSIQUE PREMIER ECRAN
========================= */

let firstMusicStarted = false;

function stopFirstScreenMusic() {
  const music = document.getElementById("first-screen-music");
  music.pause();
  music.currentTime = 0;
}

function playFirstScreenMusic() {
  const music = document.getElementById("first-screen-music");
  music.volume = getVolume("first-screen-music");
  music.play().catch(() => {
    document.addEventListener(
      "click",
      () => {
        music
          .play()
          .catch((err) => console.log("Erreur first-screen-music:", err));
      },
      { once: true },
    );
  });
}

document.addEventListener(
  "click",
  () => {
    if (!firstMusicStarted) {
      firstMusicStarted = true;
      playFirstScreenMusic();
    }
  },
  { once: true },
);

playFirstScreenMusic();

/* =========================
   CAROUSEL
========================= */

function updateCarousel() {
  track.style.transform = `translateX(-${index * 100}%)`;
}

/* =========================
   TIMER
========================= */

let timeAlertPlayed = false;

function updateTimer() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timerElement.textContent =
    minutes + ":" + seconds.toString().padStart(2, "0");

  if (timeLeft <= 30 && !timeAlertPlayed) {
    const timeSound = document.getElementById("time-sound");
    timeSound.currentTime = 0;
    timeSound.volume = getVolume("time-sound");
    timeSound.play().catch((err) => console.log("Erreur time-sound:", err));
    timeAlertPlayed = true;
  }

  if (timeLeft > 0) {
    timeLeft--;
  } else {
    endGame(true);
  }
}

/* =========================
   GESTION DES INTERVALS
========================= */

function clearIntervals() {
  clearInterval(timerInterval);
  clearInterval(monsterInterval);
  clearInterval(glitchInterval);
  clearInterval(timestampInterval);
  clearInterval(doorInterval);
  clearInterval(objectInterval);
}

function startIntervals() {
  timerInterval = setInterval(updateTimer, 1000);
  monsterInterval = setInterval(spawnMonster, 10000);

  const doorSounds = ["r-door-sound", "l-door-sound"];
  let doorPlayCount = { "r-door-sound": 0, "l-door-sound": 0 };

  function playRandomDoor() {
    const notEnough = doorSounds.filter((id) => doorPlayCount[id] < 2);
    const pool = notEnough.length > 0 ? notEnough : doorSounds;
    const randomId = pool[Math.floor(Math.random() * pool.length)];
    const sound = document.getElementById(randomId);
    sound.currentTime = 0;
    sound.volume = getVolume(randomId);
    sound.play().catch((err) => console.log("Erreur door-sound:", err));
    doorPlayCount[randomId]++;
  }

  doorInterval = setInterval(playRandomDoor, 25000);
}

/* =========================
   SPAWN DES MONSTRES
========================= */

let monsterQueue = [];
let lastSpawnedMonster = null;

function buildMonsterQueue() {
  const allMonsters = Array.from(document.querySelectorAll(".monster-parent"));

  for (let i = allMonsters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allMonsters[i], allMonsters[j]] = [allMonsters[j], allMonsters[i]];
  }

  if (
    lastSpawnedMonster !== null &&
    allMonsters[0] === lastSpawnedMonster &&
    allMonsters.length > 1
  ) {
    [allMonsters[0], allMonsters[1]] = [allMonsters[1], allMonsters[0]];
  }

  monsterQueue = allMonsters;
}

function spawnMonster() {
  if (monsterQueue.length === 0) buildMonsterQueue();

  let attempts = 0;
  while (monsterQueue.length > 0 && attempts < monsterQueue.length) {
    const monster = monsterQueue.shift();

    if (monster.classList.contains("visible")) {
      monsterQueue.push(monster);
      attempts++;
      continue;
    }

    monster.classList.add("visible");
    monster.style.opacity = "1";
    lastSpawnedMonster = monster;
    monsterCount++;

    if (monsterCount >= 4) {
      endGame(false);
    }
    return;
  }
}

/* =========================
   DETECTION MONSTRE SOUS LE CURSEUR
   Les monstres ont pointer-events: none TOUJOURS.
   On detecte manuellement le pixel alpha du PNG.
========================= */

const monsterRegistry = [];

function setupMonsterClickTransparency(monsterImg) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = monsterImg.src;

  img.onload = () => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    monsterRegistry.push({ el: monsterImg, canvas, ctx });
  };
}

function hitTest(e) {
  const x = e.clientX,
    y = e.clientY;
  monsterRegistry.forEach(({ el, canvas, ctx }) => {
    const r = el.getBoundingClientRect();
    if (x < r.left || x > r.right || y < r.top || y > r.bottom) {
      el.style.pointerEvents = "auto";
      return;
    }
    const px = Math.floor(((x - r.left) * canvas.width) / r.width);
    const py = Math.floor(((y - r.top) * canvas.height) / r.height);
    const alpha = ctx.getImageData(px, py, 1, 1).data[3] / 255;

    if (alpha <= TRANSPARENCY_THRESHOLD) {
      el.style.pointerEvents = "none";
    } else {
      el.style.pointerEvents = "auto";
    }
  });
}

if (window.PointerEvent) {
  document.addEventListener("pointermove", hitTest, { passive: true });
  document.addEventListener("pointerdown", hitTest, { passive: true });
} else {
  document.addEventListener("touchmove", hitTest, { passive: true });
  document.addEventListener("touchstart", hitTest, { passive: true });
}

function getVisibleMonsterAtPoint(cx, cy) {
  const visibleMonsters = Array.from(
    document.querySelectorAll(".monster-parent.visible"),
  );

  for (const monster of visibleMonsters) {
    const rect = monster.getBoundingClientRect();

    if (
      cx < rect.left ||
      cx > rect.right ||
      cy < rect.top ||
      cy > rect.bottom
    ) {
      continue;
    }

    const canvas = document.createElement("canvas");
    canvas.width = monster.naturalWidth;
    canvas.height = monster.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(monster, 0, 0);

    const x = Math.floor(
      ((cx - rect.left) / rect.width) * monster.naturalWidth,
    );
    const y = Math.floor(
      ((cy - rect.top) / rect.height) * monster.naturalHeight,
    );

    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      if (pixel[3] >= 25) return monster;
    } catch {
      return monster;
    }
  }

  return null;
}

/* =========================
   BLACKOUT HELPER
========================= */

function createBlackout(fadeIn, callback) {
  const blackout = document.createElement("div");
  blackout.style.cssText = `
    position: fixed;
    inset: 0;
    background: black;
    z-index: 9999;
    opacity: ${fadeIn ? "0" : "1"};
    transition: opacity 1s ease;
    pointer-events: none;
    overflow: hidden;
  `;

  const scanLine = document.createElement("div");
  scanLine.style.cssText = `
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
    animation: blackout-scan 1.2s linear infinite;
    opacity: 0.5;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes blackout-scan {
      0% { top: -2px; }
      100% { top: 100%; }
    }
  `;

  document.head.appendChild(style);
  blackout.appendChild(scanLine);
  document.body.appendChild(blackout);

  requestAnimationFrame(() => {
    blackout.style.opacity = fadeIn ? "1" : "0";
  });

  setTimeout(() => {
    blackout.remove();
    style.remove();
    if (callback) callback();
  }, 1200);
}

/* =========================
   LOADING BAR
========================= */

const loadingBar = document.createElement("div");
loadingBar.style.cssText = `
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  width: 80px;
  height: 7px;
  background: rgba(0, 255, 65, 0.2);
  border: 1px solid rgba(0, 255, 65, 0.4);
  display: none;
  overflow: hidden;
`;
const loadingFill = document.createElement("div");
loadingFill.style.cssText = `
  height: 100%;
  width: 0%;
  background: #00ff41;
  box-shadow: 0 0 6px #00ff41, 0 0 12px rgba(0,255,65,0.5);
`;
loadingBar.appendChild(loadingFill);
document.body.appendChild(loadingBar);

function moveBar(cx, cy) {
  loadingBar.style.left = cx - 40 + "px";
  loadingBar.style.top = cy + 35 + "px";
}

/* =========================
   CAROUSEL MOUSEDOWN UNIFIE
   - Pixel opaque monstre  => hold 2s pour eliminer
   - Fond / transparent    => hold 2s pour croix rouge
========================= */

document.getElementById("carousel").addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (e.target.closest("button, #timer, .text, .text-battery")) return;

  const startCx = e.clientX;
  const startCy = e.clientY;
  const hitMonster = getVisibleMonsterAtPoint(startCx, startCy);

  if (hitMonster) {
    /* ── CAS 1 : monstre trouve ── */
    let isHolding = true;

    moveBar(startCx, startCy);
    loadingBar.style.display = "block";
    loadingFill.style.transition = "none";
    loadingFill.style.width = "0%";

    const loadingSound = document.getElementById("loading-sound");
    loadingSound.currentTime = 0;
    loadingSound.volume = getVolume("loading-sound");
    loadingSound
      .play()
      .catch((err) => console.log("Erreur loading-sound:", err));

    requestAnimationFrame(() => {
      loadingFill.style.transition = "width 2000ms linear";
      loadingFill.style.width = "100%";
    });

    function onMove(ev) {
      if (!isHolding) return;
      moveBar(ev.clientX, ev.clientY);
    }

    function cancelHold() {
      if (!isHolding) return;
      isHolding = false;
      clearTimeout(holdTimeout);
      loadingFill.style.transition = "none";
      loadingFill.style.width = "0%";
      loadingBar.style.display = "none";
      loadingSound.pause();
      loadingSound.currentTime = 0;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", cancelHold);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", cancelHold);

    const holdTimeout = setTimeout(() => {
      if (!isHolding) return;
      isHolding = false;

      hitMonster.classList.remove("visible");
      hitMonster.style.opacity = "0";
      monsterCount--;
      if (monsterCount < 0) monsterCount = 0;

      loadingFill.style.transition = "none";
      loadingFill.style.width = "0%";
      loadingBar.style.display = "none";
      loadingSound.pause();
      loadingSound.currentTime = 0;

      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", cancelHold);

      carousel.classList.add("screen-glitch");

      const scanEl = document.createElement("div");
      scanEl.className = "screen-glitch-scan";
      carousel.appendChild(scanEl);

      const lineEl = document.createElement("div");
      lineEl.className = "screen-glitch-line";
      carousel.appendChild(lineEl);

      const glitchVideo = document.createElement("video");
      glitchVideo.src = "glitch1.mp4";
      glitchVideo.autoplay = true;
      glitchVideo.muted = true;
      glitchVideo.style.cssText = `
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.3;
        z-index: 102;
        pointer-events: none;
      `;
      carousel.appendChild(glitchVideo);

      const glitchSound = document.getElementById("monster-glitch-sound");
      glitchSound.currentTime = 0;
      glitchSound.volume = getVolume("monster-glitch-sound");
      glitchSound.play();

      setTimeout(() => {
        carousel.classList.remove("screen-glitch");
        scanEl.remove();
        lineEl.remove();
        glitchVideo.remove();
      }, 2000);
    }, 2000);
  } else {
    /* ── CAS 2 : fond ou zone transparente ── */
    let voidCx = startCx;
    let voidCy = startCy;
    let voidIsHolding = true;

    moveBar(voidCx, voidCy);
    loadingBar.style.display = "block";
    loadingFill.style.transition = "none";
    loadingFill.style.width = "0%";

    const loadingSound = document.getElementById("loading-sound");
    loadingSound.currentTime = 0;
    loadingSound.volume = getVolume("loading-sound");
    loadingSound
      .play()
      .catch((err) => console.log("Erreur loading-sound:", err));

    requestAnimationFrame(() => {
      loadingFill.style.transition = "width 2000ms linear";
      loadingFill.style.width = "100%";
    });

    function onVoidMove(ev) {
      voidCx = ev.clientX;
      voidCy = ev.clientY;
      moveBar(voidCx, voidCy);
    }

    function onVoidUp() {
      if (!voidIsHolding) return;
      voidIsHolding = false;
      clearTimeout(voidHoldTimeout);
      loadingFill.style.transition = "none";
      loadingFill.style.width = "0%";
      loadingBar.style.display = "none";
      loadingSound.pause();
      loadingSound.currentTime = 0;
      document.removeEventListener("mouseup", onVoidUp);
      document.removeEventListener("mousemove", onVoidMove);
    }

    document.addEventListener("mousemove", onVoidMove);
    document.addEventListener("mouseup", onVoidUp);

    const voidHoldTimeout = setTimeout(() => {
      if (!voidIsHolding) return;
      voidIsHolding = false;
      loadingFill.style.transition = "none";
      loadingFill.style.width = "0%";
      loadingBar.style.display = "none";
      loadingSound.pause();
      loadingSound.currentTime = 0;

      document.removeEventListener("mouseup", onVoidUp);
      document.removeEventListener("mousemove", onVoidMove);

      const missedSound = document.getElementById("missed-sound");
      missedSound.currentTime = 0;
      missedSound.volume = getVolume("missed-sound");
      missedSound
        .play()
        .catch((err) => console.log("Erreur missed-sound:", err));

      document.body.classList.add("cursor-locked");

      const shakeCross = document.createElement("div");
      shakeCross.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        left: ${voidCx - 10}px;
        top: ${voidCy - 10}px;
      `;
      shakeCross.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
        <line x1="2" y1="2" x2="14" y2="14" stroke="red" stroke-width="2.5"/>
        <line x1="14" y1="2" x2="2" y2="14" stroke="red" stroke-width="2.5"/>
      </svg>`;
      shakeCross.classList.add("cross-visible");
      document.body.appendChild(shakeCross);

      function followMouse(ev) {
        shakeCross.style.left = ev.clientX - 10 + "px";
        shakeCross.style.top = ev.clientY - 10 + "px";
      }
      document.addEventListener("mousemove", followMouse);

      setTimeout(() => {
        shakeCross.remove();
        document.body.classList.remove("cursor-locked");
        document.removeEventListener("mousemove", followMouse);
      }, 800);
    }, 2000);
  }
});

/* =========================
   LOGIQUE DE JEU
========================= */

function startGame() {
  startScreen.style.display = "none";
  firstScreen.style.display = "none";
  gameOverScreen.style.display = "none";
  pauseMenu.style.display = "none";
  carousel.style.display = "block";
  menuButton.style.display = "block";

  timeLeft = 120;
  monsterCount = 0;
  monsterQueue = [];
  lastSpawnedMonster = null;
  timeAlertPlayed = false;

  const ambianceMusic = document.getElementById("ambiance-music");
  ambianceMusic.volume = getVolume("ambiance-music");
  ambianceMusic.currentTime = 0;
  ambianceMusic
    .play()
    .catch((err) => console.log("Erreur ambiance-music:", err));

  clearIntervals();
  document.getElementById("tuto-normal").style.display = "flex";
  createBlackout(false);
}

document.getElementById("skip-button").addEventListener("click", () => {
  document.getElementById("tuto-normal").style.display = "none";
  startIntervals();
});

function pauseGame() {
  clearIntervals();
  menuButton.style.display = "none";
  document.getElementById("ambiance-music").pause();

  pauseTitle.innerHTML = `PAUSED<span class="point-animation-p">.</span>`;
  pauseMainButtons.style.display = "flex";
  settingsMain.style.display = "none";
  panelGraphics.style.display = "none";
  panelSound.style.display = "none";
  panelControls.style.display = "none";

  pauseMenu.style.display = "flex";
}

function resumeGame() {
  pauseMenu.style.display = "none";
  menuButton.style.display = "block";
  startIntervals();
  const ambianceMusic = document.getElementById("ambiance-music");
  ambianceMusic.volume = getVolume("ambiance-music");
  ambianceMusic.play();
}

function endGame(won) {
  clearIntervals();
  stopAllSounds();

  if (!won) {
    const deadSound = document.getElementById("dead-sound");
    const iiiiSound = document.getElementById("iiii-sound");

    iiiiSound.currentTime = 0;
    iiiiSound.volume = getVolume("iiii-sound");
    iiiiSound.play().catch((err) => console.log("Erreur iiii-sound:", err));

    deadSound.currentTime = 0;
    deadSound.volume = getVolume("dead-sound");
    deadSound.play().catch((err) => console.log("Erreur dead-sound:", err));

    createBlackout(true, () => {
      carousel.style.display = "none";
      document.getElementById("carousel-hard").style.display = "none";
      pauseMenu.style.display = "none";
      gameOverScreen.style.display = "flex";
      menuButton.style.display = "none";
      gameOverMessage.innerHTML = "FAILED...";
    });

    return;
  }

  createBlackout(true, () => {
    carousel.style.display = "none";
    document.getElementById("carousel-hard").style.display = "none";
    pauseMenu.style.display = "none";
    gameOverScreen.style.display = "flex";
    menuButton.style.display = "none";
    gameOverMessage.innerHTML = `It's Gone... <span class="for-now-glow">For Now</span>`;

    const winSound = document.getElementById("win-sound");
    const iiiiWin = document.getElementById("wiiin-sound");

    iiiiWin.currentTime = 0;
    iiiiWin.volume = getVolume("wiiin-sound");
    iiiiWin.play().catch((err) => console.log("Erreur wiiin-sound:", err));

    winSound.currentTime = 0;
    winSound.volume = getVolume("win-sound");
    winSound.play().catch((err) => console.log("Erreur win-sound:", err));
  });
}

function resetSettings() {
  masterVolume = 0.5;
  musicVolume = 0.5;
  clickVolume = 0.5;

  document.getElementById("master-slider").value = 50;
  document.getElementById("music-slider").value = 50;
  document.getElementById("click-slider").value = 50;
  document.getElementById("master-value").textContent = "50%";
  document.getElementById("music-value").textContent = "50%";
  document.getElementById("click-value").textContent = "50%";

  document.getElementById("brightness-slider").value = 50;
  document.getElementById("brightness-value").textContent = "50%";
  document
    .querySelectorAll(".carousel-track img:not(.monster-parent)")
    .forEach((img) => {
      img.style.filter = "brightness(1)";
    });

  sensitivity = 5;
  document.getElementById("sensitivity-slider").value = 5;
  document.getElementById("sensitivity-value").textContent = "5";
}

function resetGame() {
  stopAllSounds();

  index = 0;
  timeLeft = 120;
  monsterCount = 0;
  objectCount = 0;
  timeAlertPlayed = false;
  monsterQueue = [];
  lastSpawnedMonster = null;
  timerElement.textContent = "2:00";

  document.querySelectorAll(".monster-parent").forEach((monster) => {
    monster.classList.remove("visible");
    monster.style.opacity = "0";
  });

  document.querySelectorAll(".object-parent").forEach((obj) => {
    obj.classList.remove("visible");
    obj.style.opacity = "0";
  });

  updateCarousel();

  gameOverScreen.style.display = "none";
  carousel.style.display = "block";
  menuButton.style.display = "block";

  const ambianceMusic = document.getElementById("ambiance-music");
  ambianceMusic.volume = getVolume("ambiance-music");
  ambianceMusic.currentTime = 0;
  ambianceMusic
    .play()
    .catch((err) => console.log("Erreur ambiance-music:", err));

  clearIntervals();
  startIntervals();
  createBlackout(false);
}

function backToMenu() {
  clearIntervals();
  stopAllSounds();

  index = 0;
  timeLeft = 120;
  monsterCount = 0;
  objectCount = 0;
  monsterQueue = [];
  lastSpawnedMonster = null;
  timeAlertPlayed = false;
  // RESET DES OBJETS
  carouselHard.querySelectorAll(".object-parent").forEach((obj) => {
    obj.classList.remove("visible", "found"); // visible disparaît, found reset
    obj.style.opacity = "0"; // invisible
  });

  objectCount = 0;
  objectQueue = [];
  lastSpawnedObject = null;
  timerElement.textContent = "2:00";

  document.querySelectorAll(".monster-parent").forEach((monster) => {
    monster.classList.remove("visible");
    monster.style.opacity = "0";
  });

  document.querySelectorAll(".object-parent").forEach((obj) => {
    obj.classList.remove("visible");
    obj.style.opacity = "0";
  });

  updateCarousel();

  carousel.style.display = "none";
  document.getElementById("carousel-hard").style.display = "none";
  gameOverScreen.style.display = "none";
  pauseMenu.style.display = "none";
  startScreen.style.display = "none";
  firstScreen.style.display = "flex";
  menuButton.style.display = "none";

  resetSettings();
  playFirstScreenMusic();
}

/* =========================
   NAVIGATION PREMIER ECRAN
========================= */

document.getElementById("level-button").addEventListener("click", () => {
  firstScreen.style.display = "none";
  startScreen.style.display = "flex";
});

document.getElementById("back-to-first").addEventListener("click", () => {
  startScreen.style.display = "none";
  firstScreen.style.display = "flex";
});

document
  .getElementById("setting-button-first")
  .addEventListener("click", () => {
    firstScreen.style.display = "none";
    pauseMenu.style.display = "flex";
    settingsFromFirst = true;
    showSettingsMain();
  });

/* =========================
   BOUTONS PRINCIPAUX
========================= */

menuButton.addEventListener("click", pauseGame);
resumeButton.addEventListener("click", resumeGame);
quitButton.addEventListener("click", backToMenu);
restartButton.addEventListener("click", resetGame);
backButton.addEventListener("click", backToMenu);

difficultyButtons.forEach((button) => {
  if (button.getAttribute("data-difficulty") === "normal") {
    button.addEventListener("click", () => {
      stopFirstScreenMusic();
      startGame();
    });
  }
});

/* =========================
   FAUX CURSEUR (boutons disabled)
========================= */

const fakeCursor = document.createElement("div");
fakeCursor.style.cssText = `
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  display: none;
  width: 60px;
  height: 60px;
`;
fakeCursor.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
  <line x1="2" y1="2" x2="14" y2="14" stroke="red" stroke-width="2.5"/>
  <line x1="14" y1="2" x2="2" y2="14" stroke="red" stroke-width="2.5"/>
</svg>`;
document.body.appendChild(fakeCursor);

let shakeFrame = null;
let mouseX = 0;
let mouseY = 0;

document.querySelectorAll("button[disabled]").forEach((btn) => {
  btn.addEventListener("mouseenter", () => {
    fakeCursor.style.display = "block";
    let t = 0;
    function animateShake() {
      const dx = Math.sin(t * 0.8) * 4;
      const dy = Math.cos(t * 1.1) * 3;
      fakeCursor.style.left = mouseX + dx - 8 + "px";
      fakeCursor.style.top = mouseY + dy - 8 + "px";
      t += 0.4;
      shakeFrame = requestAnimationFrame(animateShake);
    }
    animateShake();
  });
  btn.addEventListener("mouseleave", () => {
    fakeCursor.style.display = "none";
    cancelAnimationFrame(shakeFrame);
  });
});

document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

/* =========================
   SETTINGS PANEL
========================= */

const pauseTitle = document.getElementById("pause-title");
const pauseMainButtons = document.getElementById("pause-main-buttons");
const settingsMain = document.getElementById("settings-main");
const panelGraphics = document.getElementById("panel-graphics");
const panelSound = document.getElementById("panel-sound");
const panelControls = document.getElementById("panel-controls");

function showPauseMain() {
  if (settingsFromFirst) {
    settingsFromFirst = false;
    pauseMenu.style.display = "none";
    firstScreen.style.display = "flex";
    const music = document.getElementById("first-screen-music");
    if (music.paused) {
      music
        .play()
        .catch((err) => console.log("Erreur first-screen-music:", err));
    }
    return;
  }
  pauseTitle.innerHTML = `PAUSED<span class="point-animation-p">.</span>`;
  pauseMainButtons.style.display = "flex";
  settingsMain.style.display = "none";
  panelGraphics.style.display = "none";
  panelSound.style.display = "none";
  panelControls.style.display = "none";
}

function showSettingsMain() {
  pauseTitle.innerHTML = `SETTINGS<span class="point-animation-p">.</span>`;
  pauseMainButtons.style.display = "none";
  settingsMain.style.display = "flex";
  panelGraphics.style.display = "none";
  panelSound.style.display = "none";
  panelControls.style.display = "none";
}

function showPanel(panel, title) {
  pauseTitle.innerHTML = `${title}<span class="point-animation-p">.</span>`;
  settingsMain.style.display = "none";
  panel.style.display = "flex";
}

document.getElementById("setting-button").addEventListener("click", () => {
  settingsFromFirst = false;
  showSettingsMain();
});
document
  .getElementById("settings-back")
  .addEventListener("click", showPauseMain);
document
  .getElementById("btn-graphics")
  .addEventListener("click", () => showPanel(panelGraphics, "GRAPHIC"));
document
  .getElementById("btn-sound")
  .addEventListener("click", () => showPanel(panelSound, "SOUNDS"));
document
  .getElementById("btn-controls")
  .addEventListener("click", () => showPanel(panelControls, "CONTROL"));
document.querySelectorAll(".panel-back").forEach((btn) => {
  btn.addEventListener("click", showSettingsMain);
});

/* =========================
   SLIDERS SETTINGS
========================= */

document.getElementById("brightness-slider").addEventListener("input", (e) => {
  document
    .querySelectorAll(".carousel-track img:not(.monster-parent)")
    .forEach((img) => {
      img.style.filter = `brightness(${e.target.value / 100})`;
    });
  document.getElementById("brightness-value").textContent =
    e.target.value + "%";
});

document.getElementById("sensitivity-slider").addEventListener("input", (e) => {
  sensitivity = parseInt(e.target.value);
  document.getElementById("sensitivity-value").textContent = sensitivity;
});

document.getElementById("master-slider").addEventListener("input", (e) => {
  masterVolume = e.target.value / 100;
  document.getElementById("master-value").textContent = e.target.value + "%";
  applyVolumes();
});

document.getElementById("music-slider").addEventListener("input", (e) => {
  musicVolume = e.target.value / 100;
  document.getElementById("music-value").textContent = e.target.value + "%";
  applyVolumes();
});

document.getElementById("click-slider").addEventListener("input", (e) => {
  clickVolume = e.target.value / 100;
  document.getElementById("click-value").textContent = e.target.value + "%";
  applyVolumes();
});

document.querySelectorAll("input[type='range']").forEach((slider) => {
  slider.addEventListener("mousedown", () => slider.classList.add("dragging"));
  document.addEventListener("mouseup", () =>
    slider.classList.remove("dragging"),
  );
});

/* =========================
   SOUND - HOVER & CLICK BOUTONS
========================= */

const hoverSound = document.getElementById("hover-sound");

document
  .querySelectorAll("button:not([disabled]):not(.arrows)")
  .forEach((button) => {
    let hasPlayed = false;

    button.addEventListener("mouseenter", () => {
      if (hasPlayed) return;
      hoverSound.currentTime = 0;
      hoverSound.volume = getVolume("hover-sound");
      hoverSound.play();
      hasPlayed = true;
    });

    button.addEventListener("mouseleave", () => {
      hasPlayed = false;
    });

    button.addEventListener("click", () => {
      const clickingSound = document.getElementById("clicking-sound");
      clickingSound.currentTime = 0;
      clickingSound.volume = getVolume("clicking-sound");
      clickingSound.play();
    });
  });

/* =========================
   SOUND - FLECHES CAMERA
========================= */

const cameraSound = document.getElementById("camera-sound");

btnRight.addEventListener("click", () => {
  index = (index + 1) % rooms.length;
  updateCarousel();
  cameraSound.currentTime = 0;
  cameraSound.volume = getVolume("camera-sound");
  cameraSound.play();
});

btnLeft.addEventListener("click", () => {
  index = (index - 1 + rooms.length) % rooms.length;
  updateCarousel();
  cameraSound.currentTime = 0;
  cameraSound.volume = getVolume("camera-sound");
  cameraSound.play();
});

/* =========================
   DESACTIVER CLIC DROIT
========================= */

document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("mousedown", (e) => {
  if (e.button === 2) e.preventDefault();
});
document.addEventListener("mouseup", (e) => {
  if (e.button === 2) e.preventDefault();
});

/* =========================
   OEIL QUI SUIT LA SOURIS
========================= */

const eyeInside = document.querySelector(".insdie");
const eyeOutside = document.querySelector(".outside");
const videoAnimation = document.querySelector(".image-animation");
let eyeIdleTimeout = null;

document.addEventListener("mousemove", (e) => {
  if (!eyeInside || !eyeOutside) return;

  eyeInside.style.opacity = "1";
  eyeOutside.style.opacity = "1";
  if (videoAnimation) videoAnimation.style.opacity = "0";

  const rect = eyeOutside.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = e.clientX - centerX;
  const dy = e.clientY - centerY;
  const angle = Math.atan2(dy, dx);
  const maxDist = rect.width * 0.1;
  const x = Math.cos(angle) * maxDist;
  const y = Math.sin(angle) * maxDist;

  eyeInside.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;

  clearTimeout(eyeIdleTimeout);
  eyeIdleTimeout = setTimeout(() => {
    eyeInside.style.opacity = "0";
    eyeOutside.style.opacity = "0";
    if (videoAnimation) videoAnimation.style.opacity = "1";
  }, 1000);
});

/* =========================
   STOP SONS A LA FERMETURE
========================= */

window.addEventListener("pagehide", stopEverything);
window.addEventListener("beforeunload", stopEverything);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    document.querySelectorAll("audio").forEach((audio) => audio.pause());
  } else {
    if (
      carousel.style.display !== "none" &&
      pauseMenu.style.display === "none"
    ) {
      document
        .getElementById("ambiance-music")
        .play()
        .catch(() => {});
    }
    if (firstScreen.style.display !== "none") {
      document
        .getElementById("first-screen-music")
        .play()
        .catch(() => {});
    }
    if (gameOverScreen.style.display !== "none") {
      document
        .getElementById("win-sound")
        .play()
        .catch(() => {});
      document
        .getElementById("wiiin-sound")
        .play()
        .catch(() => {});
      document
        .getElementById("dead-sound")
        .play()
        .catch(() => {});
    }
  }
});

/* =========================
   POP UP INFO
========================= */

const informationPop = document.getElementById("information-pop");
const info = document.getElementById("info");
const okButton = document.getElementById("ok-button");

informationPop.addEventListener("click", () => {
  info.style.display = "flex";
});

okButton.addEventListener("click", () => {
  info.style.display = "none";
});

info.addEventListener("click", (e) => {
  if (e.target === info) {
    info.style.display = "none";
  }
});

/* ===============================================================================================================================================================================
   JEU VERSION HARD
========================= */

const carouselHard = document.getElementById("carousel-hard");
const trackHard = document.querySelector(".carousel-track-hard");
const roomsHard = document.querySelectorAll(".img-text-hard");
const btnLeftHard = document.querySelector(".arrow-left-hard");
const btnRightHard = document.querySelector(".arrow-right-hard");
const timerElementHard = document.getElementById("timer-hard");

let indexHard = 0;

function updateCarouselHard() {
  trackHard.style.transform = `translateX(-${indexHard * 100}%)`;
}

function getVisibleMonsterAtPointHard(cx, cy) {
  const visibleMonsters = Array.from(
    carouselHard.querySelectorAll(".monster-parent-hard.visible"),
  );

  for (const monster of visibleMonsters) {
    const rect = monster.getBoundingClientRect();

    if (
      cx < rect.left ||
      cx > rect.right ||
      cy < rect.top ||
      cy > rect.bottom
    ) {
      continue;
    }

    const canvas = document.createElement("canvas");
    canvas.width = monster.naturalWidth;
    canvas.height = monster.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(monster, 0, 0);

    const x = Math.floor(
      ((cx - rect.left) / rect.width) * monster.naturalWidth,
    );
    const y = Math.floor(
      ((cy - rect.top) / rect.height) * monster.naturalHeight,
    );

    try {
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      if (pixel[3] >= 25) return monster;
    } catch {
      return monster;
    }
  }

  return null;
}

function updateTimerHard() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  timerElementHard.textContent =
    minutes + ":" + seconds.toString().padStart(2, "0");

  if (timeLeft <= 30 && !timeAlertPlayed) {
    const timeSound = document.getElementById("time-sound");
    timeSound.currentTime = 0;
    timeSound.volume = getVolume("time-sound");
    timeSound.play().catch((err) => console.log("Erreur time-sound:", err));
    timeAlertPlayed = true;
  }

  if (timeLeft > 0) {
    timeLeft--;
  } else {
    endGame(true);
  }
}

function startIntervalsHard() {
  timerInterval = setInterval(updateTimerHard, 1000);
  monsterInterval = setInterval(spawnMonsterHard, 10000);
  objectInterval = setInterval(spawnObject, 12000);

  const doorSounds = ["r-door-sound", "l-door-sound"];
  let doorPlayCount = { "r-door-sound": 0, "l-door-sound": 0 };

  function playRandomDoor() {
    const notEnough = doorSounds.filter((id) => doorPlayCount[id] < 2);
    const pool = notEnough.length > 0 ? notEnough : doorSounds;
    const randomId = pool[Math.floor(Math.random() * pool.length)];
    const sound = document.getElementById(randomId);
    sound.currentTime = 0;
    sound.volume = getVolume(randomId);
    sound.play().catch((err) => console.log("Erreur door-sound:", err));
    doorPlayCount[randomId]++;
  }

  doorInterval = setInterval(playRandomDoor, 25000);
}

let monsterQueueHard = [];
let lastSpawnedMonsterHard = null;

function buildMonsterQueueHard() {
  const allMonsters = Array.from(
    carouselHard.querySelectorAll(".monster-parent-hard"),
  );

  for (let i = allMonsters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allMonsters[i], allMonsters[j]] = [allMonsters[j], allMonsters[i]];
  }

  if (
    lastSpawnedMonsterHard !== null &&
    allMonsters[0] === lastSpawnedMonsterHard &&
    allMonsters.length > 1
  ) {
    [allMonsters[0], allMonsters[1]] = [allMonsters[1], allMonsters[0]];
  }

  monsterQueueHard = allMonsters;
}

function spawnMonsterHard() {
  if (monsterQueueHard.length === 0) buildMonsterQueueHard();

  let attempts = 0;
  while (monsterQueueHard.length > 0 && attempts < monsterQueueHard.length) {
    const monster = monsterQueueHard.shift();

    if (monster.classList.contains("visible")) {
      monsterQueueHard.push(monster);
      attempts++;
      continue;
    }

    monster.classList.add("visible");
    monster.style.opacity = "1";
    lastSpawnedMonsterHard = monster;
    monsterCount++;

    if (monsterCount >= 4) {
      endGame(false);
    }
    return;
  }
}

function startGameHard() {
  resetObjectsHard();

  startScreen.style.display = "none";
  firstScreen.style.display = "none";
  gameOverScreen.style.display = "none";
  pauseMenu.style.display = "none";
  carousel.style.display = "none";
  carouselHard.style.display = "block";
  menuButton.style.display = "block";

  timeLeft = 120;
  monsterCount = 0;
  monsterQueueHard = [];
  lastSpawnedMonsterHard = null;
  timeAlertPlayed = false;
  timerElementHard.textContent = "2:00";

  const ambianceMusic = document.getElementById("ambiance-music");
  ambianceMusic.volume = getVolume("ambiance-music");
  ambianceMusic.currentTime = 0;
  ambianceMusic
    .play()
    .catch((err) => console.log("Erreur ambiance-music:", err));

  clearIntervals();
  document.getElementById("tuto-hard").style.display = "flex";
  createBlackout(false);
}

document.getElementById("skip-button-hard").addEventListener("click", () => {
  document.getElementById("tuto-hard").style.display = "none";
  startIntervalsHard();
});

btnRightHard.addEventListener("click", () => {
  indexHard = (indexHard + 1) % roomsHard.length;
  updateCarouselHard();
  cameraSound.currentTime = 0;
  cameraSound.volume = getVolume("camera-sound");
  cameraSound.play();
});

btnLeftHard.addEventListener("click", () => {
  indexHard = (indexHard - 1 + roomsHard.length) % roomsHard.length;
  updateCarouselHard();
  cameraSound.currentTime = 0;
  cameraSound.volume = getVolume("camera-sound");
  cameraSound.play();
});

carouselHard.addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (e.target.closest("button, #timer-hard, .text-hard, .text-battery-hard"))
    return;

  const startCx = e.clientX;
  const startCy = e.clientY;
  const hitMonster = getVisibleMonsterAtPointHard(startCx, startCy);

  const hitObject = getVisibleObjectAtPointHard(startCx, startCy);
  if (!hitMonster && hitObject) {
    let isHolding = true;

    moveBar(startCx, startCy);
    loadingBar.style.display = "block";
    loadingFill.style.transition = "none";
    loadingFill.style.width = "0%";

    const loadingSound = document.getElementById("loading-sound");
    loadingSound.currentTime = 0;
    loadingSound.volume = getVolume("loading-sound");
    loadingSound
      .play()
      .catch((err) => console.log("Erreur loading-sound:", err));

    requestAnimationFrame(() => {
      loadingFill.style.transition = "width 2000ms linear";
      loadingFill.style.width = "100%";
    });

    function onMoveObj(ev) {
      if (!isHolding) return;
      moveBar(ev.clientX, ev.clientY);
    }

    function cancelHoldObj() {
      if (!isHolding) return;
      isHolding = false;
      clearTimeout(holdTimeoutObj);
      loadingFill.style.transition = "none";
      loadingFill.style.width = "0%";
      loadingBar.style.display = "none";
      loadingSound.pause();
      loadingSound.currentTime = 0;
      document.removeEventListener("mousemove", onMoveObj);
      document.removeEventListener("mouseup", cancelHoldObj);
    }

    document.addEventListener("mousemove", onMoveObj);
    document.addEventListener("mouseup", cancelHoldObj);

    const holdTimeoutObj = setTimeout(() => {
      if (!isHolding) return;
      isHolding = false;

      hitObject.classList.add("visible");
      hitObject.style.opacity = "1";
      setTimeout(() => {
        hitObject.classList.remove("visible");
        hitObject.style.opacity = "0";
      }, 12000);

      loadingFill.style.transition = "none";
      loadingFill.style.width = "0%";
      loadingBar.style.display = "none";
      loadingSound.pause();
      loadingSound.currentTime = 0;

      document.removeEventListener("mousemove", onMoveObj);
      document.removeEventListener("mouseup", cancelHoldObj);

      carouselHard.classList.add("screen-glitch");
      const scanEl = document.createElement("div");
      scanEl.className = "screen-glitch-scan";
      carouselHard.appendChild(scanEl);
      const lineEl = document.createElement("div");
      lineEl.className = "screen-glitch-line";
      carouselHard.appendChild(lineEl);
      const glitchSound = document.getElementById("monster-glitch-sound");
      glitchSound.currentTime = 0;
      glitchSound.volume = getVolume("monster-glitch-sound");
      glitchSound.play();
      setTimeout(() => {
        carouselHard.classList.remove("screen-glitch");
        scanEl.remove();
        lineEl.remove();
      }, 2000);
    }, 2000);

    return;
  }

  if (hitMonster) {
    /* ── CAS 1 : monstre trouve ── */
    let isHolding = true;

    moveBar(startCx, startCy);
    loadingBar.style.display = "block";
    loadingFill.style.transition = "none";
    loadingFill.style.width = "0%";

    const loadingSound = document.getElementById("loading-sound");
    loadingSound.currentTime = 0;
    loadingSound.volume = getVolume("loading-sound");
    loadingSound
      .play()
      .catch((err) => console.log("Erreur loading-sound:", err));

    requestAnimationFrame(() => {
      loadingFill.style.transition = "width 2000ms linear";
      loadingFill.style.width = "100%";
    });

    function onMove(ev) {
      if (!isHolding) return;
      moveBar(ev.clientX, ev.clientY);
    }

    function cancelHold() {
      if (!isHolding) return;
      isHolding = false;
      clearTimeout(holdTimeout);
      loadingFill.style.transition = "none";
      loadingFill.style.width = "0%";
      loadingBar.style.display = "none";
      loadingSound.pause();
      loadingSound.currentTime = 0;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", cancelHold);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", cancelHold);

    const holdTimeout = setTimeout(() => {
      if (!isHolding) return;
      isHolding = false;

      hitMonster.classList.remove("visible");
      hitMonster.style.opacity = "0";
      monsterCount--;
      if (monsterCount < 0) monsterCount = 0;

      loadingFill.style.transition = "none";
      loadingFill.style.width = "0%";
      loadingBar.style.display = "none";
      loadingSound.pause();
      loadingSound.currentTime = 0;

      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", cancelHold);

      carouselHard.classList.add("screen-glitch");

      const scanEl = document.createElement("div");
      scanEl.className = "screen-glitch-scan";
      carouselHard.appendChild(scanEl);

      const lineEl = document.createElement("div");
      lineEl.className = "screen-glitch-line";
      carouselHard.appendChild(lineEl);

      const glitchVideo = document.createElement("video");
      glitchVideo.src = "glitch1.mp4";
      glitchVideo.autoplay = true;
      glitchVideo.muted = true;
      glitchVideo.style.cssText = `
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0.3;
        z-index: 102;
        pointer-events: none;
      `;
      carouselHard.appendChild(glitchVideo);

      const glitchSound = document.getElementById("monster-glitch-sound");
      glitchSound.currentTime = 0;
      glitchSound.volume = getVolume("monster-glitch-sound");
      glitchSound.play();

      setTimeout(() => {
        carouselHard.classList.remove("screen-glitch");
        scanEl.remove();
        lineEl.remove();
        glitchVideo.remove();
      }, 2000);
    }, 2000);
  } else {
    /* ── CAS 2 : fond ou zone transparente ── */
    let voidCx = startCx;
    let voidCy = startCy;
    let voidIsHolding = true;

    moveBar(voidCx, voidCy);
    loadingBar.style.display = "block";
    loadingFill.style.transition = "none";
    loadingFill.style.width = "0%";

    const loadingSound = document.getElementById("loading-sound");
    loadingSound.currentTime = 0;
    loadingSound.volume = getVolume("loading-sound");
    loadingSound
      .play()
      .catch((err) => console.log("Erreur loading-sound:", err));

    requestAnimationFrame(() => {
      loadingFill.style.transition = "width 2000ms linear";
      loadingFill.style.width = "100%";
    });

    function onVoidMove(ev) {
      voidCx = ev.clientX;
      voidCy = ev.clientY;
      moveBar(voidCx, voidCy);
    }

    function onVoidUp() {
      if (!voidIsHolding) return;
      voidIsHolding = false;
      clearTimeout(voidHoldTimeout);
      loadingFill.style.transition = "none";
      loadingFill.style.width = "0%";
      loadingBar.style.display = "none";
      loadingSound.pause();
      loadingSound.currentTime = 0;
      document.removeEventListener("mouseup", onVoidUp);
      document.removeEventListener("mousemove", onVoidMove);
    }

    document.addEventListener("mousemove", onVoidMove);
    document.addEventListener("mouseup", onVoidUp);

    const voidHoldTimeout = setTimeout(() => {
      if (!voidIsHolding) return;
      voidIsHolding = false;
      loadingFill.style.transition = "none";
      loadingFill.style.width = "0%";
      loadingBar.style.display = "none";
      loadingSound.pause();
      loadingSound.currentTime = 0;

      document.removeEventListener("mouseup", onVoidUp);
      document.removeEventListener("mousemove", onVoidMove);

      const missedSound = document.getElementById("missed-sound");
      missedSound.currentTime = 0;
      missedSound.volume = getVolume("missed-sound");
      missedSound
        .play()
        .catch((err) => console.log("Erreur missed-sound:", err));

      document.body.classList.add("cursor-locked");

      const shakeCross = document.createElement("div");
      shakeCross.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        left: ${voidCx - 10}px;
        top: ${voidCy - 10}px;
      `;
      shakeCross.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
        <line x1="2" y1="2" x2="14" y2="14" stroke="red" stroke-width="2.5"/>
        <line x1="14" y1="2" x2="2" y2="14" stroke="red" stroke-width="2.5"/>
      </svg>`;
      shakeCross.classList.add("cross-visible");
      document.body.appendChild(shakeCross);

      function followMouse(ev) {
        shakeCross.style.left = ev.clientX - 10 + "px";
        shakeCross.style.top = ev.clientY - 10 + "px";
      }
      document.addEventListener("mousemove", followMouse);

      setTimeout(() => {
        shakeCross.remove();
        document.body.classList.remove("cursor-locked");
        document.removeEventListener("mousemove", followMouse);
      }, 800);
    }, 2000);
  }
  carouselHard.addEventListener("dragstart", (e) => e.preventDefault());
});

document
  .querySelector("[data-difficulty='hard']")
  .addEventListener("click", () => {
    stopFirstScreenMusic();
    startGameHard();
  });

/* =========================
   SPAWN DES OBJECTS
========================= */
let objectCount = 0;
let objectInterval = null;
let objectQueue = [];
let lastSpawnedObject = null;
let totalObjects = 10; // nombre total d'objets à spawn

function buildObjectQueue() {
  // tous les objets non trouvés
  const allObjects = Array.from(
    carouselHard.querySelectorAll(".object-parent:not(.found)"),
  );

  // shuffle
  for (let i = allObjects.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allObjects[i], allObjects[j]] = [allObjects[j], allObjects[i]];
  }

  objectQueue = allObjects;
}

function spawnObject() {
  const allObjects = Array.from(
    carouselHard.querySelectorAll(".object-parent"),
  );
  const hidden = allObjects.filter((obj) => !obj.classList.contains("visible"));
  if (hidden.length === 0) return;
  const random = hidden[Math.floor(Math.random() * hidden.length)];
  random.classList.add("visible");
  random.style.opacity = "1";

  setTimeout(() => {
    if (!random.classList.contains("visible")) return;
    random.classList.remove("visible");
    random.style.opacity = "0";
  }, 12000);
}

function getVisibleObjectAtPointHard(cx, cy) {
  const objects = Array.from(
    carouselHard.querySelectorAll(".object-parent:not(.found)"),
  );

  for (const obj of objects) {
    const rect = obj.getBoundingClientRect();

    if (
      cx < rect.left ||
      cx > rect.right ||
      cy < rect.top ||
      cy > rect.bottom
    ) {
      continue;
    }

    const canvas = document.createElement("canvas");
    canvas.width = obj.naturalWidth || 1;
    canvas.height = obj.naturalHeight || 1;
    const ctx = canvas.getContext("2d");

    try {
      ctx.drawImage(obj, 0, 0);
      const x = Math.floor(
        ((cx - rect.left) / rect.width) * (obj.naturalWidth || 1),
      );
      const y = Math.floor(
        ((cy - rect.top) / rect.height) * (obj.naturalHeight || 1),
      );
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      if (pixel[3] >= 25) return obj;
    } catch {
      return obj;
    }
  }

  return null;
}

function resetObjectsHard() {
  const objects = carouselHard.querySelectorAll(".object-parent");

  objects.forEach((obj) => {
    obj.classList.remove("visible");
    obj.classList.remove("found");
    obj.style.opacity = "1";
  });

  objectQueue = [];
  lastSpawnedObject = null;
  objectCount = 0;
}
