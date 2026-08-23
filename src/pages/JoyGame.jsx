import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Trophy, RefreshCw } from 'lucide-react';
import './JoyGame.css';

const POSITIVE_ITEMS = ['⭐', '💖', '🎁', '🌻', '🎈'];
const NEGATIVE_ITEMS = ['🌧️', '⛈️', '🌪️']; // Weather/Abstract bad things

const GAME_DURATION = 30; // 30 seconds
const BASKET_WIDTH = 60; // Approximate logical width for hit detection
const ITEM_SIZE = 30; // Logical item hit size
const FALL_SPEED = 5; // pixels per frame roughly

const JoyGame = () => {
    const navigate = useNavigate();
    
    // Game States
    const [gameState, setGameState] = useState('start'); // start, playing, end
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    
    // Physical Engine States
    const containerRef = useRef(null);
    const [basketX, setBasketX] = useState( window.innerWidth / 2 );
    const basketRef = useRef(window.innerWidth / 2); // Use ref for fast access in loop
    const [items, setItems] = useState([]);
    const itemsRef = useRef([]); // Mutable ref for animation loop
    const [popups, setPopups] = useState([]); // Visual floating text
    
    // Animation/Interval Refs
    const requestRef = useRef();
    const spawnIntervalRef = useRef();
    const timerIntervalRef = useRef();
    
    // Audio Context
    const audioCtxRef = useRef(null);

    // Audio Player
    const playSound = useCallback((type) => {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            if (type === 'catch_good') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            } else if (type === 'catch_bad') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            } else if (type === 'win') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
                osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.5);
                return;
            }

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch(e) {}
    }, []);

    // Handle Input for Basket
    const updateBasketPosition = useCallback((clientX) => {
        if (!containerRef.current || gameState !== 'playing') return;
        const rect = containerRef.current.getBoundingClientRect();
        // Constrain basket within the screen
        let x = clientX - rect.left;
        x = Math.max(30, Math.min(x, rect.width - 30)); 
        basketRef.current = x;
        setBasketX(x);
    }, [gameState]);

    const handleMouseMove = (e) => updateBasketPosition(e.clientX);
    const handleTouchMove = (e) => {
        // Prevent default to stop scrolling
        if(e.cancelable) e.preventDefault(); 
        updateBasketPosition(e.touches[0].clientX);
    };

    // Main Game Loop
    const updateGame = useCallback(() => {
        if (gameState !== 'playing' || !containerRef.current) return;

        const containerHeight = containerRef.current.clientHeight;
        const basketYStart = containerHeight - 100; // Hitbox Y top (approx)
        const basketYEnd = containerHeight - 40; // Hitbox Y bottom
        
        // Move items down
        let newItems = itemsRef.current.map(item => ({
            ...item,
            y: item.y + (FALL_SPEED * item.speedMultiplier)
        }));

        let currentScore = score;
        let pGood = 0;
        let pBad = 0;
        const newPopups = [];

        // Check Collisions and Bounds
        newItems = newItems.filter(item => {
            // Collision Check with basket
            const hitX = Math.abs(item.x - basketRef.current) < (BASKET_WIDTH/2 + ITEM_SIZE/2);
            const hitY = item.y >= basketYStart && item.y <= basketYEnd;

            if (hitX && hitY) {
                // CAUGHT!
                if (item.type === 'positive') {
                    pGood++;
                    newPopups.push({ id: Date.now()+Math.random(), x: basketRef.current, y: basketYStart, type: 'good', text: '+10' });
                } else {
                    pBad++;
                    newPopups.push({ id: Date.now()+Math.random(), x: basketRef.current, y: basketYStart, type: 'bad', text: '-5' });
                }
                return false; // Remove item
            }
            
            // Remove if they fall off screen
            if (item.y > containerHeight) {
                return false;
            }
            
            return true;
        });

        // Apply score changes
        if (pGood > 0 || pBad > 0) {
            setScore(prev => {
                const updated = Math.max(0, prev + (pGood * 10) - (pBad * 5));
                return updated;
            });
            if (pGood > 0) playSound('catch_good');
            if (pBad > 0) playSound('catch_bad');
            
            if (newPopups.length > 0) {
                setPopups(prev => [...prev, ...newPopups]);
                // Clean up popups after 1s
                setTimeout(() => {
                    setPopups(prev => prev.filter(p => !newPopups.find(n => n.id === p.id)));
                }, 600);
            }
        }

        itemsRef.current = newItems;
        setItems(newItems);

        requestRef.current = requestAnimationFrame(updateGame);
    }, [gameState, score, playSound]);

    // Timer and Spawner Setup
    useEffect(() => {
        if (gameState === 'playing') {
            // Start Timer
            timerIntervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        endGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Start Spawner
            spawnIntervalRef.current = setInterval(() => {
                if (!containerRef.current) return;
                const width = containerRef.current.clientWidth;
                
                // 80% chance positive, 20% chance negative
                const isPositive = Math.random() > 0.2;
                const charList = isPositive ? POSITIVE_ITEMS : NEGATIVE_ITEMS;
                const char = charList[Math.floor(Math.random() * charList.length)];
                
                const newItem = {
                    id: Date.now() + Math.random(),
                    char,
                    type: isPositive ? 'positive' : 'negative',
                    x: Math.floor(Math.random() * (width - 40)) + 20, // Keep in bounds
                    y: -40, // Start above screen
                    speedMultiplier: 0.8 + Math.random() * 0.6 // varied speeds
                };
                
                itemsRef.current.push(newItem);
            }, 600); // Spawn every 600ms
            
            // Start Loop
            requestRef.current = requestAnimationFrame(updateGame);
        }

        return () => {
            clearInterval(timerIntervalRef.current);
            clearInterval(spawnIntervalRef.current);
            cancelAnimationFrame(requestRef.current);
        };
    }, [gameState, updateGame]);

    const startGame = () => {
        setScore(0);
        setTimeLeft(GAME_DURATION);
        setItems([]);
        itemsRef.current = [];
        setGameState('playing');
        playSound('catch_good');
    };

    const endGame = () => {
        setGameState('end');
        clearInterval(timerIntervalRef.current);
        clearInterval(spawnIntervalRef.current);
        cancelAnimationFrame(requestRef.current);
        playSound('win');
    };

    return (
        <div 
            className="joygame-container animate-fade-in"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
        >
            {/* Nav Back Header */}
            <div className="joygame-header">
                <button 
                    onClick={() => navigate('/home')}
                    style={{ background: 'white', border: 'none', padding: '12px', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} color="#0f172a" />
                </button>
                
                <div className="joygame-stats">
                    <div className="joy-score">Skor: {score}</div>
                    <div className={`joy-time ${timeLeft <= 5 ? 'urgent' : ''}`}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                </div>
            </div>

            <div className="joy-play-area" ref={containerRef}>
                {/* Render Falling Items */}
                {items.map(item => (
                    <div 
                        key={item.id} 
                        className="joy-item"
                        style={{ transform: `translate(${item.x}px, ${item.y}px)` }}
                    >
                        {item.char}
                    </div>
                ))}

                {/* Render Basket */}
                <div 
                    className="joy-basket-wrapper"
                    style={{ transform: `translateX(${basketX}px)` }}
                >
                    <div className="joy-basket">🧺</div>
                </div>
                
                {/* Popups over basket */}
                {popups.map(p => (
                    <div 
                        key={p.id} 
                        className={`joy-point-popup popup-${p.type}`}
                        style={{ left: p.x - 10, top: p.y - 40 }}
                    >
                        {p.text}
                    </div>
                ))}
            </div>

            {/* Start Overlay */}
            {gameState === 'start' && (
                <div className="joy-overlay animate-fade-in">
                    <h2>Tangkap Kebahagiaan!</h2>
                    <p>Geser layar ke kanan & kiri untuk mengerakkan keranjangmu. <br/><br/>Tangkap bintang ⭐ dan cinta 💖 untuk tambah poin. Hindari awan badai 🌧️ agar poin tidak berkurang!</p>
                    <button className="btn-primary" onClick={startGame} style={{ padding: '16px 32px', fontSize: '18px', background: '#ec4899', borderColor: '#db2777' }}>
                        <Sparkles size={20} /> Mulai Bermain
                    </button>
                </div>
            )}

            {/* Game Over Overlay */}
            {gameState === 'end' && (
                <div className="joy-overlay animate-fade-in">
                    <Trophy size={64} color="#fcd34d" style={{ marginBottom: '16px' }} />
                    <h2>Waktu Habis!</h2>
                    <div className="joy-final-score">{score}</div>
                    <p>Luar biasa! Kamu berhasil mengumpulkan banyak kebahagiaan. Terus pertahankan energi positif ini sepanjang harimu!</p>
                    
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <button className="btn-primary" onClick={startGame} style={{ background: '#ec4899', borderColor: '#db2777' }}>
                            <RefreshCw size={18} /> Main Lagi
                        </button>
                        <button 
                            className="btn-secondary" 
                            onClick={() => navigate('/home')}
                            style={{ background: 'transparent', border: '2px solid #cbd5e1', padding: '14px 24px', borderRadius: '12px', fontWeight: '600' }}
                        >
                            Selesai
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JoyGame;
