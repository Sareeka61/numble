// pages/index.js
import { useEffect, useState } from 'react';

const DIGITS = 4;
const MAX_GUESSES = 6;

function Board({ guesses, visible }) {
  return (
    <div className="board">
      {Array.from({ length: MAX_GUESSES }).map((_, rowIdx) => {
        const guess = guesses[rowIdx];
        return (
          <div className="row" key={rowIdx}>
            {Array.from({ length: DIGITS }).map((_, colIdx) => {
              const tileClasses = ['tile'];
              let char = '';

              if (guess) {
                if (visible) {
                  char = guess.value[colIdx] || '';
                  if (char) tileClasses.push('filled');
                  const color = guess.colors[colIdx];
                  if (color) tileClasses.push(color);
                } else {
                  // hidden view for opponent: empty tiles but slightly dim if row used
                  tileClasses.push('hidden-tile');
                  if (guess.value[colIdx]) tileClasses.push('used');
                }
              }

              return (
                <div className={tileClasses.join(' ')} key={colIdx}>
                  {visible ? char : ''}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function Home() {
  const [playerId, setPlayerId] = useState(1);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [guess, setGuess] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const otherPlayerId = playerId === 1 ? 2 : 1;

  // Poll game state
  useEffect(() => {
    let cancelled = false;
    async function fetchState() {
      try {
        const res = await fetch(`/api/state?player=${playerId}`);
        const data = await res.json();
        if (!cancelled) setState(data);
      } catch (e) {
        console.error(e);
      }
    }
    fetchState();
    const interval = setInterval(fetchState, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [playerId, refreshTick]);

  async function submitGuess() {
    if (!state || state.gameOver) return;

    const trimmed = guess.trim();
    if (!/^\d{4}$/.test(trimmed)) {
      setError(true);
      setMsg('Enter a 4-digit number.');
      return;
    }

    setLoading(true);
    setError(false);
    setMsg('');

    try {
      const res = await fetch('/api/guess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, value: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(true);
        setMsg(data.error || 'Error submitting guess');
      } else {
        setGuess('');
        setMsg('');
        setRefreshTick((x) => x + 1);
        if (data.gameOver) {
          setMsg(
            data.winner
              ? `Player ${data.winner} cracked it!`
              : 'Both players are out of guesses.'
          );
        }
      }
    } catch (e) {
      console.error(e);
      setError(true);
      setMsg('Network error');
    } finally {
      setLoading(false);
    }
  }

  async function newRound() {
    try {
      await fetch('/api/new-game', { method: 'POST' });
      setRefreshTick((x) => x + 1);
      setGuess('');
      setMsg('New round started.');
      setError(false);
    } catch (e) {
      console.error(e);
      setError(true);
      setMsg('Error starting new round.');
    }
  }

  const myGuesses = state?.myGuesses || [];
  const myGuessCount = state?.myGuessCount || 0;
  const otherGuessCount = state?.otherGuessCount || 0;
  const otherGuesses = state?.otherGuesses || [];
  const gameOver = state?.gameOver;
  const winner = state?.winner;
  const target = state?.targetRevealed;

  return (
    <div className="game-wrapper">
      <div className="card">
        <div className="header">
          <div>
            <div className="title">NUMBER DUEL</div>
            <div className="subtitle">
              Two players, one secret 4-digit code. First to crack it wins.
            </div>
          </div>
          <div className="badge">2 PLAYERS</div>
        </div>

        <div className="view-switch">
          <button
            className={'view-btn ' + (playerId === 1 ? 'active' : '')}
            onClick={() => {
              setPlayerId(1);
              setMsg('');
            }}
          >
            I am Player 1
          </button>
          <button
            className={'view-btn ' + (playerId === 2 ? 'active' : '')}
            onClick={() => {
              setPlayerId(2);
              setMsg('');
            }}
          >
            I am Player 2
          </button>
        </div>

        <div className="view-info">
          You are currently playing as <span>Player {playerId}</span>. You see
          only your own guesses. You only see how many guesses the other player
          has used.
        </div>

        <div className="players-layout">
          {/* Your board */}
          <div className="player-column">
            <div className="player-column-header">
              <span className="name">Player {playerId} (You)</span>
              {gameOver && winner === playerId && (
                <span className="winner-tag">Winner</span>
              )}
            </div>
            <div className="player-guess-count">
              Guesses used: {myGuessCount} / {MAX_GUESSES}
            </div>
            <Board guesses={myGuesses} visible={true} />
          </div>

          {/* Opponent board */}
          <div className="player-column">
            <div className="player-column-header">
              <span className="name">Player {otherPlayerId}</span>
              {gameOver && winner === otherPlayerId && (
                <span className="winner-tag">Winner</span>
              )}
            </div>
            <div className="player-guess-count">
              Guesses used: {otherGuessCount} / {MAX_GUESSES}
            </div>
            <Board guesses={otherGuesses} visible={!!gameOver} />
            {!gameOver && (
              <div className="small-note">
                Numbers and colors are hidden until the round ends.
              </div>
            )}
          </div>
        </div>

        <div className="controls">
          <input
            type="text"
            maxLength={4}
            placeholder="Enter 4-digit guess (0-9)"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitGuess();
            }}
            disabled={loading || gameOver}
          />
          <button onClick={submitGuess} disabled={loading || gameOver}>
            {loading ? '...' : 'Guess'}
          </button>
        </div>

        <div className={'message ' + (error ? 'error' : '')}>
          {msg ||
            (gameOver && target
              ? `Round over. Secret number was ${target}.`
              : '')}
        </div>

        <button
          className={'secondary ' + (!gameOver ? 'hidden' : '')}
          onClick={newRound}
        >
          Start New Round
        </button>

        <div className="footer-text">
          Open this link on two devices. One chooses Player 1, the other Player
          2. Same secret code for both. First to guess correctly wins.
        </div>
      </div>

      {/* Wordle-style styling */}
      <style jsx>{`
        :global(body) {
          margin: 0;
          padding: 0;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
            sans-serif;
          background: radial-gradient(circle at top, #020617, #020617 40%, #000);
          color: #e5e7eb;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .game-wrapper {
          width: 100%;
          max-width: 900px;
          padding: 16px;
        }
        .card {
          background: #020617;
          border-radius: 18px;
          padding: 20px 18px 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.3);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .title {
          font-size: 1.3rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 0.8rem;
          color: #9ca3af;
        }
        .badge {
          font-size: 0.7rem;
          padding: 3px 9px;
          border-radius: 999px;
          background: rgba(56, 189, 248, 0.12);
          border: 1px solid rgba(56, 189, 248, 0.7);
          color: #e0f2fe;
          text-transform: uppercase;
          letter-spacing: 0.09em;
        }
        .view-switch {
          display: inline-flex;
          border-radius: 999px;
          padding: 2px;
          background: #020617;
          border: 1px solid rgba(148, 163, 184, 0.5);
          margin-bottom: 8px;
        }
        .view-btn {
          border: none;
          background: transparent;
          color: #9ca3af;
          font-size: 0.8rem;
          padding: 4px 10px;
          border-radius: 999px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.12s ease, color 0.12s ease;
        }
        .view-btn.active {
          background: rgba(56, 189, 248, 0.16);
          color: #e0f2fe;
        }
        .view-info {
          font-size: 0.78rem;
          color: #9ca3af;
          margin-bottom: 10px;
        }
        .view-info span {
          color: #38bdf8;
          font-weight: 600;
        }
        .players-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 10px;
        }
        .player-column {
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          padding: 10px 10px 8px;
          background: radial-gradient(circle at top, #020617, #020617);
        }
        .player-column-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.86rem;
          margin-bottom: 4px;
        }
        .name {
          font-weight: 600;
        }
        .winner-tag {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.16);
          border: 1px solid rgba(34, 197, 94, 0.7);
          color: #bbf7d0;
        }
        .player-guess-count {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-bottom: 6px;
        }
        .board {
          display: grid;
          grid-template-rows: repeat(6, 1fr);
          gap: 4px;
        }
        .row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
        }
        .tile {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.4rem;
          background: #020617;
          color: #e5e7eb;
          border: 2px solid #4b5563;
          box-sizing: border-box;
        }
        .tile.filled {
          border-color: #9ca3af;
        }
        .tile.correct {
          background: #22c55e;
          border-color: #16a34a;
          color: #f9fafb;
        }
        .tile.present {
          background: #eab308;
          border-color: #ca8a04;
          color: #111827;
        }
        .tile.absent {
          background: #4b5563;
          border-color: #374151;
          color: #e5e7eb;
        }
        .hidden-tile.used {
          opacity: 0.3;
        }
        .controls {
          display: flex;
          gap: 8px;
          margin-bottom: 6px;
          margin-top: 8px;
        }
        .controls input {
          flex: 1;
          padding: 10px 10px;
          border-radius: 8px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: #020617;
          color: #e5e7eb;
          outline: none;
          font-size: 0.95rem;
        }
        .controls input::placeholder {
          color: #6b7280;
        }
        .controls input:focus {
          border-color: #38bdf8;
          box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.55);
        }
        button {
          border: none;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: #f9fafb;
          white-space: nowrap;
          transition: transform 0.08s ease, box-shadow 0.08s ease,
            filter 0.08s ease;
        }
        button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(22, 163, 74, 0.5);
          filter: brightness(1.04);
        }
        button:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: none;
          filter: brightness(0.97);
        }
        button.secondary {
          background: transparent;
          border: 1px solid rgba(148, 163, 184, 0.7);
          color: #9ca3af;
          padding-inline: 14px;
          margin-top: 2px;
        }
        button.secondary:hover:not(:disabled) {
          background: rgba(148, 163, 184, 0.1);
          box-shadow: none;
        }
        button:disabled {
          opacity: 0.55;
          cursor: default;
          box-shadow: none;
        }
        .message {
          font-size: 0.8rem;
          min-height: 18px;
          color: #9ca3af;
          margin-bottom: 4px;
        }
        .message.error {
          color: #f97373;
        }
        .footer-text {
          text-align: center;
          margin-top: 6px;
          font-size: 0.74rem;
          color: #9ca3af;
        }
        .small-note {
          margin-top: 5px;
          font-size: 0.7rem;
          color: #9ca3af;
        }
        @media (max-width: 880px) {
          .card {
            padding: 16px 14px 14px;
          }
          .title {
            font-size: 1.1rem;
          }
          .players-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
