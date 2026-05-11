// Game Variables
const gameZone = document.getElementById('gameZone');
const basket = document.getElementById('basket');
const scoreDisplay = document.getElementById('score');
const bestScoreDisplay = document.getElementById('bestScore');
const livesDisplay = document.getElementById('lives');
const gameOverModal = new bootstrap.Modal(document.getElementById('gameOverModal'));
const replayBtn = document.getElementById('replayBtn');
const startBtn = document.getElementById('startBtn');
const startButtonContainer = document.getElementById('startButtonContainer');
const muteBtn = document.getElementById('muteBtn');
const backgroundMusic = document.getElementById('backgroundMusic');
const bonusSound = document.getElementById('bonusSound');
const loseLifeSound = document.getElementById('loseLifeSound');
const boostSound = document.getElementById('boostSound');
const losingSound = document.getElementById('losingSound');
const hoverSound = document.getElementById('hoverSound');
const heartSound = document.getElementById('heartSound');
const infoBtn = document.getElementById('infoBtn');
const gameInfoModal = new bootstrap.Modal(document.getElementById('gameInfoModal'));

// ================= THEMES =================
const THEMES = {
    default: {
        name: "Classic",
        basket: "🧺",
        bonus: ['🍎', '🍊', '🍋', '🍌', '🍇', '🍓'],
        malus: ['🐝'],
        heart: ['❤️‍🩹'],
        // background for game zone
        background: "linear-gradient(180deg, #87CEEB 0%, #E0F6FF 100%)"
    },
    halloween: {
        name: "Halloween",
        basket: "🧛‍♀️",
        bonus: ['🍭', '🍬', '🍫','🎃'],
        malus: ['👻'],
        heart: ['⚰️'],
        background: "linear-gradient(180deg, #1a002a 0%, #ff7518 100%)"
    },
    christmas: {
        name: "Christmas",
        basket: "🦌",
        bonus: ['🎁', '🍪', '❄️','🍀'],
        malus: ['🪨'],
        heart: ['🎅'],
        background: "linear-gradient(180deg, #b30000 0%, #ffffff 100%)"
    },
    pirate: {
        name: "Pirate",
        basket: "🏴‍☠️",
        bonus: ['💰', '🪙', '🧭'],
        malus: ['💣'],
        heart: ['🦜'],
        background: "linear-gradient(180deg, #001f3f 0%, #cfa670 100%)"
    }
};

let currentTheme = localStorage.getItem('selectedTheme') || 'default';

function applyTheme(themeName) {
    const theme = THEMES[themeName] || THEMES.default;
    currentTheme = themeName;

    // Change basket
    basket.textContent = theme.basket;

    // Change game background
    gameZone.style.background = theme.background;

    // Change page background
    document.body.style.background = theme.background;

    // Save theme
    localStorage.setItem('selectedTheme', themeName);

    // Highlight active button
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
}

function getCurrentObjects() {
    const t = THEMES[currentTheme];
    return {
        BONUS: t.bonus,
        MALUS: t.malus,
        HEART: t.heart
    };
}
// ================= GAME LOGIC =================

let score = 0;
let bestScore = localStorage.getItem('bestScore') ? parseInt(localStorage.getItem('bestScore')) : 0;
let lives = 3;
let gameActive = false;
let basketPosition = 50;
let targetBasketPosition = 50;
let spawnInterval = 800;
let fallSpeed = 1;
let spawnIntervalId = null;
let keysPressed = {
    ArrowLeft: false,
    ArrowRight: false
};
let lastBoostThreshold = 0;
let missedFruitsInARow = 0;

let audioContext = null;

const SOUND_FILES = {
    background: 'sound/bgm.mp3',
    bonus: 'sound/bonus.mp3',
    loseLife: 'sound/bee.mp3',
    boost: 'sound/boost.mp3',
    losing: 'sound/losing.mp3',
    hover: 'sound/hover.mp3',
    heart: 'sound/heart.mp3'
};

// Set sound sources
backgroundMusic.src = SOUND_FILES.background;
bonusSound.src = SOUND_FILES.bonus;
loseLifeSound.src = SOUND_FILES.loseLife;
boostSound.src = SOUND_FILES.boost;
losingSound.src = SOUND_FILES.losing;
hoverSound.src = SOUND_FILES.hover;
heartSound.src = SOUND_FILES.heart;

let isMuted = false;
let backgroundMusicStarted = false;

muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;

    backgroundMusic.muted = isMuted;
    if (isMuted) {
        backgroundMusic.pause();
    } else if (backgroundMusicStarted) {
        backgroundMusic.play().catch(e => console.log('Background music play error:', e));
    }

    muteBtn.textContent = isMuted ? '🔇' : '🔊';
    muteBtn.classList.toggle('muted');
});

// Reset game and clear data (but keep theme)
resetBtn.addEventListener('click', () => {
    // <CHANGE> Save theme before clearing storage
    const savedTheme = localStorage.getItem('selectedTheme');
    
    // Clear local storage completely
    localStorage.clear();
    
    // Restore theme
    if (savedTheme) {
        localStorage.setItem('selectedTheme', savedTheme);
    }
    
    // Reset game variables
    score = 0;
    bestScore = 0;
    lives = 3;
    lastBoostThreshold = 0;
    fallSpeed = 1;
    missedFruitsInARow = 0;
    
    // Update display
    bestScoreDisplay.textContent = bestScore;
    updateScore();
    startButtonContainer.classList.remove('hidden');
    gameActive = false;
    
    playSound('hover');
});

infoBtn.addEventListener('click', () => {
    gameInfoModal.show();
});



function playSound(type) {
    switch(type) {
        case 'bonus':
            bonusSound.currentTime = 0;
            bonusSound.play().catch(e => console.log('Bonus sound play error:', e));
            break;
        case 'lose':
            loseLifeSound.currentTime = 0;
            loseLifeSound.play().catch(e => console.log('Lose life sound play error:', e));
            break;
        case 'boost':
            boostSound.currentTime = 0;
            boostSound.play().catch(e => console.log('Boost sound play error:', e));
            break;
        case 'losing':
            backgroundMusic.pause();
            losingSound.currentTime = 0;
            losingSound.play().catch(e => console.log('Losing sound play error:', e));
            break;
        case 'hover':
            hoverSound.currentTime = 0;
            hoverSound.play().catch(e => console.log('Hover sound play error:', e));
            break;
        case 'heart':
            heartSound.currentTime = 0;
            heartSound.play().catch(e => console.log('Heart sound play error:', e));
            break;
        case 'playAgain':
            break;
    }
}

function updateBasketPosition() {
    if (Math.abs(basketPosition - targetBasketPosition) > 0.1) {
        basketPosition += (targetBasketPosition - basketPosition) * 0.15;
        basket.style.left = basketPosition + '%';
    }
}

function createObject() {
    if (!gameActive) return;

    const rand = Math.random() * 100;
    let objectType = 'BONUS';
    let isHeart = false;

    // 5% chance for heart, 70% bonus, 25% malus
    if (rand < 5) {
        objectType = 'HEART';
        isHeart = true;
    } else if (rand < 70) {
        objectType = 'BONUS';
    } else {
        objectType = 'MALUS';
    }

    const objectArray = getCurrentObjects()[objectType];
    const object = objectArray[Math.floor(Math.random() * objectArray.length)];

    const objectEl = document.createElement('div');
    const className = isHeart ? 'falling-object object-heart' : (objectType === 'BONUS' ? 'falling-object object-bonus' : 'falling-object object-malus');
    objectEl.className = className;
    objectEl.textContent = object;

    const randomX = Math.random() * 90;
    const gameRect = gameZone.getBoundingClientRect();
    const baseFallDuration = 4;
    const fallDuration = baseFallDuration / fallSpeed;
    const finalFallDuration = isHeart ? fallDuration / 1.3 : fallDuration;

    const horizontalDirection = Math.random() > 0.5 ? 1 : -1;
    const horizontalSpeed = Math.random() * 40 + 20; // Random speed between 20-60px per second
    let currentX = randomX;
    const isMalusBeam = objectType === 'MALUS';

    objectEl.style.left = randomX + '%';
    objectEl.style.top = '0px';
    objectEl.style.animationDuration = finalFallDuration + 's';

    gameZone.appendChild(objectEl);

    let lastUpdateTime = Date.now();
    let startTime = Date.now();
    const checkInterval = setInterval(() => {
        if (!document.contains(objectEl)) {
            clearInterval(checkInterval);
            return;
        }

        const now = Date.now();
        const deltaTime = (now - lastUpdateTime) / 1000;
        lastUpdateTime = now;

        const gameRect = gameZone.getBoundingClientRect();
        let movement = 0;
        if (isMalusBeam) {
            const elapsedTime = (now - startTime) / 1000;
            const oscillationAmount = 10; // How far left/right it moves
            const oscillationSpeed = 5; // Frequency of oscillation
            movement = (Math.sin(elapsedTime * oscillationSpeed) * oscillationAmount) / gameRect.width * 100;
        }
        currentX += movement;

        // Keep objects within bounds
        currentX = Math.max(-5, Math.min(105, currentX));
        objectEl.style.left = currentX + '%';

        const objRect = objectEl.getBoundingClientRect();
        const basketRect = basket.getBoundingClientRect();

        const objBottom = objRect.bottom - gameRect.top;
        const objTop = objRect.top - gameRect.top;
        const objLeft = objRect.left - gameRect.left;
        const objRight = objRect.right - gameRect.left;

        const basketTop = basketRect.top - gameRect.top;
        const basketBottom = basketRect.bottom - gameRect.top;
        const basketLeft = basketRect.left - gameRect.left;
        const basketRight = basketRect.right - gameRect.left;

        const hitboxLeft = basketLeft + (basketRight - basketLeft) * 0.3;
        const hitboxRight = basketRight - (basketRight - basketLeft) * 0.3;
        const hitboxTop = basketTop + (basketBottom - basketTop) * 0.2;
        const hitboxBottom = basketBottom - (basketBottom - basketTop) * 0.2;

        const isColliding = objBottom >= hitboxTop &&
                           objTop <= hitboxBottom &&
                           objLeft < hitboxRight &&
                           objRight > hitboxLeft;

        if (isColliding) {
            if (isHeart) {
                lives = Math.min(3, lives + 1);
                playSound('heart');
            } else if (objectType === 'BONUS') {
                score += 10;
                missedFruitsInARow = 0;
                playSound('bonus');

                const currentThreshold = Math.floor(score / 100) * 100;
                if (currentThreshold > lastBoostThreshold) {
                    lastBoostThreshold = currentThreshold;
                    playSound('boost');
                }
            } else {
                lives -= 1;
                playSound('lose');
            }
            updateScore();
            objectEl.remove();
            clearInterval(checkInterval);
            return;
        }

        if (objTop > gameRect.height + 100) {
            if (objectType === 'BONUS') {
                score = Math.max(0, score - 5);
                missedFruitsInARow += 1;

                if (missedFruitsInARow >= 3) {
                    lives -= 1;
                    missedFruitsInARow = 0;
                    playSound('lose');
                }
            } else if (objectType === 'MALUS' || isHeart) {
                missedFruitsInARow = 0;
            }
            updateScore();
            objectEl.remove();
            clearInterval(checkInterval);

            if (lives <= 0) {
                endGame();
            }
        }
    }, 30);

    setTimeout(() => {
        if (document.contains(objectEl)) {
            objectEl.remove();
        }
    }, finalFallDuration * 1000);
}

function updateScore() {
    scoreDisplay.textContent = score;
    updateLivesDisplay();
    updateGameSpeed();

    if (lives <= 0) {
        endGame();
    }
}

function endGame() {
    gameActive = false;
    clearInterval(spawnIntervalId);
    playSound('losing');

    const fallingObjects = document.querySelectorAll('.falling-object');
    fallingObjects.forEach(obj => obj.remove());

    const isNewRecord = score > bestScore;
    if (isNewRecord) {
        bestScore = score;
        localStorage.setItem('bestScore', bestScore);
        bestScoreDisplay.textContent = bestScore;
    }

    document.getElementById('finalScore').textContent = score;

    const recordMsg = document.getElementById('recordMessage');
    if (isNewRecord) {
        recordMsg.textContent = '🏆 NEW RECORD! 🏆';
        recordMsg.style.display = 'block';
    } else {
        recordMsg.style.display = 'none';
    }

    const bestScoreMsg = document.getElementById('bestScoreMsg');
    bestScoreMsg.textContent = `Best Score: ${bestScore}`;

    gameOverModal.show();
}

function startSpawning() {
    spawnIntervalId = setInterval(() => {
        if (gameActive) {
            createObject();
        }
    }, 800);
}

function processKeyboardInput() {
    if (!gameActive) return;

    const moveAmount = 0.7 * fallSpeed;

    if (keysPressed.ArrowLeft) {
        targetBasketPosition = Math.max(5, targetBasketPosition - moveAmount);
    }
    if (keysPressed.ArrowRight) {
        targetBasketPosition = Math.min(95, targetBasketPosition + moveAmount);
    }
}

function animationLoop() {
    processKeyboardInput();
    updateBasketPosition();
    requestAnimationFrame(animationLoop);
}

function updateLivesDisplay() {
    livesDisplay.innerHTML = '';
    const maxLives = 3;

    for (let i = 0; i < maxLives; i++) {
        const heart = document.createElement('span');
        if (i < lives) {
            heart.textContent = '❤️';
        } else {
            heart.textContent = '🖤';
        }
        heart.style.marginRight = '5px';
        livesDisplay.appendChild(heart);
    }
}

function updateGameSpeed() {
    const milestones = Math.floor(score / 100);
    fallSpeed = Math.pow(1.25, milestones);
}

document.addEventListener('keydown', (e) => {
    if (!gameActive) return;

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        keysPressed.ArrowLeft = true;
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        keysPressed.ArrowRight = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') {
        keysPressed.ArrowLeft = false;
    } else if (e.key === 'ArrowRight') {
        keysPressed.ArrowRight = false;
    }
});

// gameZone.addEventListener('mousemove', (e) => {
//     if (!gameActive) return;
//     const gameRect = gameZone.getBoundingClientRect();
//     const mouseX = e.clientX - gameRect.left;
//     targetBasketPosition = (mouseX / gameRect.width) * 100;
//     targetBasketPosition = Math.max(5, Math.min(95, targetBasketPosition));
// });

gameZone.addEventListener('touchmove', (e) => {
    if (!gameActive) return;
    const gameRect = gameZone.getBoundingClientRect();
    const touchX = e.touches[0].clientX - gameRect.left;
    targetBasketPosition = (touchX / gameRect.width) * 100;
    targetBasketPosition = Math.max(5, Math.min(95, targetBasketPosition));
});

startBtn.addEventListener('click', () => {
    gameActive = true;
    startButtonContainer.classList.add('hidden');

    if (isMuted) {
        backgroundMusic.pause();
    } else {
        backgroundMusic.playbackRate = 1.1;
        backgroundMusic.play().catch(e => console.log('Background music play error:', e));
    }

    startSpawning();
});

replayBtn.addEventListener('click', () => {
    gameOverModal.hide();
    score = 0;
    lives = 3;
    lastBoostThreshold = 0;
    fallSpeed = 1;
    missedFruitsInARow = 0;
    updateScore();

    gameActive = true;
    if (isMuted) {
        backgroundMusic.pause();
    } else {
        backgroundMusic.currentTime = 0;
        backgroundMusic.playbackRate = 1.1;
        backgroundMusic.play().catch(e => console.log('Background music play error:', e));
    }

    startSpawning();
});

startBtn.addEventListener('mouseenter', () => {
    playSound('hover');
});

replayBtn.addEventListener('mouseenter', () => {
    playSound('hover');
});

setInterval(() => {
    if (gameActive) {
        updateGameSpeed();
    }
}, 1000);

// Init and animation start
function init() {
    bestScoreDisplay.textContent = bestScore;
    updateLivesDisplay();
    updateGameSpeed();
    applyTheme(currentTheme); // apply the saved or default theme immediately
}

basket.style.left = basketPosition + '%';
animationLoop();

if (!isMuted) {
    backgroundMusic.muted = true;
    backgroundMusic.playbackRate = 1.1;
    backgroundMusic.play().catch(e => console.log('Background music play error:', e));
    backgroundMusicStarted = true;

    setTimeout(() => {
        if (!isMuted && backgroundMusicStarted) {
            backgroundMusic.muted = false;
        }
    }, 500);
}

// ------------------------ SLIDING THEME PANEL ------------------------

const themePanel = document.getElementById('themePanel');
const themeBtn = document.getElementById('themeBtn');
const closeThemePanel = document.getElementById('closeThemePanel');
const openThemeFromGame = document.getElementById('openThemeFromGame');

// Open from header
themeBtn.addEventListener('click', () => {
    themePanel.classList.toggle("open");
});

// Open from game over modal
openThemeFromGame.addEventListener('click', () => {
    gameOverModal.hide();
    themePanel.classList.add("open");
});

// Close
closeThemePanel.addEventListener('click', () => {
    themePanel.classList.remove("open");
});

// Theme changes
document.querySelectorAll('.theme-option').forEach(btn => {
    btn.addEventListener('click', () => {

        const picked = btn.dataset.theme;
        applyTheme(picked);

        // <CHANGE> Reset lives and score when selecting theme from game over modal
        score = 0;
        lives = 3;
        lastBoostThreshold = 0;
        fallSpeed = 1;
        missedFruitsInARow = 0;
        updateScore();

        gameActive = false;
        startButtonContainer.classList.remove('hidden');

    });
});

init();
