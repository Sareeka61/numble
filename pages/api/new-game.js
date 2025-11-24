import { kv } from '@vercel/kv';

const GAME_KEY = 'number-duel-game';
const DIGITS = 4;

function randomDigit() {
  return Math.floor(Math.random() * 10).toString();
}

function generateTargetNumber() {
  let s = '';
  for (let i = 0; i < DIGITS; i++) s += randomDigit();
  return s;
}

function createNewGameState() {
  return {
    target: generateTargetNumber(),
    guesses: { 1: [], 2: [] },
    winner: null,
    gameOver: false,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const game = createNewGameState();
  await kv.set(GAME_KEY, game);
  res.status(200).json({ success: true });
}
