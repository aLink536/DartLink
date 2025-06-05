// =====================================
//  STATE & DOM REFERENCES
// =====================================

let peerConnection = null;
let dataChannel = null;
let legsToWin = 1;              // Legs required to win the match
let playerLegs = [];            // Legs won by each player
let startingScore = 501;        // Starting score for a leg
let currentScore = startingScore;

const gameScreen = document.getElementById('game-screen');
const startScreen = document.getElementById('start-screen');
const modeScreen = document.getElementById('mode-screen');

const history = [[]];           // History of scores (one array per leg)

let inputBuffer = '';
let inputMode = 'total';    // 'total' or 'perdart'
let perDartScores = [null, null, null];
let dartIndex = 0;
let multiplier = 'Single';

const bogeyNumbers = [159, 162, 163, 165, 166, 168, 169];

// =====================================
//  GAME MODE SELECTION
// =====================================

let gameType = 'single';        // 'single' or 'multi'

// User selects single or multiplayer
function selectGameType(type) {
    gameType = type;
    document.getElementById('single-tab').classList.toggle('active', type === 'single');
    document.getElementById('multi-tab').classList.toggle('active', type === 'multi');
    document.getElementById('online-tab').classList.toggle('active', type === 'online');

    if (type === 'online') {
        document.getElementById('online-options').classList.remove('d-none');
    } else {
        document.getElementById('online-options').classList.add('d-none');
    }

}

// After selecting game type proceed to next screen
function proceedToGameMode() {
    modeScreen.classList.add('d-none');
    if (gameType === 'multi') {
        document.getElementById('name-screen').classList.remove('d-none');
    } else {
        startScreen.classList.remove('d-none');
    }
}

// =====================================
//  PLAYER SETUP
// =====================================

let players = [];
let playerScores = [];
let currentPlayerIndex = 0;

// Capture player names and move to the game options
function continueToGameModes() {
    const name1 = document.getElementById('player1-name').value.trim() || "Player 1";
    const name2 = document.getElementById('player2-name').value.trim() || "Player 2";
    players = [name1, name2];
    playerScores = [startingScore, startingScore];
    currentPlayerIndex = 0;

    document.getElementById('name-screen').classList.add('d-none');
    startScreen.classList.remove('d-none');
}

// =====================================
//  GAME INITIALISATION
// =====================================

function startGame(mode) {
    startingScore = parseInt(mode);
    inputBuffer = '';
    perDartScores = [null, null, null];
    dartIndex = 0;
    history.length = 0;
    history.push([]); // Start first leg
    currentPlayerIndex = 0;
    legsToWin = parseInt(document.getElementById('legs-input').value) || 1;

    if (gameType === 'multi' || gameType === 'online') {
        playerLegs = [0, 0];
        playerScores = [startingScore, startingScore];
    } else {
        playerLegs = [0];
        currentScore = startingScore;
    }

    document.getElementById('name-screen').classList.add('d-none');
    document.getElementById('online-name-screen')?.classList.add('d-none');
    startScreen.classList.add('d-none');
    gameScreen.classList.remove('d-none');

    // 🔁 Send start-game message if in online mode (host only)
    if (gameType === 'online' && dataChannel?.readyState === "open" && dataChannel.label === "dartlink") {
        const msg = {
            type: "start-game",
            mode: startingScore,
            legs: legsToWin,
            players: players
        };
        dataChannel.send(JSON.stringify(msg));
    }

    updateUI();
}



// =====================================
//  SCORE INPUT (TOTAL MODE)
// =====================================

function appendScore(digit) {
    if (!isMyTurn()) return;

    if (inputBuffer.length < 3) {
        inputBuffer += digit;
        updateUI();
    }
}

// Remove entered digits in total mode
function clearScore() {
    if (!isMyTurn()) return;

    inputBuffer = '';
    updateUI();
}

// Submit the total score for the turn
function submitScore() {
    if (!isMyTurn()) {
        alert("It's not your turn.");
        return;
    }

    const score = parseInt(inputBuffer);
    if (isNaN(score) || score < 0 || score > 180) {
        alert("Please enter a valid score between 0 and 180.");
        return;
    }

    let current = gameType === 'multi' || gameType === 'online' ? playerScores[currentPlayerIndex] : currentScore;
    const newScore = current - score;
    const playerName = gameType === 'multi' || gameType === 'online' ? players[currentPlayerIndex] : "You";

    // 💥 Attempted checkout
    if (newScore === 0 && score <= 170 && !bogeyNumbers.includes(current)) {
        const finalDartDouble = confirm("Did you finish on a double or the bull?");

        if (!finalDartDouble) {
            alert("Invalid checkout! Turn is a bust.");
            history[history.length - 1].push({
                player: playerName,
                score: 'BUST',
                darts: 3,
                isCheckout: false,
                isBust: true,
                legIndex: history.length - 1
            });

            if (gameType === 'multi' || gameType === 'online') {
                currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
            }

            inputBuffer = '';
            updateUI();
            return;
        }

        // ✅ Valid checkout
        history[history.length - 1].push({
            player: playerName,
            score: score,
            darts: 3,
            isCheckout: true,
            isBust: false,
            legIndex: history.length - 1
        });

        speakScore(playerName, score);

        if (gameType === 'multi' || gameType === 'online') {
            playerScores[currentPlayerIndex] = 0;
            playerLegs[currentPlayerIndex]++;
            handleLegWin({
                isMatchOver: playerLegs[currentPlayerIndex] >= legsToWin,
                winnerName: players[currentPlayerIndex],
                resetScores: () => {
                    playerScores = [startingScore, startingScore];
                    currentPlayerIndex = 0;
                },
                latestScore: score
            });
            return;
        } else {
            currentScore = 0;
            playerLegs[0]++;
            handleLegWin({
                isMatchOver: playerLegs[0] >= legsToWin,
                winnerName: "You",
                resetScores: () => {
                    currentScore = startingScore;
                },
                latestScore: score
            });
            return;
        }
    }

    // 💥 Bust
    if (newScore < 2 || newScore < 0) {
        history[history.length - 1].push({
            player: playerName,
            score: 'BUST',
            darts: 3,
            isCheckout: false,
            isBust: true,
            legIndex: history.length - 1
        });

        if (gameType === 'multi' || gameType === 'online') {
            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        }

        inputBuffer = '';
        updateUI();
        return;
    }

    // ✅ Valid score
    if (gameType === 'multi' || gameType === 'online') {
        playerScores[currentPlayerIndex] = newScore;
    } else {
        currentScore = newScore;
    }

    history[history.length - 1].push({
        player: playerName,
        score: score,
        darts: 3,
        isCheckout: false,
        isBust: false,
        legIndex: history.length - 1
    });

    speakScore(playerName, score);

    // 🔁 Send score update over WebRTC if in online mode
    if (gameType === 'online' && dataChannel?.readyState === "open") {
        const msg = {
            type: "score",
            score: score,
            playerIndex: currentPlayerIndex
        };
        dataChannel.send(JSON.stringify(msg));
    }

    inputBuffer = '';

    if (gameType === 'multi' || gameType === 'online') {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    }

    updateUI();
}



// Use Web Speech API to announce the score
function speakScore(playerName, score) {
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel(); // stop any previous speech
        const message = `${playerName} scored ${score}`;
        const utterance = new SpeechSynthesisUtterance(message);
        speechSynthesis.speak(utterance);
    }
}


// Revert the last submitted score
function undoScore() {
    const currentLegHistory = history[history.length - 1];
    if (currentLegHistory.length === 0) {
        alert("Nothing to undo in this leg.");
        return;
    }

    const lastEntry = currentLegHistory.pop();
    const scoreToRestore = typeof lastEntry.score === 'number' ? lastEntry.score : 0;

    if (gameType === 'multi') {
        currentPlayerIndex = (currentPlayerIndex - 1 + players.length) % players.length;
        if (!lastEntry.isBust) {
            playerScores[currentPlayerIndex] += scoreToRestore;
        }
    } else if (!lastEntry.isBust) {
        currentScore += scoreToRestore;
    }

    updateUI();
}


// Remove the last dart entered in per-dart mode
function undoLastDart() {
    if (dartIndex > 0) {
        dartIndex--;
        perDartScores[dartIndex] = null;
        updateUI();
        updateCheckoutSuggestion(getPartialScore());
    }
}

// Sum of darts entered this turn
function getPartialScore() {
    return perDartScores.reduce((sum, dart) => sum + (dart || 0), 0);
}

// Switch between total entry and per-dart entry modes
function setInputMode(mode) {
    inputMode = mode;
    inputBuffer = '';
    perDartScores = [null, null, null];
    dartIndex = 0;
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show', 'active'));
    document.querySelector(`#${mode === 'total' ? 'total' : 'perdart'}`).classList.add('show', 'active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`[data-bs-target="#${mode === 'total' ? 'total' : 'perdart'}"]`).classList.add('active');
    updateUI();
}

// Highlight selected multiplier for per-dart input
function setMultiplier(value) {
    multiplier = value;
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === value);
    });
}

// Called when a leg is won
function handleLegWin({ isMatchOver, winnerName, resetScores, latestScore }) {
    // ✅ Always reset per dart state after a leg win
    perDartScores = [null, null, null];
    dartIndex = 0;

    if (isMatchOver) {
        gameScreen.classList.add('d-none');
        document.getElementById('stats-screen').classList.remove('d-none');
        renderMatchStats();
    } else {
        alert(`${winnerName} won the leg!`);
        resetScores();
        history.push([]);
        inputBuffer = '';
        updateUI();
    }
}

// Display end-of-match statistics
function renderMatchStats() {
    const container = document.getElementById('stats-container');
    container.innerHTML = '';

    const allPlayers = gameType === 'multi' ? players : ['You'];

    allPlayers.forEach(playerName => {
        const playerScores = history.flat().filter(h => h.player === playerName);
        const legsByPlayer = history.map((leg, index) => {
            return leg.filter(h => h.player === playerName).map(entry => ({
                ...entry,
                legIndex: index
            }));
        }).filter(leg => leg.length > 0);

        let totalScore = 0;
        let totalDarts = 0;
        let firstNineTotal = 0;
        let firstNineDarts = 0;
        let checkoutAttempts = 0;
        let checkouts = 0;
        let busts = 0;
        let highestFinish = 0;
        let highestScore = 0;
        let bestLeg = Infinity;
        let worstLeg = 0;

        legsByPlayer.forEach(leg => {
            let legScore = 0;
            let legDarts = 0;

            leg.forEach((entry, i) => {
                if (!entry.isBust) {
                    totalScore += entry.score;
                    legScore += entry.score;
                }

                totalDarts += entry.darts;
                legDarts += entry.darts;

                if (i < 3 && !entry.isBust) {
                    firstNineTotal += entry.score;
                    firstNineDarts += entry.darts;
                }

                if (entry.isCheckout) {
                    checkouts++;
                    if (entry.score > highestFinish) highestFinish = entry.score;
                }

                if (!entry.isBust && entry.score > highestScore) {
                    highestScore = entry.score;
                }

                if (entry.isBust) {
                    busts++;
                }
            });

            if (legDarts > 0) {
                if (legDarts < bestLeg) bestLeg = legDarts;
                if (legDarts > worstLeg) worstLeg = legDarts;
            }

            checkoutAttempts++;
        });

        const average = totalDarts ? (totalScore / totalDarts) * 3 : 0;
        const first9avg = firstNineDarts ? (firstNineTotal / firstNineDarts) * 3 : 0;
        const checkoutRate = checkoutAttempts ? (checkouts / checkoutAttempts) * 100 : 0;

        const card = document.createElement('div');
        card.className = 'col-md-6 mb-4';
        card.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h4 class="card-title text-center">${playerName}</h4>
                    <ul class="list-group list-group-flush mt-3">
                        <li class="list-group-item">3-Dart Average: <strong>${average.toFixed(2)}</strong></li>
                        <li class="list-group-item">First 9 Average: <strong>${first9avg.toFixed(2)}</strong></li>
                        <li class="list-group-item">Checkout Rate: <strong>${checkoutRate.toFixed(1)}%</strong></li>
                        <li class="list-group-item">Checkouts: <strong>${checkouts}</strong></li>
                        <li class="list-group-item">Busts: <strong>${busts}</strong></li>
                        <li class="list-group-item">Highest Finish: <strong>${highestFinish}</strong></li>
                        <li class="list-group-item">Highest Score: <strong>${highestScore}</strong></li>
                        <li class="list-group-item">Best Leg (fewest darts): <strong>${isFinite(bestLeg) ? bestLeg : '-'}</strong></li>
                        <li class="list-group-item">Worst Leg (most darts): <strong>${worstLeg || '-'}</strong></li>
                    </ul>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}




// Handle a single dart input in per-dart mode
function inputDart(base) {
    if (dartIndex >= 3) return;

    let actual;
    if (base === 25 || base === 50) {
        actual = base;
    } else {
        actual = base;
        if (multiplier === 'Double') actual *= 2;
        if (multiplier === 'Treble') actual *= 3;
    }

    perDartScores[dartIndex] = actual;
    dartIndex++;

    const totalSoFar = perDartScores.reduce((sum, s) => sum + (s || 0), 0);
    let current = gameType === 'multi' ? playerScores[currentPlayerIndex] : currentScore;
    const newScore = current - totalSoFar;

    const playerName = gameType === 'multi' ? players[currentPlayerIndex] : "You";
    const lastDart = perDartScores[dartIndex - 1];
    const isDoubleOrBull = (lastDart === 50 || (lastDart % 2 === 0 && lastDart <= 40));
    const isCheckout = newScore === 0 && isDoubleOrBull && !bogeyNumbers.includes(current);

    if (newScore < 0 || (newScore === 0 && !isCheckout)) {
        history[history.length - 1].push({
            player: playerName,
            score: 'BUST',
            darts: dartIndex,
            isCheckout: false,
            isBust: true,
            legIndex: history.length - 1
        });

        if (gameType === 'multi') {
            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        }

        perDartScores = [null, null, null];
        dartIndex = 0;
        updateUI();
        updateCheckoutSuggestion();
        return;
    }

    if (isCheckout) {
        history[history.length - 1].push({
            player: playerName,
            score: totalSoFar,
            darts: dartIndex,
            isCheckout: true,
            isBust: false,
            legIndex: history.length - 1
        });

        speakScore(playerName, totalSoFar);

        if (gameType === 'multi') {
            playerScores[currentPlayerIndex] = 0;
            playerLegs[currentPlayerIndex]++;
            handleLegWin({
                isMatchOver: playerLegs[currentPlayerIndex] >= legsToWin,
                winnerName: players[currentPlayerIndex],
                resetScores: () => {
                    playerScores = [startingScore, startingScore];
                    currentPlayerIndex = 0;
                },
                latestScore: totalSoFar
            });
        } else {
            currentScore = 0;
            playerLegs[0]++;
            handleLegWin({
                isMatchOver: playerLegs[0] >= legsToWin,
                winnerName: "You",
                resetScores: () => {
                    currentScore = startingScore;
                },
                latestScore: totalSoFar
            });
        }
        return;
    }

    if (dartIndex === 3) {
        if (gameType === 'multi') {
            playerScores[currentPlayerIndex] = newScore;
        } else {
            currentScore = newScore;
        }

        history[history.length - 1].push({
            player: playerName,
            score: totalSoFar,
            darts: 3,
            isCheckout: false,
            isBust: false,
            legIndex: history.length - 1
        });

        speakScore(playerName, totalSoFar);

        if (gameType === 'multi') {
            currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        }

        perDartScores = [null, null, null];
        dartIndex = 0;
    }

    updateUI();
    updateCheckoutSuggestion(getPartialScore());
}






// Lookup table for checkout routes
function getCheckoutSuggestion(score) {
    const checkouts = {
        170: "T20, T20, Bull", 167: "T20, T19, Bull", 164: "T20, T18, Bull",
        161: "T20, T17, Bull", 160: "T20, T20, D20", 158: "T20, T20, D19",
        157: "T20, T19, D20", 156: "T20, T20, D18", 155: "T20, T19, D19",
        154: "T20, T18, D20", 153: "T20, T19, D18", 152: "T20, T20, D16",
        151: "T20, T17, D20", 150: "T20, T18, D18", 149: "T20, T19, D16",
        148: "T20, T16, D20", 147: "T20, T17, D18", 146: "T20, T18, D16",
        145: "T20, T15, D20", 144: "T20, T20, D12", 143: "T20, T17, D16",
        142: "T20, T14, D20", 141: "T20, T19, D12", 140: "T20, T20, D10",
        139: "T19, T14, D20", 138: "T20, T18, D12", 137: "T17, T18, D16",
        136: "T20, T20, D8", 135: "Bull, T15, D20", 134: "T20, T14, D16",
        133: "T20, T19, D8", 132: "Bull, Bull, D16", 131: "T19, T14, D16",
        130: "T20, T20, D5", 129: "T19, T16, D12", 128: "T18, T14, D16",
        127: "T20, T17, D8", 126: "T19, T19, D6", 125: "25, T20, D20",
        124: "T20, T16, D8", 123: "T19, T16, D9", 122: "T18, T20, D4",
        121: "T20, T11, D14", 120: "T20, 20, D20", 119: "T19, 10, D16",
        118: "T20, 18, D20", 117: "T20, 17, D20", 116: "T20, 16, D20",
        115: "T20, 15, D20", 114: "T20, 14, D20", 113: "T20, 13, D20",
        112: "T20, 12, D20", 111: "T20, 11, D20", 110: "T20, 10, D20",
        109: "T20, 9, D20", 108: "T20, 8, D20", 107: "T20, 7, D20",
        106: "T20, 6, D20", 105: "T20, 5, D20", 104: "T18, 18, D16",
        103: "T17, 12, D20", 102: "T20, 10, D16", 101: "T17, 10, D20",
        100: "T20, D20", 99: "T19, 10, D16", 98: "T20, D19", 97: "T19, D20",
        96: "T20, D18", 95: "T19, D19", 94: "T18, D20", 93: "T19, D18",
        92: "T20, D16", 91: "T17, D20", 90: "T18, D18", 89: "T19, D16",
        88: "T16, D20", 87: "T17, D18", 86: "T18, D16", 85: "T15, D20",
        84: "T20, D12", 83: "T17, D16", 82: "Bull, D16", 81: "T15, D18",
        80: "T20, D10", 79: "T13, D20", 78: "T18, D12", 77: "T15, D16",
        76: "T20, D8", 75: "T17, D12", 74: "T14, D16", 73: "T19, D8",
        72: "T16, D12", 71: "T13, D16", 70: "T18, D8", 69: "T19, D6",
        68: "T20, D4", 67: "T17, D8", 66: "T10, D18", 65: "25, D20",
        64: "T16, D8", 63: "T13, D12", 62: "T10, D16", 61: "25, D18",
        60: "20, D20", 59: "19, D20", 58: "18, D20", 57: "17, D20",
        56: "16, D20", 55: "15, D20", 54: "14, D20", 53: "13, D20",
        52: "12, D20", 51: "11, D20", 50: "10, D20", 49: "9, D20",
        48: "8, D20", 47: "15, D16", 46: "14, D16", 45: "13, D16",
        44: "12, D16", 43: "11, D16", 42: "10, D16", 41: "9, D16",
        40: "D20", 39: "7, D16", 38: "D19", 37: "5, D16", 36: "D18",
        35: "3, D16", 34: "D17", 33: "1, D16", 32: "D16", 31: "15, D8",
        30: "D15", 29: "13, D8", 28: "D14", 27: "11, D8", 26: "D13",
        25: "9, D8", 24: "D12", 23: "7, D8", 22: "D11", 21: "5, D8",
        20: "D10", 19: "3, D8", 18: "D9", 17: "1, D8", 16: "D8",
        15: "7, D4", 14: "D7", 13: "5, D4", 12: "D6", 11: "3, D4",
        10: "D5", 9: "1, D4", 8: "D4", 7: "3, D2", 6: "D3",
        5: "1, D2", 4: "D2", 3: "1, D1", 2: "D1"
    };

    return checkouts[score] || null;
}

// Display a suggested checkout route (if any)
function updateCheckoutSuggestion(scoreOverride = null) {
    const activeScore = gameType === 'multi' ? playerScores[currentPlayerIndex] : currentScore;
    const score = scoreOverride !== null ? activeScore - scoreOverride : activeScore;
    const suggestionBox = document.getElementById('checkout-suggestion');
    const suggestionText = document.getElementById('checkout-text');
    if (bogeyNumbers.includes(score)) {
        suggestionText.textContent = "No checkout possible";
        suggestionBox.classList.remove('d-none');
        suggestionBox.classList.remove('alert-info');
        suggestionBox.classList.add('alert-danger');
    } else {
        const suggestion = getCheckoutSuggestion(score);
        if (suggestion) {
            suggestionText.textContent = suggestion;
            suggestionBox.classList.remove('d-none');
            suggestionBox.classList.remove('alert-danger');
            suggestionBox.classList.add('alert-info');
        } else {
            suggestionBox.classList.add('d-none');
        }
    }
}


// Reset state and return to the menu screens
function goToMenu() {
    const confirmReset = confirm("Are you sure you want to quit the game and return to the main menu?");
    if (!confirmReset) return;

    players = [];
    playerScores = [];
    playerLegs = [];

    gameScreen.classList.add('d-none');
    startScreen.classList.add('d-none');
    modeScreen.classList.remove('d-none');
    document.getElementById('stats-screen').classList.add('d-none'); // ✅ Hide stats screen

    currentScore = startingScore;
    history.length = 0;
    inputBuffer = '';
    perDartScores = [null, null, null];
    dartIndex = 0;
    multiplier = 'Single';
    inputMode = 'total';

    setInputMode('total');
    setMultiplier('Single');

    document.getElementById('win-screen').classList.add('d-none');
    document.getElementById('checkout-suggestion').classList.add('d-none');
    document.getElementById('win-screen').innerHTML = `
        <strong>🎉 Game Over!</strong> You've checked out successfully.
    `;

    updateUI();
}




// Refresh on-screen values
function updateUI() {
    renderPlayerScores();

    if (currentScore === 0) {
        document.getElementById('win-screen').classList.remove('d-none');
    } else {
        document.getElementById('win-screen').classList.add('d-none');
    }

    updateCheckoutSuggestion(getPartialScore());

    document.getElementById('score-display').textContent = inputBuffer || '0';

    document.querySelectorAll('.dart-score-box').forEach((box, index) => {
        const score = perDartScores[index];
        box.textContent = score !== null ? (score === 0 ? 'M' : score) : '-';
        box.classList.toggle('active', index === dartIndex);
    });

    const historyList = document.getElementById('score-history');
    historyList.innerHTML = '';

    if (gameType === 'multi') {
        const row = document.createElement('div');
        row.className = 'row';

        const playerHistories = players.map(name => ({
            name,
            list: [],
        }));

        const currentLegIndex = history.length - 1;
        const currentLeg = history[currentLegIndex];

        currentLeg.forEach(entry => {
            const player = playerHistories.find(p => p.name === entry.player);
            if (player) {
                player.list.push(`-${entry.score}`);
            }
        });

        playerHistories.forEach(player => {
            const col = document.createElement('div');
            col.className = 'col';

            const card = document.createElement('div');
            card.className = 'card mb-3';

            const cardBody = document.createElement('div');
            cardBody.className = 'card-body';

            const heading = document.createElement('h6');
            heading.textContent = player.name;
            heading.className = 'card-title text-center';

            const ul = document.createElement('ul');
            ul.className = 'list-group';

            player.list.slice().reverse().forEach(text => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = text;
                ul.appendChild(li);
            });

            cardBody.appendChild(heading);
            cardBody.appendChild(ul);
            card.appendChild(cardBody);
            col.appendChild(card);
            row.appendChild(col);
        });

        historyList.appendChild(row);
    } else {
        const currentLeg = history[history.length - 1];
        currentLeg.slice().reverse().forEach(entry => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = `-${entry.score}`;
            historyList.appendChild(li);
        });
    }
}





// Draw the player score panel(s)
function renderPlayerScores() {
    const playersContainer = document.getElementById('players');
    playersContainer.innerHTML = '';

    if (gameType === 'multi') {
        players.forEach((name, index) => {
            // Compute player's total darts and score (excluding busts)
            const entries = history.flat().filter(h => h.player === name && !h.isBust);
            const totalDarts = entries.reduce((sum, e) => sum + e.darts, 0);
            const totalScore = entries.reduce((sum, e) => sum + e.score, 0);
            const average = totalDarts > 0 ? ((totalScore / totalDarts) * 3).toFixed(2) : '-';

            const playerDiv = document.createElement('div');
            const isActive = index === currentPlayerIndex;
            const isMyTurnNow = gameType !== 'online' || players[currentPlayerIndex] === onlinePlayerName;
            playerDiv.className = `text-center flex-fill ${isActive && isMyTurnNow ? 'fw-bold text-primary' : ''}`;

            playerDiv.innerHTML = `
                <div>${name}</div>
                <div style="font-size: 1.5rem;">${playerScores[index]}</div>
                <div style="font-size: 0.9rem;">Legs: ${playerLegs[index]}</div>
                <div style="font-size: 0.8rem;">Avg: ${average}</div>
            `;
            playersContainer.appendChild(playerDiv);
        });
    } else {
        playersContainer.innerHTML = `
            <div class="text-center w-100">
                <div>Score</div>
                <div style="font-size: 1.5rem;">${currentScore}</div>
            </div>
        `;
    }
}


function generateLobbyCode(length = 5) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function createOnlineLobby() {
    const lobbyCode = generateLobbyCode();
    const lobbyRef = firebase.database().ref(`lobbies/${lobbyCode}`);

    peerConnection = new RTCPeerConnection();

    dataChannel = peerConnection.createDataChannel("dartlink");
    setupDataChannel();

    peerConnection.createOffer().then(offer => {
        return peerConnection.setLocalDescription(offer).then(() => offer);
    }).then(offer => {
        return lobbyRef.set({
            createdAt: Date.now(),
            offer: JSON.stringify(offer),
            answer: null
        });
    }).then(() => {
        alert(`Lobby created! Share this code: ${lobbyCode}`);

        // ⬇️ Transition to name input screen
        document.getElementById('mode-screen').classList.add('d-none');
        document.getElementById('online-options').classList.add('d-none');
        document.getElementById('online-name-screen').classList.remove('d-none');

        // ⬇️ Listen for answer from guest
        lobbyRef.on("value", snapshot => {
            const data = snapshot.val();
            if (data && data.answer && !peerConnection.currentRemoteDescription) {
                const answer = JSON.parse(data.answer);
                peerConnection.setRemoteDescription(answer);
            }
        });
    }).catch(err => {
        alert("Error setting up host: " + err.message);
    });
}

function isMyTurn() {
    if (gameType !== 'online') return true;
    return players[currentPlayerIndex] === onlinePlayerName;
}



function setupDataChannel() {
    dataChannel.onopen = () => {
        console.log("✅ DataChannel open!");
        dataChannel.send(JSON.stringify({ type: "hello", from: "host" }));
    };

    dataChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("📩 Received:", message);

        // 🎯 Start game from host
        if (message.type === "start-game") {
            startingScore = message.mode;
            legsToWin = message.legs;
            players = message.players;
            playerScores = [startingScore, startingScore];
            currentPlayerIndex = 0;
            playerLegs = [0, 0];
            history.length = 0;
            history.push([]);

            inputBuffer = '';
            perDartScores = [null, null, null];
            dartIndex = 0;

            document.getElementById('online-name-screen').classList.add('d-none');
            document.getElementById('start-screen').classList.add('d-none');
            document.getElementById('game-screen').classList.remove('d-none');

            setInputMode('total');
            setMultiplier('Single');
            updateUI();
        }

        // 🧮 Score update from remote player
        if (message.type === "score") {
            const playerName = players[message.playerIndex];
            const current = playerScores[message.playerIndex];
            const newScore = current - message.score;

            if (newScore < 2 || newScore < 0) {
                history[history.length - 1].push({
                    player: playerName,
                    score: 'BUST',
                    darts: 3,
                    isCheckout: false,
                    isBust: true,
                    legIndex: history.length - 1
                });
            } else {
                playerScores[message.playerIndex] = newScore;
                history[history.length - 1].push({
                    player: playerName,
                    score: message.score,
                    darts: 3,
                    isCheckout: false,
                    isBust: false,
                    legIndex: history.length - 1
                });
            }

            currentPlayerIndex = (message.playerIndex + 1) % players.length;
            updateUI();
        }

        // You can add more types here later: "bust", "checkout", "undo", etc.
    };

    dataChannel.onerror = (err) => {
        console.error("DataChannel error:", err);
    };

    dataChannel.onclose = () => {
        console.log("❌ DataChannel closed");
    };
}



function joinOnlineLobby() {
    const lobbyCode = document.getElementById("lobby-code-input").value.trim().toUpperCase();
    if (!lobbyCode) return alert("Please enter a lobby code.");

    const lobbyRef = firebase.database().ref(`lobbies/${lobbyCode}`);

    lobbyRef.get().then(snapshot => {
        const data = snapshot.val();
        if (!data || !data.offer) {
            throw new Error("Invalid or inactive lobby code.");
        }

        peerConnection = new RTCPeerConnection();

        peerConnection.ondatachannel = event => {
            dataChannel = event.channel;
            setupDataChannel();
        };

        const offer = JSON.parse(data.offer);
        return peerConnection.setRemoteDescription(offer).then(() => {
            return peerConnection.createAnswer();
        }).then(answer => {
            return peerConnection.setLocalDescription(answer).then(() => answer);
        }).then(answer => {
            return lobbyRef.update({
                answer: JSON.stringify(answer)
            });
        });
    }).then(() => {
        alert("✅ Connected to host!");

        // ⬇️ Transition to name input screen
        document.getElementById('mode-screen').classList.add('d-none');
        document.getElementById('online-options').classList.add('d-none');
        document.getElementById('online-name-screen').classList.remove('d-none');
    }).catch(err => {
        alert("Failed to join lobby: " + err.message);
    });
}


function checkIfBothNamesSet() {
    if (onlinePlayerName && remotePlayerName) {
        players = [onlinePlayerName, remotePlayerName];

        document.getElementById('online-name-screen').classList.add('d-none');

        if (peerConnection && dataChannel && dataChannel.readyState === "open" && dataChannel.label === "dartlink") {
            const isHost = dataChannel.readyState === "open" && dataChannel.ordered; // crude way to detect
            if (isHost) {
                // ✅ HOST gets to choose game mode
                document.getElementById('start-screen').classList.remove('d-none');
            } else {
                // 🚫 GUEST waits for host to start the game
                const waiting = document.createElement('div');
                waiting.className = "text-muted py-4";
                waiting.innerHTML = "<em>Waiting for host to choose a game mode...</em>";
                document.getElementById('online-name-screen').appendChild(waiting);
            }
        }
    }
}





// Show game type picker on load
modeScreen.classList.remove('d-none');
startScreen.classList.add('d-none');
gameScreen.classList.add('d-none');

// Kick things off
updateUI();