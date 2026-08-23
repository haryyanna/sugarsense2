import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Heart, Play, RotateCcw, Pause, Play as Resume, Gamepad2 } from 'lucide-react';
import './NutriGame.css';

const ITEMS = [
  { emoji: '🍊', name: 'Jeruk', type: 'healthy', points: 10, info: 'Vitamin C tinggi, meningkatkan imun!' },
  { emoji: '🍎', name: 'Apel', type: 'healthy', points: 10, info: 'Serat baik untuk pencernaan sehat.' },
  { emoji: '🥑', name: 'Alpukat', type: 'healthy', points: 15, info: 'Lemak sehat (HDL) baik untuk jantung.' },
  { emoji: '🥥', name: 'Kelapa', type: 'healthy', points: 15, info: 'Elektrolit alami penangkal dehidrasi.' },
  { emoji: '🍓', name: 'Stroberi', type: 'healthy', points: 10, info: 'Antioksidan tinggi pelindung sel tubuh.' },
  { emoji: '🥤', name: 'Boba', type: 'unhealthy', points: -15, info: 'Mengandung gula berlebih (hingga 40g+ per sajian).' },
  { emoji: '🥫', name: 'Soda', type: 'unhealthy', points: -20, info: 'Sarat pemanis buatan, picu risiko diabetes.' },
  { emoji: '🍩', name: 'Donat', type: 'unhealthy', points: -10, info: 'Tinggi kalori kosong dan lemak jenuh.' },
  { emoji: '🍬', name: 'Permen', type: 'unhealthy', points: -10, info: 'Sebab utama kerusakan gigi pada anak & remaja.' }
];

const NutriGame = () => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(0);
  const [activeItems, setActiveItems] = useState([]);
  const [basketX, setBasketX] = useState(50); // percentage (0 - 100)
  const [infoPopup, setInfoPopup] = useState(null);

  const gameAreaRef = useRef(null);
  const gameLoopRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('nutrisip_high_score');
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, []);

  // Keyboard navigation for basket
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isPlaying || isGameOver) return;
      if (e.key === 'ArrowLeft') {
        setBasketX(prev => Math.max(5, prev - 10));
      } else if (e.key === 'ArrowRight') {
        setBasketX(prev => Math.min(95, prev + 10));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver]);

  const playSound = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'catch_good') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'catch_bad') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'gameover') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  const startGame = () => {
    setIsPlaying(true);
    setIsGameOver(false);
    setIsPaused(false);
    setScore(0);
    setLives(3);
    setActiveItems([]);
    setBasketX(50);
    setInfoPopup(null);
  };

  // Spawning logic
  useEffect(() => {
    if (!isPlaying || isGameOver || isPaused) {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      return;
    }

    spawnTimerRef.current = setInterval(() => {
      const randomItem = ITEMS[Math.floor(Math.random() * ITEMS.length)];
      const newItem = {
        id: Date.now() + Math.random(),
        ...randomItem,
        x: Math.random() * 85 + 5, // percentage x coordinate (5% to 90%)
        y: 0 // start at top
      };
      setActiveItems(prev => [...prev, newItem]);
    }, 1200);

    return () => clearInterval(spawnTimerRef.current);
  }, [isPlaying, isGameOver, isPaused]);

  // Game Loop: update items y coordinate
  useEffect(() => {
    if (!isPlaying || isGameOver || isPaused) {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      return;
    }

    const updateGame = () => {
      setActiveItems(prevItems => {
        let nextItems = [];
        let livesDed = 0;
        let scoreAdd = 0;
        let matchedPopup = null;

        for (let item of prevItems) {
          const nextY = item.y + 2.5; // fall speed

          // Check collision with basket (bottom of container is around 88% - 95% y)
          if (nextY >= 86 && nextY <= 93 && Math.abs(item.x - basketX) < 12) {
            // Collision caught!
            scoreAdd += item.points;
            matchedPopup = { emoji: item.emoji, name: item.name, info: item.info, type: item.type };
            playSound(item.type === 'healthy' ? 'catch_good' : 'catch_bad');
            
            if (item.type === 'unhealthy') {
              livesDed += 1;
            }
            continue; // don't keep drawing
          }

          // Check if item went past screen
          if (nextY > 100) {
            // If healthy item is missed, player loses a life
            if (item.type === 'healthy') {
              livesDed += 1;
            }
            continue; // item falls off screen
          }

          nextItems.push({ ...item, y: nextY });
        }

        if (livesDed > 0) {
          setLives(prev => {
            const nextLives = prev - livesDed;
            if (nextLives <= 0) {
              setIsGameOver(true);
              playSound('gameover');
              // Save HighScore if higher
              setHighScore(currentHighScore => {
                const finalScore = score + scoreAdd;
                if (finalScore > currentHighScore) {
                  localStorage.setItem('nutrisip_high_score', finalScore.toString());
                  return finalScore;
                }
                return currentHighScore;
              });
            }
            return Math.max(0, nextLives);
          });
        }

        if (scoreAdd !== 0) {
          setScore(prev => Math.max(0, prev + scoreAdd));
        }

        if (matchedPopup) {
          setInfoPopup(matchedPopup);
        }

        return nextItems;
      });

      gameLoopRef.current = requestAnimationFrame(updateGame);
    };

    gameLoopRef.current = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(gameLoopRef.current);
  }, [isPlaying, isGameOver, isPaused, basketX, score]);

  const moveBasketToPointer = (e) => {
    if (!isPlaying || isGameOver || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const percentageX = (pointerX / rect.width) * 100;
    setBasketX(Math.min(92, Math.max(8, percentageX)));
  };

  const handlePointerDown = (e) => {
    if (!isPlaying || isGameOver || isPaused) return;
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    moveBasketToPointer(e);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    moveBasketToPointer(e);
  };

  const handlePointerUp = (e) => {
    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <div className="game-page-container">
      {/* Top Header */}
      <header className="game-header-bar">
        <button className="back-btn" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
          <span>Kembali</span>
        </button>
        <div className="game-title-badge">
          <div className="game-feature-heading"><Gamepad2 className="game-feature-heading-icon" /><span>Sugar Catch Game</span></div>
        </div>
      </header>

      {/* Main Area */}
      <div className="game-content-card">
        {/* Score Board */}
        <div className="scoreboard">
          <div className="score-stat">
            <span className="stat-label">Skor</span>
            <span className="stat-value text-green">{score}</span>
          </div>
          <div className="score-stat">
            <Trophy size={16} className="trophy-icon" />
            <span className="stat-label">Tertinggi</span>
            <span className="stat-value">{highScore}</span>
          </div>
          <div className="score-stat">
            <span className="stat-label">Nyawa</span>
            <div className="lives-container">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  size={18}
                  fill={i < lives ? '#ef4444' : 'none'}
                  color="#ef4444"
                  className={i < lives ? 'heart-pulse' : 'heart-empty'}
                />
              ))}
            </div>
          </div>
          {isPlaying && !isGameOver && (
            <button className="game-pause-btn" onClick={() => setIsPaused((paused) => !paused)} title={isPaused ? 'Lanjutkan permainan' : 'Jeda permainan'}>
              {isPaused ? <Resume size={17} /> : <Pause size={17} />}
              <span>{isPaused ? 'Lanjut' : 'Jeda'}</span>
            </button>
          )}
        </div>

        {/* Game Stage Area */}
        <div 
          className="game-stage" 
          ref={gameAreaRef} 
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ cursor: isPlaying && !isGameOver && !isPaused ? 'grab' : 'default' }}
        >
          {!isPlaying && (
            <div className="game-overlay">
              <div className="game-intro">
                <span className="game-logo-large">🥤🍏</span>
                <h2>Sugar Catch</h2>
                <p>Tangkap buah-buahan segar & kelapa sehat untuk menambah poin. Hindari boba, soda, & makanan manis berlebih yang mengurangi nyawa dan poin!</p>
                <div className="instructions-box">
                  <h4>Cara Bermain:</h4>
                  <ul>
                    <li>Tekan dan geser area permainan untuk menggerakkan Gelas Jus.</li>
                    <li>Atau gunakan tombol <strong>Panah Kiri & Kanan</strong> pada keyboard.</li>
                    <li>Jangan lewatkan buah segar yang jatuh!</li>
                  </ul>
                </div>
                <button className="btn-start-game" onClick={startGame}>
                  <Play size={18} fill="white" />
                  Mulai Main
                </button>
              </div>
            </div>
          )}

          {isPlaying && isGameOver && (
            <div className="game-overlay">
              <div className="game-intro">
                <span className="game-logo-large">💀</span>
                <h2 className="text-red">Permainan Berakhir!</h2>
                <p>Anda kehabisan nyawa karena melewatkan gizi sehat atau terlalu banyak menangkap asupan manis.</p>
                <div className="game-summary-box">
                  <div className="summary-row">
                    <span>Skor Anda:</span>
                    <strong className="text-green">{score}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Skor Tertinggi:</span>
                    <strong>{Math.max(highScore, score)}</strong>
                  </div>
                </div>
                <button className="btn-start-game bg-orange" onClick={startGame}>
                  <RotateCcw size={18} />
                  Main Lagi
                </button>
              </div>
            </div>
          )}

          {isPlaying && isPaused && !isGameOver && (
            <div className="game-overlay pause-overlay">
              <div className="game-intro">
                <span className="game-logo-large">⏸️</span>
                <h2>Permainan Dijeda</h2>
                <p>Geser gelas lagi setelah melanjutkan permainan.</p>
                <button className="btn-start-game" onClick={() => setIsPaused(false)}>
                  <Resume size={18} fill="white" /> Lanjutkan
                </button>
              </div>
            </div>
          )}

          {/* Falling Items */}
          {isPlaying && !isGameOver && activeItems.map(item => (
            <div 
              key={item.id} 
              className="falling-item"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              {item.emoji}
            </div>
          ))}

          {/* Player Cup / Basket */}
          {isPlaying && (
            <div 
              className="player-basket" 
              style={{ left: `${basketX}%` }}
            >
              <div className="cup-rim"></div>
              <div className="cup-liquid">🌿</div>
              <div className="cup-label">SUGARSENSE</div>
            </div>
          )}
        </div>

        {/* Nutritional Facts Popup / Tip Card */}
        {infoPopup && (
          <div className={`nutrition-tip-box animate-slide-up ${infoPopup.type === 'healthy' ? 'border-green' : 'border-red'}`}>
            <span className="tip-emoji">{infoPopup.emoji}</span>
            <div className="tip-text-content">
              <h4>{infoPopup.name} ({infoPopup.type === 'healthy' ? '+Poin' : '-Poin/Nyawa'})</h4>
              <p>{infoPopup.info}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NutriGame;
