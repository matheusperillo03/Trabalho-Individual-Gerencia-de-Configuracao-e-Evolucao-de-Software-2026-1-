const { GameCollection } = require('../games');

function mockSocket() {
  const handlers = {};
  return {
    emit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn((event, handler) => { handlers[event] = handler; }),
    trigger: (event, data) => { if (handlers[event]) handlers[event](data); }
  };
}

describe('GameCollection', () => {
  let collection;

  beforeEach(() => {
    collection = new GameCollection();
  });

  test('createGame cria um jogo e retorna true', () => {
    expect(collection.createGame('partida1')).toBe(true);
  });

  test('createGame retorna false se o jogo já existe', () => {
    collection.createGame('partida1');
    expect(collection.createGame('partida1')).toBe(false);
  });

  test('getGame retorna o jogo criado', () => {
    collection.createGame('partida1');
    const game = collection.getGame('partida1');
    expect(game).toBeDefined();
    expect(game.getId()).toBe('partida1');
  });

  test('removeGame remove o jogo e retorna true', () => {
    collection.createGame('partida1');
    expect(collection.removeGame('partida1')).toBe(true);
    expect(collection.getGame('partida1')).toBeUndefined();
  });

  test('removeGame retorna false para jogo inexistente', () => {
    expect(collection.removeGame('inexistente')).toBe(false);
  });
});

describe('Game', () => {
  let collection;

  beforeEach(() => {
    collection = new GameCollection();
  });

  test('addPlayer aceita o primeiro jogador', () => {
    collection.createGame('partida1');
    const game = collection.getGame('partida1');
    expect(game.addPlayer(mockSocket())).toBe(true);
  });

  test('addPlayer aceita o segundo jogador e emite player-connected', () => {
    collection.createGame('partida1');
    const game = collection.getGame('partida1');
    const s1 = mockSocket();
    const s2 = mockSocket();
    game.addPlayer(s1);
    game.addPlayer(s2);
    expect(s1.emit).toHaveBeenCalledWith('player-connected', 0);
  });

  test('addPlayer retorna false quando a partida está cheia', () => {
    collection.createGame('partida1');
    const game = collection.getGame('partida1');
    game.addPlayer(mockSocket());
    game.addPlayer(mockSocket());
    expect(game.addPlayer(mockSocket())).toBe(false);
  });
});
