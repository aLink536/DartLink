const startBtn = document.getElementById('start-btn');
const gameSelect = document.getElementById('game-select');
const gameArea = document.getElementById('game-area');
const scoreDisplay = document.getElementById('score-display');
const gameTitle = document.getElementById('game-title');
const submitBtn = document.getElementById('submit-score');
const resetBtn = document.getElementById('reset-btn');
const dartRows = document.querySelectorAll('.dart-row');

let currentGame = null;
let remainingScore = 0;
let currentTarget = 1;

function startGame() {
    const selected = gameSelect.value;
    currentGame = selected;
    gameArea.classList.remove('hidden');
    dartRows.forEach(row => {
        row.querySelector('.multiplier').value = '1';
        row.querySelector('.value').value = '0';
    });

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
    let roundScore = 0;
    const values = [];
    dartRows.forEach(row => {
        const mult = parseInt(row.querySelector('.multiplier').value, 10);
        const val = parseInt(row.querySelector('.value').value, 10);
        roundScore += mult * val;
        values.push(val);
    });

    if (currentGame === '501' || currentGame === '301') {
        remainingScore -= roundScore;
        if (remainingScore <= 0) {
            scoreDisplay.textContent = 'Finished!';
        } else {
            scoreDisplay.textContent = `Remaining: ${remainingScore}`;
        }
    } else if (currentGame === 'clock') {
        for (const val of values) {
            if (val === currentTarget) {
                currentTarget += 1;
            }
            if (currentTarget > 20) {
                break;
            }
        }
        if (currentTarget > 20) {
            scoreDisplay.textContent = 'Finished Around the Clock!';
        } else {
            scoreDisplay.textContent = `Hit number: ${currentTarget}`;
        }
    }

    dartRows.forEach(row => {
        row.querySelector('.multiplier').value = '1';
        row.querySelector('.value').value = '0';
    });
}

function resetGame() {
    gameArea.classList.add('hidden');
    scoreDisplay.textContent = '';
    gameTitle.textContent = '';
    dartRows.forEach(row => {
        row.querySelector('.multiplier').value = '1';
        row.querySelector('.value').value = '0';
    });
}

startBtn.addEventListener('click', startGame);
submitBtn.addEventListener('click', submitScore);
resetBtn.addEventListener('click', resetGame);
