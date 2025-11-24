// pages/api/guess.js
import { kv } from '@vercel/kv';
import { getOrCreateGame } from './state';

const GAME_KEY = 'number-duel-game';
const DIGITS = 4;
const MAX_GUESSES = 6;

function evaluateGuess(guess, target) {
  const result = new Array(DIGITS).fill('absent');
  const targetArr = target.split('');
  const guessArr = guess.split('');
  const used = new Array(DIGITS).fill(false);

  // Correct positions
  for (let i = 0; i < DIGITS; i++) {
    if (guessArr[i] === targetArr[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Present digits, wrong spot
  for (let i = 0; i < DIGITS; i++) {
    if (result[i] === 'correct') continue;
    const digit = guessArr[i];
    let foundIndex = -1;
    for (let j = 0; j < DIGITS; j++) {
      if (!used[j] && targetArr[j] === digit) {
        foundIndex = j;
        break;
      }
    }
    if (foundIndex !== -1) {
      result[i] = 'present';
      used[foundIndex] = true;
    }
  }

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId, value } = req.body || {};
  const pid = parseInt(playerId, 10);
  if (![1, 2].includes(pid)) {
    return res.status(400).json({ error: 'playerId must be 1 or 2' });
  }
  if (!/^\d{4}$/.test(value)) {
    return res.status(400).json({ error: 'guess must be 4 digits' });
  }

  let game = await getOrCreateGame();

  if (game.gameOver) {
    return res.status(400).json({ error: 'Game already over' });
  }

  const myGuesses = game.guesses[pid] || [];
  if (myGuesses.length >= MAX_GUESSES) {
    return res.status(400).json({ error: 'No guesses left for this player' });
  }

  const colors = evaluateGuess(value, game.target);
  const newGuess = { value, colors };
  myGuesses.push(newGuess);
  game.guesses[pid] = myGuesses;

  if (value === game.target) {
    game.gameOver = true;
    game.winner = pid;
  } else {
    const p1Out = (game.guesses[1] || []).length >= MAX_GUESSES;
    const p2Out = (game.guesses[2] || []).length >= MAX_GUESSES;
    if (p1Out && p2Out) {
      game.gameOver = true;
      game.winner = null;
    }
  }

  await kv.set(GAME_KEY, game);

  return res.status(200).json({
    success: true,
    gameOver: game.gameOver,
    winner: game.winner,
    guess: newGuess,
  });
}
