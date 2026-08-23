import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Square, Wind } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Breathing.css';

const Breathing = () => {
    const navigate = useNavigate();
    const [isActive, setIsActive] = useState(false);
    const [phase, setPhase] = useState('Standby'); // Standby, Inhale, Hold, Exhale
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        let timer = null;
        let phaseTimeout = null;

        if (isActive) {
            timer = setInterval(() => {
                setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);

            const runCycle = () => {
                // Inhale 4s
                setPhase('Tarik Napas...');
                setTimeLeft(4);
                
                phaseTimeout = setTimeout(() => {
                    // Hold 4s
                    setPhase('Tahan...');
                    setTimeLeft(4);
                    
                    phaseTimeout = setTimeout(() => {
                        // Exhale 6s
                        setPhase('Buang Napas...');
                        setTimeLeft(6);
                        
                        phaseTimeout = setTimeout(() => {
                            if (isActive) runCycle();
                        }, 6000);
                    }, 4000);
                }, 4000);
            };

            if (phase === 'Standby') {
                runCycle();
            }

        } else {
            clearInterval(timer);
            clearTimeout(phaseTimeout);
            setPhase('Standby');
            setTimeLeft(0);
        }

        return () => {
            clearInterval(timer);
            clearTimeout(phaseTimeout);
        };
    }, [isActive, phase]);

    const getCircleSize = () => {
        if (phase === 'Tarik Napas...') return 'scale-up';
        if (phase === 'Tahan...') return 'scale-hold';
        if (phase === 'Buang Napas...') return 'scale-down';
        return 'scale-normal';
    };

    return (
        <div className="breathing-container animate-fade-in">
            <header className="page-header">
                <button className="icon-btn-rounded" onClick={() => navigate('/home')}>
                    <ArrowLeft size={24} />
                </button>
                <div className="feature-heading"><Wind className="feature-heading-icon" /><h2>Meditasi Pernapasan</h2></div>
                <div style={{ width: 40 }} /> {/* spacer */}
            </header>

            <div className="breathing-content">
                <div className="instructions">
                    <p>Teknik Pernapasan 4-4-6 untuk menenangkan pikiran dan menurunkan detak jantung.</p>
                </div>

                <div className="circle-container">
                    <div className={`breathing-circle ${getCircleSize()} ${isActive ? 'active' : ''}`}>
                        <div className="inner-circle"></div>
                    </div>
                    {isActive && (
                        <div className="center-text">
                            <h3>{phase}</h3>
                            <span className="timer-countdown">{timeLeft}</span>
                        </div>
                    )}
                </div>

                <button 
                    className={`btn-primary breathing-btn ${isActive ? 'active-btn' : ''}`}
                    onClick={() => setIsActive(!isActive)}
                >
                    {isActive ? <><Square size={20} /> Berhenti</> : <><Play size={20} /> Mulai Latihan</>}
                </button>
            </div>
        </div>
    );
};

export default Breathing;
