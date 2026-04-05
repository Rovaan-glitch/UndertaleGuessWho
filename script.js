const characters = [
    'Sans',
    'Papyrus',
    'Frisk',
    'Chara',
    'Toriel',
    'Asgore',
    'Undyne',
    'Alphys',
    'Mettaton',
    'Napstablook',
    'Flowey',
    'Asriel Dreemurr',
    'Grillby',
    'Burgerpants',
    'Monster Kid',
    'Gaster',
    'Mad Dummy',
    'Mad Mew Mew',
    'Temmie',
    'Nice Cream Guy',
    'Snowdrake',
    'Doggo',
    'Lesser Dog',
    'Greater Dog'
];

let socket;
let currentRoom;
let crossedOut = new Set();
let myName;
let myId;
let answerer;

document.addEventListener('DOMContentLoaded', () => {
    socket = io();

    socket.on('connect', () => {
        myId = socket.id;
    });

    // Initial screen
    document.getElementById('create-room-btn').addEventListener('click', createRoom);
    document.getElementById('join-room-btn').addEventListener('click', joinRoom);

    // In room
    document.getElementById('send-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    document.getElementById('yes-btn').addEventListener('click', () => answer(true));
    document.getElementById('no-btn').addEventListener('click', () => answer(false));

    document.getElementById('guess-btn').addEventListener('click', guessCharacter);

    // Socket events
    socket.on('room-created', (data) => {
        currentRoom = data.roomCode;
        showRoom(data.players, data.answerer);
        if (data.secretCharacter) {
            document.getElementById('secret-char-name').textContent = data.secretCharacter;
            document.getElementById('secret-character').style.display = 'block';
        }
    });

    socket.on('room-joined', (data) => {
        currentRoom = data.roomCode;
        showRoom(data.players, data.answerer);
        data.messages.forEach(msg => addMessage(msg.sender, msg.message));
    });

    socket.on('player-joined', (data) => {
        updatePlayers(data.players);
    });

    socket.on('player-left', (data) => {
        updatePlayers(data.players);
    });

    socket.on('new-message', (data) => {
        addMessage(data.sender, data.message);
        if (myId === answerer && data.sender !== myId) {
            document.getElementById('answer-buttons').style.display = 'block';
        }
    });

    socket.on('question-answered', (data) => {
        addMessage('Answerer', data.answer ? 'Yes' : 'No');
    });

    socket.on('game-won', (data) => {
        const winnerName = data.winnerName;
        addMessage('System', `${winnerName} guessed correctly! The character was ${data.character}.`);
        // Perhaps disable inputs or something
    });

    socket.on('error', (msg) => {
        alert(msg);
    });
});

function createRoom() {
    myName = document.getElementById('name-input').value.trim();
    if (!myName) return alert('Enter your name');
    const character = characters[Math.floor(Math.random() * characters.length)]; // Or let choose
    socket.emit('create-room', { name: myName, character });
}

function joinRoom() {
    myName = document.getElementById('name-input').value.trim();
    const roomCode = document.getElementById('room-code-input').value.trim().toUpperCase();
    if (!myName || !roomCode) return alert('Enter name and room code');
    socket.emit('join-room', { roomCode, name: myName });
}

function showRoom(players, ans) {
    answerer = ans;
    document.getElementById('initial-screen').style.display = 'none';
    document.getElementById('room-screen').style.display = 'block';
    document.getElementById('room-code').textContent = currentRoom;
    updatePlayers(players);
    displayCharacters();
    populateGuessSelect();
}

function updatePlayers(players) {
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = '<h3>Players:</h3>';
    players.forEach(p => {
        const div = document.createElement('div');
        div.textContent = p.name;
        playersDiv.appendChild(div);
    });
}

function displayCharacters() {
    const charsDiv = document.getElementById('characters');
    charsDiv.innerHTML = '';
    characters.forEach((char, index) => {
        const button = document.createElement('button');
        button.textContent = char;
        button.classList.add('char-btn');
        button.addEventListener('click', () => toggleCrossOut(index, button));
        charsDiv.appendChild(button);
    });
}

function toggleCrossOut(index, button) {
    if (crossedOut.has(index)) {
        crossedOut.delete(index);
        button.classList.remove('crossed');
    } else {
        crossedOut.add(index);
        button.classList.add('crossed');
    }
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    if (!message) return;
    socket.emit('send-message', { roomCode: currentRoom, message });
    addMessage('You', message);
    input.value = '';
}

function populateGuessSelect() {
    const select = document.getElementById('guess-select');
    select.innerHTML = '<option value="">Select a character to guess</option>';
    characters.forEach(char => {
        const option = document.createElement('option');
        option.value = char;
        option.textContent = char;
        select.appendChild(option);
    });
}

function guessCharacter() {
    const selected = document.getElementById('guess-select').value;
    if (!selected) return alert('Select a character to guess');
    socket.emit('guess-character', { roomCode: currentRoom, guess: selected });
}