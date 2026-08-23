import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ArrowLeft, RefreshCw } from 'lucide-react';
import './ZenGame.css';

const AFFIRMATIONS = [
    "Pikiranmu tidak mendefinisikan siapa dirimu.",
    "Bernapaslah perlahan. Kamu aman di sini, di momen ini.",
    "Terima segala perasaan yang singgah, dan biarkan ia berlalu seperti awan.",
    "Terkadang, langkah paling berani adalah cukup beristirahat.",
    "Badai pasti berlalu. Selalu ada langit cerah di baliknya.",
    "Kamu telah bertahan dari 100% hari-hari terberatmu."
];

const ZenGame = () => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [progress, setProgress] = useState(0); // 0 to 100 wiped away
    const [completed, setCompleted] = useState(false);
    const [affirmation, setAffirmation] = useState('');
    
    // Audio Context for swipe sounds
    const audioCtxRef = useRef(null);
    const lastSoundTimeRef = useRef(0);

    useEffect(() => {
        // Set an affirmation on load
        setAffirmation(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
        initCanvas();
        
        // Handle window resize
        const handleResize = () => {
            if (!completed) initCanvas();
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        // Set canvas physical size to match window
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Draw "Fog" (Dark/Grey Cloud)
        ctx.fillStyle = '#94a3b8'; // Slate color mimicking mental fog
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add some noise/texture to fog for aesthetics
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for(let i = 0; i < 2000; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Setup wiping properties
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 100; // Large wiper
        ctx.globalCompositeOperation = 'destination-out'; // This makes drawing ERASE the canvas

        setProgress(0);
        setCompleted(false);
    };

    const playSwipeSound = () => {
        // Debounce audio to avoid awful harsh sounds (only play once every 200ms)
        const now = Date.now();
        if (now - lastSoundTimeRef.current < 200) return;
        lastSoundTimeRef.current = now;

        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            // Generate a soft noise/wind sweep sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300 + Math.random() * 100, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
            
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.1);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
            console.log("Audio not allowed yet");
        }
    };

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        if (completed) return;
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e) => {
        if (!isDrawing || completed) return;
        e.preventDefault(); // Prevent scrolling on touch
        
        const { x, y } = getCoordinates(e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
        
        playSwipeSound();
        checkProgress();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    // Very simple progress approximation by randomly sampling pixels
    const checkProgress = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        // Sample 200 random pixels to see if they are transparent
        let cleared = 0;
        const sampleCount = 200;
        
        for (let i = 0; i < sampleCount; i++) {
            const x = Math.floor(Math.random() * canvas.width);
            const y = Math.floor(Math.random() * canvas.height);
            const data = ctx.getImageData(x, y, 1, 1).data;
            if (data[3] === 0) { // Alpha is 0
                cleared++;
            }
        }
        
        const percent = (cleared / sampleCount) * 100;
        setProgress(percent);
        
        // If 65% is cleared, reveal the whole thing smoothly
        if (percent > 65 && !completed) {
            completeGame();
        }
    };

    const completeGame = () => {
        setCompleted(true);
        // Fade out canvas
        const canvas = canvasRef.current;
        canvas.style.transition = 'opacity 1.5s ease-in-out';
        canvas.style.opacity = '0';
        
        // Play success chime
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(500, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 2);
        } catch(e) {}
    };

    const resetGame = () => {
        const canvas = canvasRef.current;
        canvas.style.transition = 'none';
        canvas.style.opacity = '1';
        setAffirmation(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
        initCanvas();
    };

    return (
        <div className="zengame-container animate-fade-in">
            <div className="zengame-header">
                <button 
                    onClick={() => navigate('/home')}
                    style={{ background: 'white', border: 'none', padding: '12px', borderRadius: '50%', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} color="#0f172a" />
                </button>
                <div className="zengame-title-box">
                    <h1>Zen Flow</h1>
                    <p>Usap layar untuk menjernihkan pikiran.</p>
                </div>
            </div>

            {/* Background scene revealed beneath fog */}
            <div className="zen-reveal-scene">
                <Leaf size={48} color="#0d9488" style={{ opacity: 0.2, marginBottom: '24px' }} />
                <div className="zen-affirmation" style={{ opacity: completed ? 1 : 0, transform: completed ? 'translateY(0)' : 'translateY(20px)', transition: 'all 1.5s ease-in-out' }}>
                    <h2>"{affirmation}"</h2>
                    {completed && (
                        <button className="btn-secondary" onClick={resetGame} style={{ marginTop: '24px', background: 'transparent', border: '2px solid #0d9488', color: '#0f766e' }}>
                            <RefreshCw size={18} /> Bersihkan Pikiran Lagi
                        </button>
                    )}
                </div>
            </div>

            {/* Foreground interactive canvas */}
            {!completed && <div className="zen-prompt">Usap layar secara perlahan...</div>}
            
            <canvas
                ref={canvasRef}
                className="zen-canvas"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                onTouchCancel={stopDrawing}
                style={{ pointerEvents: completed ? 'none' : 'auto' }}
            />
        </div>
    );
};

export default ZenGame;
