import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, CheckCircle2, Circle, Quote, Camera, Activity, MessageSquare, BarChart2, Gamepad2, Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import heroImage from '../assets/hero-image.png';
import nutrisipLogo from '../../LOGO.webp';
import { trackEvent } from '../lib/analytics';
import { configureDailyReminder } from '../lib/reminder';
import { ensureNeonUser } from '../lib/neonApi';
import './Home.css';

const HEALTH_QUOTES = [
  "Air putih adalah bahan bakar terbaik untuk ginjal dan kulitmu. 💧",
  "Mengurangi setengah porsi gula hari ini adalah investasi hidup sehat 10 tahun ke depan! 🌟",
  "Pilihlah buah asli dibandingkan jus kemasan tinggi pemanis buatan. 🍎",
  "Elektrolit alami air kelapa jauh lebih baik dari minuman berenergi sasetan. 🥥",
  "Satu botol soda bisa mengandung hingga 10 sendok teh gula. Pikirkan ginjalmu! 🥫",
  "Biasakan membaca informasi nilai gizi di balik kemasan minumanmu ya! 📚",
  "Tubuh yang terhidrasi dengan baik meningkatkan konsentrasi belajar hingga 20%. 🧘‍♀️"
];

const ONBOARDING_STEPS = [
    {
        title: 'Tentukan Target Gizi',
        description: 'Agar SUGARSENSE bisa membantumu dengan tepat, pilihlah target kesehatan utama yang ingin dicapai.'
    },
    {
        title: 'Selamat Datang di SUGARSENSE',
        description: 'Mulai dari memindai kemasan minumanmu untuk mengetahui kandungan gula dan nilai gizinya secara instan.'
    },
    {
        title: 'Catat Absen Harian',
        description: 'Catat asupan air, asupan gula, dan selesaikan tantangan sehat harianmu agar hidup lebih teratur.'
    },
    {
        title: 'Konsultasi SUGARSENSE AI',
        description: 'Tanyakan apa saja seputar minuman sehat, kalori, dan gizi seimbang langsung ke AI pintar kami.'
    }
];

const ONBOARDING_GOALS = [
    'Mengurangi konsumsi gula',
    'Meningkatkan hidrasi (minum air)',
    'Menjaga berat badan ideal',
    'Menghindari minuman bersoda/boba'
];

const BADGE_RULES = [
    { key: 'starter', label: 'NutriNovice', minXp: 30 },
    { key: 'consistent', label: 'SipConsistent 7D', minXp: 120 },
    { key: 'master', label: 'NutriMaster 30D', minXp: 300 }
];

const getTodayKey = () => new Date().toISOString().split('T')[0];

const Home = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [avatar, setAvatar] = useState('🍎'); // Default avatar
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [inputName, setInputName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [consentChecked, setConsentChecked] = useState(false);
    const [authError, setAuthError] = useState('');
    const [isAuthLoading] = useState(false);
    
    const [dailyTasks, setDailyTasks] = useState({
        drinkWater: false,
        scanDrink: false,
        noSugar: false,
        walkTenMin: false
    });
    
    // Welcome Popup State
    const [showWelcome, setShowWelcome] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [onboardingGoal, setOnboardingGoal] = useState(ONBOARDING_GOALS[0]);
    const [playerStats, setPlayerStats] = useState({ xp: 0, level: 1, badges: [], missionProgress: 0 });
    const [dailyQuote, setDailyQuote] = useState('');

    const initializeLocalUser = (name) => {
        if (!name) return;
        const userKey = `moodify_data_${name}`; // keep same storage key for backward compatibility but adapt content
        if (!localStorage.getItem(userKey)) {
            localStorage.setItem(userKey, JSON.stringify({
                hasCheckedIn: false,
                lastMood: null,
                lastSliders: null,
                totalSessions: 0,
                streak: 0,
                history: [],
                chatHistory: [],
                scanHistory: [],
                joinedAt: new Date().toISOString(),
                avatar: '🍎',
                theme: 'default',
                darkMode: false,
                notificationsEnabled: true,
                reminderAt: '08:00',
                profileGoal: ONBOARDING_GOALS[0],
                missions: {
                    dailyCompletedDates: {},
                    weeklyTarget: 5
                },
                gamification: {
                    xp: 0,
                    level: 1,
                    badges: []
                }
            }));
        }
    };

    const finalizeLogin = (name) => {
        localStorage.setItem('moodify_currentUser', name);
        initializeLocalUser(name);
        setUsername(name);
        setIsLoggedIn(true);
        trackEvent('login_success', { username: name }).catch(() => {});
        const onboardingKey = `nutrisip_onboarding_done_${name}`;
        if (!localStorage.getItem(onboardingKey)) {
            setOnboardingStep(0);
            setShowOnboarding(true);
        } else {
            setShowWelcome(true);
            sessionStorage.setItem('moodify_welcomed', 'true');
        }
        configureDailyReminder().catch(() => {});
        ensureNeonUser(name).catch(() => {});
    };

    const recalcAndPersistUserProgress = (name, userData) => {
        const taskCount = Object.values(userData.dailyTasks || {}).filter((v) => v === true).length;
        const todayKey = getTodayKey();
        const dailyCompletedDates = userData.missions?.dailyCompletedDates || {};

        if (taskCount >= 3) {
            dailyCompletedDates[todayKey] = true;
        }

        const xpFromSessions = (userData.totalSessions || 0) * 15;
        const xpFromScans = (userData.scanHistory?.length || 0) * 20;
        const xpFromTasks = Object.keys(dailyCompletedDates).length * 10;
        const xp = xpFromSessions + xpFromScans + xpFromTasks;
        const level = Math.max(1, Math.floor(xp / 60) + 1);
        const badges = BADGE_RULES.filter((b) => xp >= b.minXp).map((b) => b.label);

        userData.missions = {
            ...(userData.missions || {}),
            dailyCompletedDates,
            weeklyTarget: userData.missions?.weeklyTarget || 5
        };
        userData.gamification = { xp, level, badges };

        const missionProgress = Math.min(userData.missions.weeklyTarget, Object.keys(dailyCompletedDates).length);
        setPlayerStats({ xp, level, badges, missionProgress });
        return userData;
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('moodify_currentUser');
        if (storedUser) {
            setUsername(storedUser);
            setIsLoggedIn(true);
            
            const userKey = `moodify_data_${storedUser}`;
            const savedData = localStorage.getItem(userKey);
            if (savedData) {
                const userData = JSON.parse(savedData);
                
                if (userData.avatar) {
                    setAvatar(userData.avatar);
                }
                if (userData.profileGoal) {
                    setOnboardingGoal(userData.profileGoal);
                }

                if (userData.dailyTasks) {
                    setDailyTasks(userData.dailyTasks);
                }
                const enriched = recalcAndPersistUserProgress(storedUser, userData);
                localStorage.setItem(userKey, JSON.stringify(enriched));
            }
            
            const onboardingKey = `nutrisip_onboarding_done_${storedUser}`;
            if (!localStorage.getItem(onboardingKey)) {
                setOnboardingStep(0);
                setShowOnboarding(true);
            } else if (!sessionStorage.getItem('moodify_welcomed')) {
                setShowWelcome(true);
                sessionStorage.setItem('moodify_welcomed', 'true');
            }
            
            // Daily healthy quote
            const date = new Date();
            const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
            setDailyQuote(HEALTH_QUOTES[dayOfYear % HEALTH_QUOTES.length]);
        }
    }, []);

    const toggleTask = (taskName) => {
        setDailyTasks(prev => {
            const newTasks = { ...prev, [taskName]: !prev[taskName] };
            
            if (username) {
                const userKey = `moodify_data_${username}`;
                const savedData = localStorage.getItem(userKey);
                if (savedData) {
                    const userData = JSON.parse(savedData);
                    userData.dailyTasks = newTasks;
                    
                    const enriched = recalcAndPersistUserProgress(username, userData);
                    localStorage.setItem(userKey, JSON.stringify(enriched));
                    if (newTasks[taskName]) {
                        trackEvent('task_completed', { taskName }).catch(() => {});
                    }
                }
            }
            return newTasks;
        });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        const name = inputName.trim();

        if (!name) {
            setAuthError('Nama panggilan wajib diisi.');
            return;
        }
        if (!consentChecked) {
            setAuthError('Kamu perlu menyetujui kebijakan privasi terlebih dahulu.');
            return;
        }

        finalizeLogin(name);
    };

    const handleNextOnboarding = () => {
        if (onboardingStep < ONBOARDING_STEPS.length - 1) {
            setOnboardingStep(prev => prev + 1);
            return;
        }

        const onboardingKey = `nutrisip_onboarding_done_${username}`;
        localStorage.setItem(onboardingKey, 'true');
        if (username) {
            const userKey = `moodify_data_${username}`;
            const raw = localStorage.getItem(userKey);
            if (raw) {
                const userData = JSON.parse(raw);
                userData.profileGoal = onboardingGoal;
                localStorage.setItem(userKey, JSON.stringify(userData));
            }
        }
        setShowOnboarding(false);
        setShowWelcome(true);
        sessionStorage.setItem('moodify_welcomed', 'true');
        trackEvent('onboarding_complete', { username, goal: onboardingGoal }).catch(() => {});
    };

    const handleSkipOnboarding = () => {
        const onboardingKey = `nutrisip_onboarding_done_${username}`;
        localStorage.setItem(onboardingKey, 'true');
        setShowOnboarding(false);
        setShowWelcome(true);
        sessionStorage.setItem('moodify_welcomed', 'true');
        trackEvent('onboarding_skipped', { username, goal: onboardingGoal }).catch(() => {});
    };

    if (!isLoggedIn) {
        return (
            <div className="home-container animate-fade-in" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '80vh', paddingBottom: '0' }}>
                <div className="login-card glass-card">
                    <div className="logo-placeholder login-logo-large" style={{ margin: '0 auto 24px auto', width: '84px', height: '84px', fontSize: '32px' }}>
                        <img className="app-logo-img" src={nutrisipLogo} alt="SUGARSENSE logo" />
                    </div>
                    <h2 className="app-name" style={{ textAlign: 'center', marginBottom: '8px' }}>SUGARSENSE</h2>
                    <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '24px', fontSize: '14px' }}>
                        Pindai Gizi Minuman & Jaga Asupan Gulamu.
                    </p>

                    <form onSubmit={handleLogin} className="login-form">
                        <label style={{ fontSize: '12px', fontWeight: '600', color: '#123e42', marginBottom: '8px', display: 'block' }}>
                            SIAPA NAMAMU?
                        </label>
                        <input
                            type="text"
                            placeholder="Ketik nama panggilanmu..."
                            value={inputName}
                            onChange={(e) => setInputName(e.target.value)}
                            required
                            autoFocus
                        />
                        <label style={{ display: 'flex', gap: '8px', marginTop: '14px', alignItems: 'flex-start', textAlign: 'left' }}>
                            <input
                                type="checkbox"
                                checked={consentChecked}
                                onChange={(e) => setConsentChecked(e.target.checked)}
                                style={{ marginTop: '3px' }}
                            />
                            <span style={{ fontSize: '12px', color: '#475569' }}>
                                Saya menyetujui Kebijakan Privasi dan penggunaan data sesuai layanan SUGARSENSE.
                            </span>
                        </label>
                        {authError && (
                            <p style={{ marginTop: '10px', fontSize: '12px', color: '#b91c1c' }}>{authError}</p>
                        )}
                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={isAuthLoading}>
                            Masuk & Mulai Hidup Sehat
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="home-container animate-fade-in">
            {/* Header */}
            <header className="home-header">
                <div className="logo-container">
                    <img className="app-logo-img header-logo-img" src={nutrisipLogo} alt="NutriSip logo" />
                    <h2 className="app-name">SUGARSENSE</h2>
                </div>
                <div className="profile-shortcut">
                    <button className="icon-btn-rounded" style={{ fontSize: '20px', width: '40px', height: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} onClick={() => navigate('/profile')} title="Profil">
                        {avatar}
                    </button>
                    <span className="profile-shortcut-label">Ubah Profil</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="home-content">
                <div className="badge pulse-animation">
                    <Sparkles size={14} className="badge-icon" />
                    <span>Halo, {username}!</span>
                </div>

                <div className="hero-brand" aria-label="SUGARSENSE">
                    <img src={nutrisipLogo} alt="Logo SUGARSENSE" />
                    <span>SUGARSENSE</span>
                </div>

                <h1 className="hero-title">
                    Pindai & Kendalikan <br />
                    <span className="text-gradient">Gizi Minumanmu.</span>
                </h1>

                <p className="hero-description">
                    SUGARSENSE membantumu melacak asupan kalori dan gula minuman harian dengan pemindai instan berbasis AI. Cek sebelum minum demi ginjal sehat!
                </p>

                <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px', marginBottom: '24px' }}>
                    <button className="btn-primary hero-btn" style={{ flex: 1 }} onClick={() => navigate('/scan')}>
                        <Camera size={18} />
                        Pindai Minuman
                    </button>
                    <button className="btn-secondary" style={{ borderRadius: '16px', padding: '12px 20px', display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => navigate('/chat')}>
                        <MessageSquare size={18} />
                        Tanya SUGARSENSE AI
                    </button>
                </div>

                {/* Daily Tip/Quote Box */}
                {dailyQuote && (
                    <div className="daily-affirmation glass-card hover-lift" style={{ 
                        width: '100%', 
                        maxWidth: '500px',
                        marginBottom: '24px', 
                        padding: '20px', 
                        borderRadius: '20px', 
                        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                        border: '1px solid #bbf7d0',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <Quote size={24} color="#10b981" style={{ position: 'absolute', top: '12px', left: '16px', opacity: 0.15 }} />
                        <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#15803d', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Tips Nutrisi Hari Ini</h4>
                        <p style={{ fontSize: '15px', fontWeight: '600', color: '#0f5132', lineHeight: '1.5', margin: 0 }}>"{dailyQuote}"</p>
                    </div>
                )}

                {/* Level and streak widget */}
                <div className="glass-card" style={{ width: '100%', maxWidth: '500px', marginBottom: '24px', padding: '18px', borderRadius: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>Pangkat Nutrisi</strong>
                        <span style={{ fontSize: '12px', color: '#475569' }}>XP {playerStats.xp} • Lv {playerStats.level}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', textAlign: 'left' }}>
                        Target: {onboardingGoal} • Target Absen Aktif Harian: {playerStats.missionProgress}/5 hari
                    </p>
                    <div style={{ height: '8px', width: '100%', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (playerStats.missionProgress / 5) * 100)}%`, background: 'linear-gradient(90deg, #10b981, #3b82f6)' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: '#15803d', marginTop: '8px', textAlign: 'left', fontWeight: '600' }}>
                        Badge Tercapai: {playerStats.badges.length ? playerStats.badges.join(', ') : 'Belum ada badge'}
                    </p>
                </div>

                {/* Daily Beverage Log Checklist */}
                <div className="daily-challenge-box glass-card" style={{ width: '100%', maxWidth: '500px', padding: '18px', borderRadius: '20px', backgroundColor: '#ffffff' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '14px', color: '#123e42', display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                        🎯 Checklist Hidup Sehat & Minuman
                    </h3>
                    <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px', textAlign: 'left' }}>Selesaikan tugas untuk menaikkan level nutrisi:</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div 
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', backgroundColor: dailyTasks.drinkWater ? '#f0fdf4' : '#f8fafc', border: `1px solid ${dailyTasks.drinkWater ? '#bbf7d0' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                            onClick={() => toggleTask('drinkWater')}
                        >
                            {dailyTasks.drinkWater ? <CheckCircle2 size={22} color="#10b981" /> : <Circle size={22} color="#cbd5e1" />}
                            <span style={{ fontSize: '13.5px', fontWeight: '500', color: dailyTasks.drinkWater ? '#15803d' : '#334155', textDecoration: dailyTasks.drinkWater ? 'line-through' : 'none' }}>Minum air putih minimal 2 liter</span>
                        </div>

                        <div 
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', backgroundColor: dailyTasks.scanDrink ? '#f0fdf4' : '#f8fafc', border: `1px solid ${dailyTasks.scanDrink ? '#bbf7d0' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                            onClick={() => toggleTask('scanDrink')}
                        >
                            {dailyTasks.scanDrink ? <CheckCircle2 size={22} color="#10b981" /> : <Circle size={22} color="#cbd5e1" />}
                            <span style={{ fontSize: '13.5px', fontWeight: '500', color: dailyTasks.scanDrink ? '#15803d' : '#334155', textDecoration: dailyTasks.scanDrink ? 'line-through' : 'none' }}>Pindai (scan) gizi 1 minuman</span>
                        </div>

                        <div 
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', backgroundColor: dailyTasks.noSugar ? '#f0fdf4' : '#f8fafc', border: `1px solid ${dailyTasks.noSugar ? '#bbf7d0' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                            onClick={() => toggleTask('noSugar')}
                        >
                            {dailyTasks.noSugar ? <CheckCircle2 size={22} color="#10b981" /> : <Circle size={22} color="#cbd5e1" />}
                            <span style={{ fontSize: '13.5px', fontWeight: '500', color: dailyTasks.noSugar ? '#15803d' : '#334155', textDecoration: dailyTasks.noSugar ? 'line-through' : 'none' }}>Hindari minuman kemasan berpemanis hari ini</span>
                        </div>

                        <div 
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', backgroundColor: dailyTasks.walkTenMin ? '#f0fdf4' : '#f8fafc', border: `1px solid ${dailyTasks.walkTenMin ? '#bbf7d0' : '#e2e8f0'}`, cursor: 'pointer', transition: 'all 0.2s' }}
                            onClick={() => toggleTask('walkTenMin')}
                        >
                            {dailyTasks.walkTenMin ? <CheckCircle2 size={22} color="#10b981" /> : <Circle size={22} color="#cbd5e1" />}
                            <span style={{ fontSize: '13.5px', fontWeight: '500', color: dailyTasks.walkTenMin ? '#15803d' : '#334155', textDecoration: dailyTasks.walkTenMin ? 'line-through' : 'none' }}>Jalan kaki / aktif bergerak 10 menit</span>
                        </div>
                    </div>
                </div>

                {/* Additional Features Quick Navigation */}
                <div className="additional-features-box glass-card" style={{ width: '100%', maxWidth: '500px', marginTop: '24px', padding: '20px', borderRadius: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        🌿 Jelajahi Fitur Utama
                    </h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                        <div onClick={() => navigate('/scan')} style={{ padding: '18px 12px', backgroundColor: '#e6f7f5', borderRadius: '16px', textAlign: 'center', border: '1px solid #b2e3dd', cursor: 'pointer', transition: 'all 0.3s' }} className="hover-lift">
                          <Camera size={28} color="#0d9488" style={{ display: 'block', margin: '0 auto 8px auto' }} />
                          <span style={{ fontSize: '13px', color: '#0f766e', fontWeight: '700' }}>SugarScan</span>
                        </div>
                        <div onClick={() => navigate('/chat')} style={{ padding: '18px 12px', backgroundColor: '#eff6ff', borderRadius: '16px', textAlign: 'center', border: '1px solid #bfdbfe', cursor: 'pointer', transition: 'all 0.3s' }} className="hover-lift">
                          <MessageSquare size={28} color="#2563eb" style={{ display: 'block', margin: '0 auto 8px auto' }} />
                          <span style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: '700' }}>Konsul AI</span>
                        </div>
                        <div onClick={() => navigate('/checkin')} style={{ padding: '18px 12px', backgroundColor: '#fff7ed', borderRadius: '16px', textAlign: 'center', border: '1px solid #ffedd5', cursor: 'pointer', transition: 'all 0.3s' }} className="hover-lift">
                          <Activity size={28} color="#ea580c" style={{ display: 'block', margin: '0 auto 8px auto' }} />
                          <span style={{ fontSize: '13px', color: '#c2410c', fontWeight: '700' }}>Jadwal Gizi</span>
                        </div>
                        <div onClick={() => navigate('/progress')} style={{ padding: '18px 12px', backgroundColor: '#faf5ff', borderRadius: '16px', textAlign: 'center', border: '1px solid #f3e8ff', cursor: 'pointer', transition: 'all 0.3s' }} className="hover-lift">
                          <BarChart2 size={28} color="#7c3aed" style={{ display: 'block', margin: '0 auto 8px auto' }} />
                          <span style={{ fontSize: '13px', color: '#6d28d9', fontWeight: '700' }}>Pantauan Gula</span>
                        </div>
                        <div onClick={() => navigate('/game')} style={{ padding: '18px 12px', backgroundColor: '#f0fdf4', borderRadius: '16px', textAlign: 'center', border: '1px solid #bbf7d0', cursor: 'pointer', transition: 'all 0.3s', gridColumn: 'span 2' }} className="hover-lift">
                          <Gamepad2 size={28} color="#16a34a" style={{ display: 'block', margin: '0 auto 8px auto' }} />
                          <span style={{ fontSize: '13px', color: '#15803d', fontWeight: '700' }}>Main Game Sugar Catch</span>
                        </div>
                    </div>
                </div>

                {/* Onboarding Modal */}
                {showOnboarding && createPortal(
                    <div className="modal-overlay" onClick={handleSkipOnboarding} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8vh' }}>
                        <div className="modal-content glass-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '420px', padding: '28px 24px', textAlign: 'left', borderRadius: '24px', background: '#ffffff', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>Onboarding {onboardingStep + 1}/{ONBOARDING_STEPS.length}</span>
                                <button type="button" className="btn-link" onClick={handleSkipOnboarding}>Lewati</button>
                            </div>
                            <h3 style={{ marginBottom: '8px', color: '#0f172a' }}>{ONBOARDING_STEPS[onboardingStep].title}</h3>
                            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '20px' }}>
                                {ONBOARDING_STEPS[onboardingStep].description}
                            </p>
                            {onboardingStep === 0 && (
                                <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
                                    {ONBOARDING_GOALS.map((goal) => (
                                        <button
                                            key={goal}
                                            type="button"
                                            onClick={() => setOnboardingGoal(goal)}
                                            style={{
                                                textAlign: 'left',
                                                borderRadius: '10px',
                                                border: goal === onboardingGoal ? '1px solid var(--primary)' : '1px solid #e2e8f0',
                                                background: goal === onboardingGoal ? 'var(--primary-surface)' : '#fff',
                                                color: '#0f172a',
                                                padding: '10px 12px',
                                                fontSize: '13px',
                                                fontWeight: 600
                                            }}
                                        >
                                            {goal}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                                {ONBOARDING_STEPS.map((_, idx) => (
                                    <div key={idx} style={{ height: '6px', flex: 1, borderRadius: '99px', background: idx <= onboardingStep ? 'var(--primary)' : '#e2e8f0' }} />
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} disabled={onboardingStep === 0} onClick={() => setOnboardingStep((prev) => Math.max(0, prev - 1))}>
                                    Kembali
                                </button>
                                <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={handleNextOnboarding}>
                                    {onboardingStep === ONBOARDING_STEPS.length - 1 ? 'Selesai' : 'Lanjut'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Welcome Modal Popup */}
                {showWelcome && (
                    <div className="modal-overlay" onClick={() => setShowWelcome(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10vh' }}>
                        <div className="modal-content glass-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px', padding: '32px 24px', textAlign: 'center', borderRadius: '24px', background: '#ffffff', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                            <div className="welcome-logo" style={{ width: '84px', height: '84px', background: '#dcfce7', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px auto' }}>
                                <img className="app-logo-img" src={nutrisipLogo} alt="SUGARSENSE logo" />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Selamat Datang, {username}!</h2>
                            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
                                Senang melihatmu di SUGARSENSE. Kami siap membantumu mengukur gizi minuman dan membatasi asupan gula harian agar ginjal & tubuhmu tetap prima.
                            </p>
                            <button className="btn-primary hover-lift" onClick={() => setShowWelcome(false)} style={{ width: '100%', padding: '14px', borderRadius: '16px' }}>
                                Mulai Menjaga Kesehatan
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Home;
