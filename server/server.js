require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');
const { GameCollection } = require('./games');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const games = new GameCollection(db);

app.use(express.static(__dirname + '/../game'));

app.get('/api/history', async (req, res) => {
  try {
    const fights = await db.getFights();
    res.json(fights);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const Responses = {
  SUCCESS: 0,
  GAME_EXISTS: 1,
  GAME_NOT_EXISTS: 2,
  GAME_FULL: 3
};

const Requests = {
  CREATE_GAME: 'create-game',
  JOIN_GAME: 'join-game'
};

io.on('connection', (socket) => {
  socket.on(Requests.CREATE_GAME, (gameName) => {
    if (games.createGame(gameName)) {
      games.getGame(gameName).addPlayer(socket);
      socket.emit('response', Responses.SUCCESS);
    } else {
      socket.emit('response', Responses.GAME_EXISTS);
    }
  });

  socket.on(Requests.JOIN_GAME, (gameName) => {
    const game = games.getGame(gameName);
    if (!game) {
      socket.emit('response', Responses.GAME_NOT_EXISTS);
    } else {
      if (game.addPlayer(socket)) {
        socket.emit('response', Responses.SUCCESS);
      } else {
        socket.emit('response', Responses.GAME_FULL);
      }
    }
  });
});

db.init().catch((err) => {
  console.warn('Database unavailable:', err.message);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
