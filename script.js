const startBtn = document.getElementById('start-btn');
const gameSelect = document.getElementById('game-select');
const gameArea = document.getElementById('game-area');
const scoreDisplay = document.getElementById('score-display');
const gameTitle = document.getElementById('game-title');
const submitBtn = document.getElementById('submit-score');
const resetBtn = document.getElementById('reset-btn');
const scoreInput = document.getElementById('score-input');

let currentGame = null;
let remainingScore = 0;
let currentTarget = 1;

function startGame() {
    const selected = gameSelect.value;
    currentGame = selected;
    gameArea.classList.remove('hidden');
    scoreInput.value = '';

    if (selected === '501' || selected === '301') {
        remainingScore = parseInt(selected, 10);
        scoreDisplay.textContent = `Remaining: ${remainingScore}`;
        gameTitle.textContent = `Game: ${selected}`;
    } else {
        currentTarget = 1;
        scoreDisplay.textContent = `Hit number: ${currentTarget}`;
        gameTitle.textContent = 'Game: Around the Clock';
    }
}

function submitScore() {
    const score = parseInt(scoreInput.value, 10) || 0;
    if (currentGame === '501' || currentGame === '301') {
        remainingScore -= score;
        if (remainingScore <= 0) {
            scoreDisplay.textContent = 'Finished!';
        } else {
            scoreDisplay.textContent = `Remaining: ${remainingScore}`;
        }
    } else if (currentGame === 'clock') {
        if (score === currentTarget) {
            currentTarget += 1;
            if (currentTarget > 20) {
                scoreDisplay.textContent = 'Finished Around the Clock!';
            } else {
                scoreDisplay.textContent = `Hit number: ${currentTarget}`;
            }
        }
    }
    scoreInput.value = '';
}

function resetGame() {
    gameArea.classList.add('hidden');
    scoreDisplay.textContent = '';
    gameTitle.textContent = '';
    scoreInput.value = '';
}

startBtn.addEventListener('click', startGame);
submitBtn.addEventListener('click', submitScore);
resetBtn.addEventListener('click', resetGame);
