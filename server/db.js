const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fights (
      id SERIAL PRIMARY KEY,
      game_name VARCHAR(255) NOT NULL,
      winner_player INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function saveFight(gameName, winnerPlayer) {
  await pool.query(
    'INSERT INTO fights (game_name, winner_player) VALUES ($1, $2)',
    [gameName, winnerPlayer]
  );
}

async function getFights() {
  const result = await pool.query(
    'SELECT * FROM fights ORDER BY created_at DESC LIMIT 50'
  );
  return result.rows;
}

module.exports = { init, saveFight, getFights };
