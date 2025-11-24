// pages/api/state.js

const GAME_KEY = 'number-duel-game'; // not really needed now, but kept
const DIGITS = 4;
const MAX_GUESSES = 6;

// Single in-memory game object (works fine for a toy game)
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
  if (!memoryGame) {
    memoryGame = createNewGameState();
  }
  return memoryGame;
}

export async function saveGame(game) {
  memoryGame = game;
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
