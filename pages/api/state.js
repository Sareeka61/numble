// pages/api/state.js
import { kv } from '@vercel/kv';

const GAME_KEY = 'number-duel-game';
const DIGITS = 4;
const MAX_GUESSES = 6;

// if these are missing, use in-memory game (for local dev)
const USE_MEMORY =
  !process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN;

let memoryGame = null;

function randomDigit() {
  return Math.floor(Math.random() * 10).toString();
}

function generateTargetNumber() {
  let s = '';
  for (let i = 0; i < DIGITS; i++) s += randomDigit();
  return s;
}

export function createNewGameState() {
  return {
    target: generateTargetNumber(),
    guesses: { 1: [], 2: [] }, // each: { value, colors }
    winner: null,
    gameOver: false,
  };
}

export async function getOrCreateGame() {
  if (USE_MEMORY) {
    if (!memoryGame) memoryGame = createNewGameState();
    return memoryGame;
  }

  let game = await kv.get(GAME_KEY);
  if (!game) {
    game = createNewGameState();
    await kv.set(GAME_KEY, game);
  }
  return game;
}

export async function saveGame(game) {
  if (USE_MEMORY) {
    memoryGame = game;
  } else {
    await kv.set(GAME_KEY, game);
  }
}

export default async function handler(req, res) {
  const playerId = parseInt(req.query.player, 10);
  if (![1, 2].includes(playerId)) {
    return res.status(400).json({ error: 'player must be 1 or 2' });
  }

  const game = await getOrCreateGame();
  const myGuesses = game.guesses[playerId] || [];
  const otherId = playerId === 1 ? 2 : 1;
  const otherGuesses = game.guesses[otherId] || [];

  res.status(200).json({
    player: playerId,
    myGuesses,
    myGuessCount: myGuesses.length,
    otherGuessCount: otherGuesses.length,
    otherGuesses: game.gameOver ? otherGuesses : [],
    maxGuesses: MAX_GUESSES,
    winner: game.winner,
    gameOver: game.gameOver,
    targetRevealed: game.gameOver ? game.target : null,
  });
}
