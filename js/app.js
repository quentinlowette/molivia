import Game from './game.js';

let game = null;
let currentWordLength = 3;
let isDailyMode = true;

const boardElement = document.getElementById('board');
const keyboardElement = document.getElementById('keyboard');

const lengthDisplay = document.getElementById('length-display');
const decreaseBtn = document.getElementById('decrease-length');
const increaseBtn = document.getElementById('increase-length');

const modeToggleBtn = document.getElementById('mode-toggle-btn');
const modeSubtitle = document.getElementById('mode-subtitle');
const newGameBtn = document.getElementById('new-game-btn');

const messageContainer = document.getElementById('message-container');

async function init() {
    try {
        const response = await fetch('./data/words.json');
        const dictionary = await response.json();

        game = new Game(dictionary);
        createKeyboardUI();
        updateHeaderUI();

        loadOrInitGame();

        decreaseBtn.addEventListener('click', () => {
            if (currentWordLength > 3) {
                currentWordLength--;
                updateHeaderUI();
                loadOrInitGame();
            }
        });

        increaseBtn.addEventListener('click', () => {
            if (currentWordLength < 8) {
                currentWordLength++;
                updateHeaderUI();
                loadOrInitGame();
            }
        });

        modeToggleBtn.addEventListener('click', () => {
            isDailyMode = !isDailyMode;
            updateHeaderUI();
            loadOrInitGame();
        });

        newGameBtn.addEventListener('click', () => {
            if (isDailyMode) return;
            startNewGame();
        });

        setupKeyboardListener();

    } catch (error) {
        console.error("Erreur lors de l'initialisation du jeu :", error);
    }
}

function loadOrInitGame() {
    const restored = game.load(currentWordLength, isDailyMode);

    if (!restored) {
        game.initialize(currentWordLength, isDailyMode);
    }

    createBoardUI();
    updateUI();
    clearMessage();

    if (game.gameOver) {
        if (game.guesses.includes(game.secretWord)) {
            showMessage('Partie déjà gagnée !', 'success', 0);
        } else {
            showMessage(`Partie terminée.<br>Le mot était : ${game.secretWord}`, 'warning', 0);
        }
    }
}

function startNewGame() {
    game.clearSave();
    game.initialize(currentWordLength, isDailyMode);
    createBoardUI();
    updateUI();
    clearMessage();
}

function showMessage(text, status = 'info', duration = 1000) {
    // Text
    messageContainer.innerHTML = text;

    // Status
    messageContainer.className = '';
    messageContainer.classList.add(status);
    messageContainer.classList.add('visible');

    if (messageContainer.timeoutId) {
        clearTimeout(messageContainer.timeoutId);
    }

    // Delay before removal
    if (duration > 0) {
        messageContainer.timeoutId = setTimeout(() => clearMessage(), duration);
    } else {
        messageContainer.classList.add('dimmed');
    }
}

function clearMessage() {
    messageContainer.className = '';
    messageContainer.textContent = '';
    if (messageContainer.timeoutId) {
        clearTimeout(messageContainer.timeoutId);
    }
}

function createBoardUI() {
    boardElement.innerHTML = '';

    boardElement.style.gridTemplateColumns = `repeat(${game.wordLength}, 1fr)`;
    boardElement.style.gridTemplateRows = `repeat(${game.maxAttempts}, 1fr)`;
    boardElement.style.setProperty('--word-length', game.wordLength);

    for (let i = 0; i < game.maxAttempts * game.wordLength; i++) {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        boardElement.appendChild(tile);
    }
}

function createKeyboardUI() {
    keyboardElement.innerHTML = '';
    const keys = [
        'A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
        'Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M',
        'Enter', 'W', 'X', 'C', 'V', 'B', 'N', '⌫'
    ];

    keys.forEach(key => {
        const button = document.createElement('button');
        button.textContent = key;
        button.classList.add('key');

        if (key === 'Enter' || key === '⌫') {
            button.classList.add('wide');
        }

        button.setAttribute('data-key', key);
        button.addEventListener('click', () => handleKeyInput(key));

        keyboardElement.appendChild(button);
    });
}

function getRowTiles(attemptIndex) {
    const tiles = boardElement.children;
    const rowTiles = [];
    for (let c = 0; c < game.wordLength; c++) {
        const tileIndex = (attemptIndex * game.wordLength) + c;
        rowTiles.push(tiles[tileIndex]);
    }
    return rowTiles;
}

function handleKeyInput(key) {
    if (!game || game.gameOver) return;

    if (key === 'Enter') {
        const currentAttempt = game.currentAttempt;
        const result = game.submitGuess();

        const rowTiles = getRowTiles(currentAttempt);

        if (!result.success) {
            showMessage(result.message, 'error');

            rowTiles.forEach(tile => tile.classList.add('shake'));
            setTimeout(() => {
                rowTiles.forEach(tile => tile.classList.remove('shake'));
            }, 1000);

            return;
        }

        const evaluation = result.evaluation;

        rowTiles.forEach((tile, index) => {
            setTimeout(() => {
                tile.classList.add('is-flipping');

                setTimeout(() => {
                    tile.classList.add(evaluation[index]);
                }, 200);

                setTimeout(() => {
                    tile.classList.remove('is-flipping');
                }, 400);
            }, index * 400);
        });

        setTimeout(() => {
            updateUI();

            if (game.gameOver) {
                if (result.status === 'win') {
                    showMessage("Victoire !", 'success', 0);
                } else {
                    showMessage(`Perdu ! Le mot était : ${game.secretWord}`, 'warning', 0);
                }
            }
        }, game.wordLength * 400 + 400);

    } else if (key === '⌫' || key === 'Backspace') {
        const success = game.removeLetter();
        if (success) {
            game.save();
            updateUI();
            animateTilePop(game.currentAttempt, game.currentColumn);
        }
    } else {
        const letter = key.toUpperCase();
        if (/^[A-Z]$/.test(letter)) {
            const success = game.addLetter(letter);
            if (success) {
                game.save();
                updateUI();
                animateTilePop(game.currentAttempt, game.currentColumn - 1);
            }
        }
    }
}

function animateTilePop(row, col) {
    const tiles = boardElement.children;
    const tileIndex = (row * game.wordLength) + col;
    const tile = tiles[tileIndex];

    if (tile) {
        tile.classList.add('pop');
        setTimeout(() => {
            tile.classList.remove('pop');
        }, 150);
    }
}

function setupKeyboardListener() {
    window.addEventListener('keydown', (event) => handleKeyInput(event.key));
}

function updateHeaderUI() {
    lengthDisplay.textContent = currentWordLength;

    if (isDailyMode) {
        modeToggleBtn.querySelectorAll('.material-symbols-outlined')[0].textContent = 'fitness_center';
        modeToggleBtn.title = "Passer en mode Entraînement";
        modeSubtitle.textContent = "Défi du jour";
        newGameBtn.classList.add('hidden');
    } else {
        modeToggleBtn.querySelectorAll('.material-symbols-outlined')[0].textContent = 'event';
        modeToggleBtn.title = "Passer en mode Mot du jour";
        modeSubtitle.textContent = "Entraînement";
        newGameBtn.classList.remove('hidden');
    }
}

function updateUI() {
    const tiles = boardElement.children;

    for (let r = 0; r < game.maxAttempts; r++) {
        const guessWord = game.guesses[r] || "";

        for (let c = 0; c < game.wordLength; c++) {
            const tileIndex = (r * game.wordLength) + c;
            const tile = tiles[tileIndex];

            const letter = guessWord[c] || "";
            tile.textContent = letter;
            tile.className = 'tile';

            if (letter !== "") {
                tile.classList.add('filled');
            }

            if (game.allEvaluations[r]) {
                tile.classList.add(game.allEvaluations[r][c]);
            }
        }
    }

    const keyButtons = keyboardElement.querySelectorAll('.key');
    keyButtons.forEach(button => {
        const key = button.getAttribute('data-key');
        const state = game.letterStates[key];

        button.classList.remove('correct', 'present', 'absent');
        if (state) {
            button.classList.add(state);
        }
    });
}

init();
