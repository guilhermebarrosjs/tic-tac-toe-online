const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
app.use(express.static(__dirname + '/public'));

const server = http.createServer(app).listen('3000', () => console.log('Serving on localhost:3000'));
const io = socketIo(server);

function NewGame() {
    const players = {};

    function handleJoinPlayers(socket) {
        const { id } = socket;
        const playerId = id;

        for (const opponentPlayerId in players) {
            if (!players[opponentPlayerId].opponent) {
                handleAddPlayer(playerId, 'O', opponentPlayerId, socket);
                return;
            }
        }

        handleAddPlayer(playerId, 'X', undefined, socket);
    }

    function handleAddPlayer(playerId, symbol, opponent, socket) {
        if (players[playerId]) {
            return;
        }

        players[playerId] = {
            symbol: symbol,
            opponent: opponent,
            socket,
        };

        if (players[opponent]) {
            players[opponent].opponent = playerId;
        }
    }

    function handleRemovePlayer(playerId) {
        if (players[opponentOf(playerId)]) {
            players[opponentOf(playerId)].opponent = undefined;
            players[opponentOf(playerId)].symbol = 'X';
        }

        delete players[playerId];
    }

    function isGameReady(playerId) {
        if (opponentOf(playerId)) {
            if (players[opponentOf(playerId)]) {
                if (players[opponentOf(playerId)].opponent === playerId) {
                    return true;
                }
            }
        }

        return false;
    }

    function opponentOf(playerId) {
        if (players[playerId]) {
            if (!players[playerId].opponent) {
                return;
            }

            return players[playerId].opponent;
        }
    }

    return {
        players,
        isGameReady,
        opponentOf,
        handleAddPlayer,
        handleRemovePlayer,
        handleJoinPlayers,
    };
}

const game = NewGame();

io.on('connection', socket => {
    const { id } = socket;
    const playerId = id;

    console.log('New client connected with ID: ' + playerId);

    const { players, opponentOf, handleJoinPlayers, isGameReady } = game;

    handleJoinPlayers(socket);

    if (isGameReady(playerId)) {
        socket.emit('begin game', {
            symbol: players[playerId].symbol,
        });

        const opponentPlayerSocket = players[opponentOf(playerId)].socket;

        opponentPlayerSocket.emit('begin game', {
            symbol: players[opponentOf(playerId)].symbol,
        });
    }
    
    socket.on('disconnect', () => {
        console.log(`Client with ID: ${ playerId } disconnected.`);

        if (opponentOf(playerId)) {
            const opponentPlayerSocket = players[opponentOf(playerId)].socket;
            opponentPlayerSocket.emit('opponent left');
        }

        game.handleRemovePlayer(playerId);
    });

    socket.on('player move', data => {
        if (!opponentOf(playerId)) {
            return;
        }

        socket.emit('move committed', data);

        const opponentPlayerSocket = players[opponentOf(playerId)].socket;
        opponentPlayerSocket.emit('move committed', data);
    });
});