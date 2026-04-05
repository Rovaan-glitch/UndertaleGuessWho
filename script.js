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
        showRoom(data.players, data.answerer, data.secretCharacter);
    });

    socket.on('room-joined', (data) => {
        currentRoom = data.roomCode;
        showRoom(data.players, data.answerer, data.secretCharacter);
        data.messages.forEach(msg => addMessage(msg.senderName || msg.sender, msg.message, msg.senderId === myId));
    });

    socket.on('player-joined', (data) => {
        updatePlayers(data.players);
    });

    socket.on('player-left', (data) => {
        updatePlayers(data.players);
    });

    socket.on('new-message', (data) => {
        const senderName = data.senderId === myId ? 'You' : data.senderName || 'Player';
        addMessage(senderName, data.message, data.senderId === myId);
        if (myId === answerer && data.senderId !== myId) {
            document.getElementById('answer-buttons').style.display = 'flex';
        }
    });

    socket.on('question-answered', (data) => {
        addMessage('Answerer', data.answer ? 'Yes' : 'No', false, true);
        document.getElementById('answer-buttons').style.display = 'none';
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

function showRoom(players, ans, secretCharacter) {
    answerer = ans;
    document.getElementById('initial-screen').style.display = 'none';
    document.getElementById('room-screen').style.display = 'block';
    document.getElementById('room-code').textContent = currentRoom;
    updatePlayers(players);
    displayCharacters();
    populateGuessSelect();
    displayRole();
    if (myId === answerer && secretCharacter) {
        document.getElementById('secret-char-name').textContent = secretCharacter;
        document.getElementById('secret-character').style.display = 'block';
    } else {
        document.getElementById('secret-character').style.display = 'none';
    }
    document.getElementById('answer-buttons').style.display = 'none';
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
    input.value = '';
}

function displayRole() {
    const roleLabel = document.getElementById('role-label');
    if (myId === answerer) {
        roleLabel.textContent = 'Role: Answerer';
        roleLabel.classList.add('answerer');
        roleLabel.classList.remove('guesser');
    } else {
        roleLabel.textContent = 'Role: Guesser';
        roleLabel.classList.add('guesser');
        roleLabel.classList.remove('answerer');
    }
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

function addMessage(sender, message, isSelf = false, isSystem = false) {
    const chat = document.getElementById('chat');
    const div = document.createElement('div');
    div.className = 'chat-message';
    if (isSystem) div.classList.add('system-message');
    else if (isSelf) div.classList.add('self-message');
    else div.classList.add('other-message');

    const nameNode = document.createElement('span');
    nameNode.className = 'chat-sender';
    nameNode.textContent = isSystem ? '' : `${sender}: `;

    const textNode = document.createElement('span');
    textNode.textContent = message;
    div.appendChild(nameNode);
    div.appendChild(textNode);
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}