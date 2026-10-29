class Game {
    constructor(dictionary) {
        this.dictionary = dictionary;
        this.wordLength = 5;
        this.maxAttempts = 6;
        this.currentAttempt = 0;
        this.currentColumn = 0;
        this.secretWord = "";
        this.isDaily = false;
        this.gameOver = false;
        this.guesses = [];
        this.letterStates = {};
        this.allEvaluations = [];
    }

    initialize(length, isDaily) {
        this.wordLength = length;
        this.isDaily = isDaily;
        this.currentAttempt = 0;
        this.currentColumn = 0;
        this.gameOver = false;
        this.guesses = Array(this.maxAttempts).fill("");
        this.letterStates = {};
        this.allEvaluations = [];

        const wordsList = this.dictionary[this.wordLength];

        if (this.isDaily) {
            const dateStr = new Date().toISOString().slice(0, 10);
            const index = this.getDailyIndex(dateStr, this.wordLength, wordsList.length);
            this.secretWord = wordsList[index];
        } else {
            const randomIndex = Math.floor(Math.random() * wordsList.length);
            this.secretWord = wordsList[randomIndex];
        }

        this.save();
    }

    getStorageKey() {
        if (this.isDaily) {
            const dateStr = new Date().toISOString().slice(0, 10);
            return `molivia_save_daily_${dateStr}_${this.wordLength}`;
        } else {
            return `molivia_save_training_${this.wordLength}`;
        }
    }

    save() {
        const storageKey = this.getStorageKey();
        const savedData = {
            secretWord: this.secretWord,
            guesses: this.guesses,
            currentAttempt: this.currentAttempt,
            currentColumn: this.currentColumn,
            isDaily: this.isDaily,
            gameOver: this.gameOver,
            allEvaluations: this.allEvaluations,
            letterStates: this.letterStates,
        };
        localStorage.setItem(storageKey, JSON.stringify(savedData));
    }

    load(length, isDaily) {
        this.wordLength = length;
        this.isDaily = isDaily;
        const storageKey = this.getStorageKey();
        const savedData = localStorage.getItem(storageKey);

        if (!savedData) return false;

        try {
            const data = JSON.parse(savedData);

            this.secretWord = data.secretWord;
            this.guesses = data.guesses;
            this.currentAttempt = data.currentAttempt;
            this.currentColumn = data.currentColumn;
            this.isDaily = data.isDaily ?? isDaily;
            this.gameOver = data.gameOver;
            this.allEvaluations = data.allEvaluations || [];
            this.letterStates = data.letterStates || {};

            return true;
        } catch (error) {
            console.error("Erreur lors du chargement de la sauvegarde :", error);
            return false;
        }
    }

    clearSave() {
        const storageKey = this.getStorageKey();
        localStorage.removeItem(storageKey);
    }

    getDailyIndex(dateStr, length, totalWords) {
        let hash = 0;
        const str = `${dateStr}-${length}`;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % totalWords;
    }

    addLetter(letter) {
        if (this.gameOver || this.currentColumn >= this.wordLength) return false;

        let currentGuess = this.guesses[this.currentAttempt] || "";
        this.guesses[this.currentAttempt] = currentGuess + letter.toUpperCase();
        this.currentColumn++;
        return true;
    }

    removeLetter() {
        if (this.gameOver || this.currentColumn <= 0) return false;

        let currentGuess = this.guesses[this.currentAttempt] || "";
        this.guesses[this.currentAttempt] = currentGuess.slice(0, -1);
        this.currentColumn--;
        return true;
    }

    submitGuess() {
        const guess = this.guesses[this.currentAttempt];

        if (guess.length !== this.wordLength) {
            return { success: false, message: "Pas assez de lettres" };
        }

        if (!this.dictionary[this.wordLength].includes(guess)) {
            return { success: false, message: "Mot inconnu" };
        }

        const evaluation = this.evaluateGuess(this.secretWord, guess);
        this.allEvaluations.push(evaluation);

        for (let i = 0; i < guess.length; i++) {
            const letter = guess[i];
            const state = evaluation[i];
            this.updateLetterState(letter, state);
        }

        if (guess === this.secretWord) {
            this.gameOver = true;
            this.save();
            return { success: true, status: "win", evaluation };
        }

        this.currentAttempt++;
        this.currentColumn = 0;

        if (this.currentAttempt >= this.maxAttempts) {
            this.gameOver = true;
            this.save();
            return { success: true, status: "lose", evaluation };
        }

        this.save();
        return { success: true, status: "continue", evaluation };
    }

    evaluateGuess(secret, guess) {
        const result = Array(guess.length).fill('absent');
        const secretChars = secret.split('');
        const guessChars = guess.split('');

        for (let i = 0; i < guessChars.length; i++) {
            if (guessChars[i] === secretChars[i]) {
                result[i] = 'correct';
                secretChars[i] = null;
                guessChars[i] = null;
            }
        }

        for (let i = 0; i < guessChars.length; i++) {
            if (guessChars[i] !== null) {
                const index = secretChars.indexOf(guessChars[i]);
                if (index !== -1) {
                    result[i] = 'present';
                    secretChars[index] = null;
                }
            }
        }

        return result;
    }

    updateLetterState(letter, state) {
        const priority = { 'correct': 3, 'present': 2, 'absent': 1 };
        const currentState = this.letterStates[letter];

        if (!currentState || priority[state] > priority[currentState]) {
            this.letterStates[letter] = state;
        }
    }
}

export default Game;
