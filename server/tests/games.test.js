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

function mockDb() {
  return {
    saveFight: jest.fn().mockResolvedValue(undefined)
  };
}

function setupFullGame(collection, id) {
  collection.createGame(id);
  const game = collection.getGame(id);
  const p1 = mockSocket();
  const p2 = mockSocket();
  game.addPlayer(p1);
  game.addPlayer(p2);
  return { game, p1, p2 };
}

// ---------------------------------------------------------------------------
// GameCollection — comportamento básico
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// GameCollection — fronteiras
// ---------------------------------------------------------------------------

describe('GameCollection — fronteiras', () => {
  let collection;

  beforeEach(() => {
    collection = new GameCollection();
  });

  test('createGame aceita string vazia como ID', () => {
    expect(collection.createGame('')).toBe(true);
    expect(collection.getGame('')).toBeDefined();
  });

  test('createGame com string vazia retorna false na segunda chamada', () => {
    collection.createGame('');
    expect(collection.createGame('')).toBe(false);
  });

  test('múltiplas partidas coexistem sem interferência', () => {
    collection.createGame('a');
    collection.createGame('b');
    collection.createGame('c');
    expect(collection.getGame('a').getId()).toBe('a');
    expect(collection.getGame('b').getId()).toBe('b');
    expect(collection.getGame('c').getId()).toBe('c');
  });

  test('remover uma partida não afeta as demais', () => {
    collection.createGame('a');
    collection.createGame('b');
    collection.removeGame('a');
    expect(collection.getGame('a')).toBeUndefined();
    expect(collection.getGame('b')).toBeDefined();
  });

  test('getGame retorna undefined após removeGame', () => {
    collection.createGame('partida1');
    collection.removeGame('partida1');
    expect(collection.getGame('partida1')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Game — adição de jogadores
// ---------------------------------------------------------------------------

describe('Game — addPlayer', () => {
  let collection;

  beforeEach(() => {
    collection = new GameCollection();
  });

  test('addPlayer aceita o primeiro jogador', () => {
    collection.createGame('partida1');
    const game = collection.getGame('partida1');
    expect(game.addPlayer(mockSocket())).toBe(true);
  });

  test('addPlayer aceita o segundo jogador e emite player-connected para p1', () => {
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

  test('player-connected não é emitido com apenas um jogador', () => {
    collection.createGame('partida1');
    const game = collection.getGame('partida1');
    const s1 = mockSocket();
    game.addPlayer(s1);
    expect(s1.emit).not.toHaveBeenCalledWith('player-connected', expect.anything());
  });
});

// ---------------------------------------------------------------------------
// Game — relay de eventos entre jogadores
// ---------------------------------------------------------------------------

describe('Game — relay de eventos', () => {
  let collection, p1, p2;

  beforeEach(() => {
    collection = new GameCollection();
    ({ p1, p2 } = setupFullGame(collection, 'partida1'));
  });

  test('p1 envia event → p2 recebe', () => {
    const payload = { key: 'punch' };
    p1.trigger('event', payload);
    expect(p2.emit).toHaveBeenCalledWith('event', payload);
  });

  test('p2 envia event → p1 recebe', () => {
    const payload = { key: 'kick' };
    p2.trigger('event', payload);
    expect(p1.emit).toHaveBeenCalledWith('event', payload);
  });

  test('p1 envia life-update → p2 recebe', () => {
    const payload = { life: 80 };
    p1.trigger('life-update', payload);
    expect(p2.emit).toHaveBeenCalledWith('life-update', payload);
  });

  test('p2 envia life-update → p1 recebe', () => {
    const payload = { life: 50 };
    p2.trigger('life-update', payload);
    expect(p1.emit).toHaveBeenCalledWith('life-update', payload);
  });

  test('p1 envia position-update → p2 recebe', () => {
    const payload = { x: 100, y: 0 };
    p1.trigger('position-update', payload);
    expect(p2.emit).toHaveBeenCalledWith('position-update', payload);
  });

  test('p2 envia position-update → p1 recebe', () => {
    const payload = { x: 200, y: 0 };
    p2.trigger('position-update', payload);
    expect(p1.emit).toHaveBeenCalledWith('position-update', payload);
  });

  test('evento de p1 não ecoa de volta para p1', () => {
    p1.trigger('event', { key: 'punch' });
    const eventCalls = p1.emit.mock.calls.filter(([e]) => e === 'event');
    expect(eventCalls).toHaveLength(0);
  });

  test('evento de p2 não ecoa de volta para p2', () => {
    p2.trigger('event', { key: 'kick' });
    const eventCalls = p2.emit.mock.calls.filter(([e]) => e === 'event');
    expect(eventCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Game — disconnect aciona endGame
// ---------------------------------------------------------------------------

describe('Game — disconnect aciona endGame', () => {
  let collection, p1, p2;

  beforeEach(() => {
    collection = new GameCollection();
    ({ p1, p2 } = setupFullGame(collection, 'partida1'));
  });

  test('disconnect de p1 → p2 é desconectado como vencedor', () => {
    p1.trigger('disconnect');
    expect(p2.disconnect).toHaveBeenCalled();
  });

  test('disconnect de p2 → p1 é desconectado como vencedor', () => {
    p2.trigger('disconnect');
    expect(p1.disconnect).toHaveBeenCalled();
  });

  test('disconnect de p1 → partida removida da coleção', () => {
    p1.trigger('disconnect');
    expect(collection.getGame('partida1')).toBeUndefined();
  });

  test('disconnect de p1 → p1 não é desconectado (já saiu)', () => {
    p1.trigger('disconnect');
    expect(p1.disconnect).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Game — endGame: determinação do vencedor (fronteiras críticas)
// ---------------------------------------------------------------------------

describe('Game — endGame: determinação do vencedor', () => {
  let collection, p1, p2, game;

  beforeEach(() => {
    collection = new GameCollection();
    ({ game, p1, p2 } = setupFullGame(collection, 'partida1'));
  });

  test('endGame(0): p2 (índice 1) vence e é desconectado', () => {
    game.endGame(0);
    expect(p2.disconnect).toHaveBeenCalled();
    expect(p1.disconnect).not.toHaveBeenCalled();
  });

  test('endGame(1): p1 (índice 0) vence e é desconectado', () => {
    game.endGame(1);
    expect(p1.disconnect).toHaveBeenCalled();
    expect(p2.disconnect).not.toHaveBeenCalled();
  });

  test('endGame remove a partida da coleção', () => {
    game.endGame(0);
    expect(collection.getGame('partida1')).toBeUndefined();
  });

  test('endGame chamado duas vezes: segunda chamada é no-op', () => {
    game.endGame(0);
    p2.disconnect.mockClear();
    game.endGame(0);
    expect(p2.disconnect).not.toHaveBeenCalled();
  });

  test('endGame em partida sem jogadores não lança exceção', () => {
    collection.createGame('vazia');
    const emptyGame = collection.getGame('vazia');
    expect(() => emptyGame.endGame(0)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Game — endGame: persistência no banco
// ---------------------------------------------------------------------------

describe('Game — endGame: persistência no banco', () => {
  test('endGame(0) chama saveFight com winnerIndex=1', () => {
    const db = mockDb();
    const collection = new GameCollection(db);
    const { game } = setupFullGame(collection, 'luta-teste');
    game.endGame(0);
    expect(db.saveFight).toHaveBeenCalledWith('luta-teste', 1);
  });

  test('endGame(1) chama saveFight com winnerIndex=0', () => {
    const db = mockDb();
    const collection = new GameCollection(db);
    const { game } = setupFullGame(collection, 'luta-teste');
    game.endGame(1);
    expect(db.saveFight).toHaveBeenCalledWith('luta-teste', 0);
  });

  test('endGame sem db não chama saveFight', () => {
    const collection = new GameCollection();
    const { game } = setupFullGame(collection, 'luta-teste');
    // não deve lançar exceção nem tentar chamar saveFight
    expect(() => game.endGame(0)).not.toThrow();
  });

  test('saveFight é chamado exatamente uma vez por endGame', () => {
    const db = mockDb();
    const collection = new GameCollection(db);
    const { game } = setupFullGame(collection, 'luta-teste');
    game.endGame(0);
    expect(db.saveFight).toHaveBeenCalledTimes(1);
  });
});
