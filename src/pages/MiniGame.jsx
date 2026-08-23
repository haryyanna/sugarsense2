import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Trophy, ArrowLeft, RefreshCw } from 'lucide-react';
import './MiniGame.css';

const NEGATIVE_WORDS = ["Cemas", "Takut", "Gagal", "Insecure", "Malas", "Sedih", "Marah", "Ragu", "Kesepian"];
const POSITIVE_WORDS = ["Hebat", "Kuat", "Bisa", "Pintar", "Tenang", "Fokus", "Berani", "Senang", "Syukur"];

const GAME_DURATION = 30; // seconds

const MiniGame = () => {
    const navigate = useNavigate();
    const [gameState, setGameState] = useState('start'); // start, playing, end
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [bubbles, setBubbles] = useState([]);
    
    const gameAreaRef = useRef(null);

    // Audio Context for Game Sounds
    const playSound = (type) => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            if (type === 'pop_good') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            } else if (type === 'pop_bad') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
            } else if (type === 'win') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, audioCtx.currentTime);
                osc.frequency.setValueAtTime(600, audioCtx.currentTime + 0.1);
                osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                osc.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.5);
                return;
            }

            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } catch (error) {
            console.log("Audio play failed");
        }
    };

    // Timer Effect
    useEffect(() => {
        let timer;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && gameState === 'playing') {
            endGame();
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    // Bubble Generator Effect
    useEffect(() => {
        let generator;
        if (gameState === 'playing') {
            generator = setInterval(() => {
                if (gameAreaRef.current) {
                    const isPositive = Math.random() > 0.7; // 30% chance for positive bubble
                    const wordList = isPositive ? POSITIVE_WORDS : NEGATIVE_WORDS;
                    const word = wordList[Math.floor(Math.random() * wordList.length)];
                    
                    const width = gameAreaRef.current.clientWidth;
                    const leftPos = Math.floor(Math.random() * (width - 80)); // 80 is approx max bubble width
                    
                    const newBubble = {
                        id: Date.now() + Math.random(),
                        word,
                        type: isPositive ? 'positive' : 'negative',
                        left: leftPos,
                        size: Math.floor(Math.random() * 30) + 60, // 60px to 90px
                        popped: false
                    };

                    setBubbles(prev => [...prev, newBubble]);
                }
            }, 700); // spawn a bubble every 700ms
        }
        return () => clearInterval(generator);
    }, [gameState]);

    // Cleanup old bubbles that floated away
    useEffect(() => {
        let cleaner;
        if (gameState === 'playing') {
            cleaner = setInterval(() => {
                setBubbles(prev => prev.filter(b => !b.popped && Date.now() - b.id < 5000)); // remove after 5s
            }, 1000);
        }
        return () => clearInterval(cleaner);
    }, [gameState]);

    const startGame = () => {
        setScore(0);
        setTimeLeft(GAME_DURATION);
        setBubbles([]);
        setGameState('playing');
        playSound('pop_good');
    };

    const endGame = () => {
        setGameState('end');
        playSound('win');
    };

    const handlePop = (bubble) => {
        if (bubble.popped || gameState !== 'playing') return;

        // Mark as popped for animation
        setBubbles(prev => prev.map(b => 
            b.id === bubble.id ? { ...b, popped: true } : b
        ));

        if (bubble.type === 'negative') {
            setScore(prev => prev + 10);
            playSound('pop_good');
        } else {
            // Popped a positive word (Penalty)
            setScore(prev => Math.max(0, prev - 10));
            playSound('pop_bad');
        }
    };

    return (
        <div className="minigame-container animate-fade-in">
            {/* Nav Back Header */}
            <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 30 }}>
                <button 
                    onClick={() => navigate('/home')}
                    style={{ background: 'white', border: 'none', padding: '12px', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} color="#0f172a" />
                </button>
            </div>

            <div className="minigame-header">
                <h1>Pop <br/>the <span style={{ color: '#ef4444' }}>Negativity</span></h1>
                {gameState === 'playing' && <p>Pecahkan kata negatif, biarkan yang positif utuh!</p>}
            </div>

            <div className="game-stats">
                <div className="score-text">Skor: {score}</div>
                <div className={`time-text ${timeLeft <= 5 ? 'urgent' : ''}`}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
            </div>

            <div className="game-area" ref={gameAreaRef}>
                {gameState === 'playing' && bubbles.map(bubble => (
                    <div 
                        key={bubble.id}
                        className={`game-bubble bubble-${bubble.type} ${bubble.popped ? 'bubble-popped' : ''}`}
                        style={{ 
                            left: `${bubble.left}px`, 
                            width: `${bubble.size}px`, 
                            height: `${bubble.size}px`,
                            fontSize: `${bubble.size / 4}px`
                        }}
                        onClick={() => handlePop(bubble)}
                    >
                        {bubble.word}
                    </div>
                ))}

                {/* Start Overlay */}
                {gameState === 'start' && (
                    <div className="game-overlay animate-fade-in">
                        <h2>Siap Meningkatkan Mood?</h2>
                        <p>Pecahkan (tap) gelembung abu-abu yang berisi kata negatif. <br/><br/><strong>AWAS:</strong> Jangan tekan gelembung oranye yang berisi kata positif, atau poinmu berkurang!</p>
                        <button className="btn-primary" onClick={startGame} style={{ padding: '16px 32px', fontSize: '18px' }}>
                            <Sparkles size={20} /> Mulai Main!
                        </button>
                    </div>
                )}

                {/* Game Over Overlay */}
                {gameState === 'end' && (
                    <div className="game-overlay animate-fade-in">
                        <Trophy size={64} color="#f59e0b" style={{ marginBottom: '16px' }} />
                        <h2>Waktu Habis!</h2>
                        <div className="final-score">{score}</div>
                        <p>Hebat! Kamu sudah menyingkirkan banyak pikiran negatif hari ini. Ingat, pikiran positif (gelembung oranye) adalah temanmu.</p>
                        
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button className="btn-primary" onClick={startGame}>
                                <RefreshCw size={18} /> Main Lagi
                            </button>
                            <button 
                                className="btn-secondary" 
                                onClick={() => navigate('/home')}
                                style={{ background: 'transparent', border: '1px solid #cbd5e1', padding: '14px 24px', borderRadius: '12px', fontWeight: '600' }}
                            >
                                Selesai
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MiniGame;
