const fc = require('fast-check');
const { GameCollection } = require('../games');

describe('GameCollection — fuzzing', () => {
  test('createGame não lança exceção para qualquer string', () => {
    fc.assert(
      fc.property(fc.string(), (name) => {
        const collection = new GameCollection();
        expect(() => collection.createGame(name)).not.toThrow();
      }),
      { numRuns: 200 }
    );
  });

  test('getGame não lança exceção para qualquer valor de entrada', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const collection = new GameCollection();
        expect(() => collection.getGame(input)).not.toThrow();
      }),
      { numRuns: 200 }
    );
  });

  test('removeGame não lança exceção para qualquer valor de entrada', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        const collection = new GameCollection();
        expect(() => collection.removeGame(input)).not.toThrow();
      }),
      { numRuns: 200 }
    );
  });

  test('createGame seguido de getGame é consistente', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const collection = new GameCollection();
        collection.createGame(name);
        const game = collection.getGame(name);
        expect(game).toBeDefined();
        expect(game.getId()).toBe(name);
      }),
      { numRuns: 200 }
    );
  });

  test('createGame retorna false para nome duplicado (invariante)', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const collection = new GameCollection();
        const first = collection.createGame(name);
        const second = collection.createGame(name);
        expect(first).toBe(true);
        expect(second).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  test('removeGame após createGame retorna true', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1 }), (name) => {
        const collection = new GameCollection();
        collection.createGame(name);
        expect(collection.removeGame(name)).toBe(true);
      }),
      { numRuns: 200 }
    );
  });
});
