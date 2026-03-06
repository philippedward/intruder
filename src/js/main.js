const TRANSPARENCY_THRESHOLD = 0.1;

const track = document.querySelector(".carousel-track");
const rooms = document.querySelectorAll(".img-text");
const btnLeft = document.querySelector(".arrow.left");
const btnRight = document.querySelector(".arrow.right");
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
  "ambiance-music": 0.8,
  "first-screen-music": 0.9,
  "win-sound": 0.9,
  "wiiin-sound": 0.3,
  "dead-sound": 1.0,
  "iiii-sound": 0.6,
  "time-sound": 1.0,
  "monster-glitch-sound": 0.9,
  "r-door-sound": 1.0,
  "l-door-sound": 1.0,
  "hover-sound": 0.8,
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
   Stoppe tout SAUF first-screen-music
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

function spawnMonster() {
  const randomRoom = Math.floor(Math.random() * rooms.length);
  const room = rooms[randomRoom];
  const monsters = room.querySelectorAll(".monster-parent:not(.visible)");
  if (monsters.length === 0) return;

  const randomIndex = Math.floor(Math.random() * monsters.length);
  const monster = monsters[randomIndex];

  monster.classList.add("visible");
  monster.style.opacity = "1";
  monsterCount++;

  if (monsterCount >= 4) {
    endGame(false);
  }
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
   LISTENERS MONSTRES
========================= */

document.querySelectorAll(".monster-parent").forEach((monster) => {
  let holdTimeout = null;
  let isHolding = false;

  function cancelHold() {
    clearTimeout(holdTimeout);
    holdTimeout = null;
    isHolding = false;
    loadingFill.style.transition = "none";
    loadingFill.style.width = "0%";
    loadingBar.style.display = "none";
    const loadingSound = document.getElementById("loading-sound");
    loadingSound.pause();
    loadingSound.currentTime = 0;
  }

  monster.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    if (!monster.classList.contains("visible")) return;
    isHolding = true;

    moveBar(e.clientX, e.clientY);
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

    holdTimeout = setTimeout(() => {
      if (!isHolding) return;
      monster.classList.remove("visible");
      monster.style.opacity = "0";
      monsterCount--;
      if (monsterCount < 0) monsterCount = 0;

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

      cancelHold();
    }, 2000);
  });

  monster.addEventListener("mousemove", (e) => moveBar(e.clientX, e.clientY));
  monster.addEventListener("mouseup", cancelHold);
  monster.addEventListener("mouseleave", cancelHold);
});

/* =========================
   CROIX ROUGE SI CLICK DANS LE VIDE
========================= */

document.getElementById("carousel").addEventListener("mousedown", (e) => {
  if (e.button !== 0) return;
  if (e.target.closest(".monster-parent, button, #timer, .text, .text-battery"))
    return;

  let cx = e.clientX;
  let cy = e.clientY;
  let holdTimeout = null;
  let isHolding = true;

  moveBar(cx, cy);
  loadingBar.style.display = "block";
  loadingFill.style.transition = "none";
  loadingFill.style.width = "0%";

  const loadingSound = document.getElementById("loading-sound");
  loadingSound.currentTime = 0;
  loadingSound.volume = getVolume("loading-sound");
  loadingSound.play().catch((err) => console.log("Erreur loading-sound:", err));

  requestAnimationFrame(() => {
    loadingFill.style.transition = "width 2000ms linear";
    loadingFill.style.width = "100%";
  });

  function onMove(ev) {
    cx = ev.clientX;
    cy = ev.clientY;
    moveBar(cx, cy);
  }

  function onUp() {
    if (!isHolding) return;
    isHolding = false;
    clearTimeout(holdTimeout);
    loadingFill.style.transition = "none";
    loadingFill.style.width = "0%";
    loadingBar.style.display = "none";
    loadingSound.pause();
    loadingSound.currentTime = 0;
    document.removeEventListener("mouseup", onUp);
    document.removeEventListener("mousemove", onMove);
  }

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);

  holdTimeout = setTimeout(() => {
    if (!isHolding) return;
    isHolding = false;
    loadingFill.style.transition = "none";
    loadingFill.style.width = "0%";
    loadingBar.style.display = "none";
    loadingSound.pause();
    loadingSound.currentTime = 0;

    const missedSound = document.getElementById("missed-sound");
    missedSound.currentTime = 0;
    missedSound.volume = getVolume("missed-sound");
    missedSound.play().catch((err) => console.log("Erreur missed-sound:", err));

    document.body.classList.add("cursor-locked");

    const shakeCross = document.createElement("div");
    shakeCross.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      left: ${cx - 10}px;
      top: ${cy - 10}px;
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
  timeAlertPlayed = false;

  const ambianceMusic = document.getElementById("ambiance-music");
  ambianceMusic.volume = getVolume("ambiance-music");
  ambianceMusic.currentTime = 0;
  ambianceMusic
    .play()
    .catch((err) => console.log("Erreur ambiance-music:", err));

  clearIntervals();
  document.getElementById("how-to-play").style.display = "flex";
  createBlackout(false);
}

document.getElementById("skip-button").addEventListener("click", () => {
  document.getElementById("how-to-play").style.display = "none";
  startIntervals();
});

function pauseGame() {
  clearIntervals();
  pauseMenu.style.display = "flex";
  menuButton.style.display = "none";
  document.getElementById("ambiance-music").pause();
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
      pauseMenu.style.display = "none";
      gameOverScreen.style.display = "flex";
      menuButton.style.display = "none";
      gameOverMessage.innerHTML = "FAILED...";
    });

    return;
  }

  // Victoire : sons lancés EN PREMIER, resetSettings après
  createBlackout(true, () => {
    carousel.style.display = "none";
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
  // Pas d'applyVolumes() ici — ne pas couper les sons en cours
}

function resetGame() {
  stopAllSounds();

  index = 0;
  timeLeft = 120;
  monsterCount = 0;
  timeAlertPlayed = false;
  timerElement.textContent = "2:00";

  document.querySelectorAll(".monster-parent").forEach((monster) => {
    monster.classList.remove("visible");
    monster.style.opacity = "0";
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
  stopAllSounds(); // stoppe TOUT sauf first-screen-music

  index = 0;
  timeLeft = 120;
  monsterCount = 0;
  timeAlertPlayed = false;
  timerElement.textContent = "2:00";

  document.querySelectorAll(".monster-parent").forEach((monster) => {
    monster.classList.remove("visible");
    monster.style.opacity = "0";
  });

  updateCarousel();

  carousel.style.display = "none";
  gameOverScreen.style.display = "none";
  pauseMenu.style.display = "none";
  startScreen.style.display = "none";
  firstScreen.style.display = "flex";
  menuButton.style.display = "none";

  resetSettings();
  playFirstScreenMusic(); // reprend la musique du menu
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
  if (button.getAttribute("data-difficulty") === "hard") {
    button.disabled = true;
  }
  button.addEventListener("click", () => {
    if (button.getAttribute("data-difficulty") === "normal") {
      stopFirstScreenMusic();
      startGame();
    }
  });
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
   SOUND - HOVER BOUTONS
========================= */

const hoverSound = document.getElementById("hover-sound");

document
  .querySelectorAll("button:not([disabled]):not(.arrow)")
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
