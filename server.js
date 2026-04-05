const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// Rooms: roomCode -> { players: [], secretCharacter: string, answerer: socketId }
const rooms = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create-room', (data) => {
        const roomCode = generateRoomCode();
        const secretCharacter = data.character;
        rooms[roomCode] = {
            players: [{ id: socket.id, name: data.name }],
            secretCharacter,
            answerer: socket.id,
            messages: []
        };
        socket.join(roomCode);
        socket.emit('room-created', { roomCode, players: rooms[roomCode].players, answerer: rooms[roomCode].answerer, secretCharacter: rooms[roomCode].secretCharacter });
    });

    socket.on('join-room', (data) => {
        const { roomCode, name } = data;
        if (rooms[roomCode]) {
            rooms[roomCode].players.push({ id: socket.id, name });
            socket.join(roomCode);
            const secretCharacter = rooms[roomCode].answerer === socket.id ? rooms[roomCode].secretCharacter : null;
            socket.emit('room-joined', { roomCode, players: rooms[roomCode].players, messages: rooms[roomCode].messages, answerer: rooms[roomCode].answerer, secretCharacter });
            socket.to(roomCode).emit('player-joined', { players: rooms[roomCode].players });
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('send-message', (data) => {
        const { roomCode, message } = data;
        if (rooms[roomCode]) {
            const player = rooms[roomCode].players.find(p => p.id === socket.id);
            const senderName = player ? player.name : 'Unknown';
            const messageObject = { senderId: socket.id, senderName, message };
            rooms[roomCode].messages.push(messageObject);
            io.to(roomCode).emit('new-message', messageObject);
        }
    });

    socket.on('answer-question', (data) => {
        const { roomCode, answer } = data;
        if (rooms[roomCode] && socket.id === rooms[roomCode].answerer) {
            io.to(roomCode).emit('question-answered', { answer });
        }
    });

    socket.on('guess-character', (data) => {
        const { roomCode, guess } = data;
        if (rooms[roomCode]) {
            const player = rooms[roomCode].players.find(p => p.id === socket.id);
            if (guess === rooms[roomCode].secretCharacter) {
                io.to(roomCode).emit('game-won', { winnerName: player.name, character: guess });
            } else {
                socket.emit('error', 'Wrong guess!');
            }
        }
    });

    socket.on('disconnect', () => {
        // Remove player from rooms
        for (const roomCode in rooms) {
            rooms[roomCode].players = rooms[roomCode].players.filter(p => p.id !== socket.id);
            if (rooms[roomCode].players.length === 0) {
                delete rooms[roomCode];
            } else {
                io.to(roomCode).emit('player-left', { players: rooms[roomCode].players });
            }
        }
    });
});

function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});