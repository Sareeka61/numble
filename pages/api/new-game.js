// pages/api/new-game.js
import { createNewGameState, saveGame } from './state';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const game = createNewGameState();
  await saveGame(game);

  res.status(200).json({ success: true });
}
