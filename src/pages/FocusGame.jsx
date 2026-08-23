import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Timer, Trophy, RefreshCw, Sparkles } from 'lucide-react';
import './FocusGame.css';

const COLORS = [
  { key: 'red', label: 'MERAH', value: '#ef4444' },
  { key: 'blue', label: 'BIRU', value: '#3b82f6' },
  { key: 'green', label: 'HIJAU', value: '#22c55e' },
  { key: 'purple', label: 'UNGU', value: '#a855f7' },
  { key: 'orange', label: 'ORANYE', value: '#f97316' }
];

const ROUND_TIME = 45;

const randomIndex = (max) => Math.floor(Math.random() * max);

const makeRound = () => {
  const wordIdx = randomIndex(COLORS.length);
  let inkIdx = randomIndex(COLORS.length);
  while (inkIdx === wordIdx) {
    inkIdx = randomIndex(COLORS.length);
  }
  const correctIdx = Math.random() > 0.5 ? wordIdx : inkIdx;
  return {
    word: COLORS[wordIdx].label,
    ink: COLORS[inkIdx].value,
    correctKey: COLORS[correctIdx].key
  };
};

const FocusGame = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState('start');
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(makeRound);
  const [bestScore, setBestScore] = useState(0);

  const username = localStorage.getItem('moodify_currentUser') || 'guest';
  const bestKey = useMemo(() => `moodify_focus_best_${username}`, [username]);

  useEffect(() => {
    const savedBest = Number(localStorage.getItem(bestKey) || 0);
    setBestScore(savedBest);
  }, [bestKey]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (timeLeft <= 0) {
      setGameState('end');
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [gameState, timeLeft]);

  useEffect(() => {
    if (gameState !== 'end') return;
    const savedBest = Number(localStorage.getItem(bestKey) || 0);
    if (score > savedBest) {
      localStorage.setItem(bestKey, String(score));
      setBestScore(score);
    }
  }, [gameState, score, bestKey]);

  const startGame = () => {
    setGameState('playing');
    setTimeLeft(ROUND_TIME);
    setScore(0);
    setStreak(0);
    setRound(makeRound());
  };

  const handleAnswer = (key) => {
    if (gameState !== 'playing') return;
    const correct = key === round.correctKey;
    if (correct) {
      const streakNext = streak + 1;
      setStreak(streakNext);
      setScore((s) => s + 10 + Math.min(10, streakNext));
    } else {
      setStreak(0);
      setScore((s) => Math.max(0, s - 6));
    }
    setRound(makeRound());
  };

  return (
    <div className="focusgame-container animate-fade-in">
      <div className="focusgame-header">
        <button className="focusgame-icon-btn" onClick={() => navigate('/home')}>
          <ArrowLeft size={22} />
        </button>
        <div className="focusgame-stats">
          <div><Timer size={14} /> {timeLeft}s</div>
          <div><Sparkles size={14} /> {score}</div>
          <div><Trophy size={14} /> Best {bestScore}</div>
        </div>
      </div>

      <div className="focusgame-board">
        {gameState === 'start' && (
          <div className="focusgame-overlay">
            <h2>Color Focus Rush</h2>
            <p>Pilih warna yang benar secepat mungkin. Jaga streak untuk bonus skor.</p>
            <button className="btn-primary" onClick={startGame}>Mulai Main</button>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            <p className="focusgame-rule">Pilih warna yang cocok dengan <strong>NAMA WARNA</strong> atau <strong>WARNA TINTA</strong> (acak).</p>
            <div className="focusgame-word" style={{ color: round.ink }}>
              {round.word}
            </div>
            <div className="focusgame-choice-grid">
              {COLORS.map((c) => (
                <button key={c.key} className="focusgame-choice" onClick={() => handleAnswer(c.key)}>
                  <span className="dot" style={{ backgroundColor: c.value }} />
                  {c.label}
                </button>
              ))}
            </div>
            <p className="focusgame-streak">Streak: {streak}</p>
          </>
        )}

        {gameState === 'end' && (
          <div className="focusgame-overlay">
            <h2>Permainan Selesai</h2>
            <p>Skor akhir kamu:</p>
            <div className="focusgame-final">{score}</div>
            <div className="focusgame-end-actions">
              <button className="btn-primary" onClick={startGame}>
                <RefreshCw size={16} /> Main Lagi
              </button>
              <button className="btn-secondary" onClick={() => navigate('/home')}>
                Kembali
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusGame;
