import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, CheckCircle2, AlertCircle, BookOpen, Calendar, HelpCircle, ClipboardCheck } from 'lucide-react';
import { trackEvent } from '../lib/analytics';
import moodifyLogo from '../assets/Moodify.png';
import './CheckIn.css';

const PROGRAM_DAYS = [
  {
    day: 1,
    title: 'Detoks Gula Harian',
    desc: 'Hindari minuman soda, boba, dan sirup berpemanis tambahan hari ini. Ganti dengan air putih hangat atau teh hijau tawar.',
    tip: 'Pemanis buatan dan gula berlebih dapat memicu lonjakan insulin instan yang membuat tubuh cepat mengantuk.'
  },
  {
    day: 2,
    title: 'Hidrasi Sel Tubuh',
    desc: 'Minum minimal 8 gelas air putih hari ini secara bertahap (setelah bangun tidur, sebelum makan, sore, dan sebelum tidur).',
    tip: 'Minum air hangat di pagi hari membantu melancarkan pencernaan dan detoksifikasi racun.'
  },
  {
    day: 3,
    title: 'Kenali Nutri-Score',
    desc: 'Sebelum membeli minuman kemasan di minimarket, biasakan balik kemasan dan cek tabel informasi gizi. Cari yang berkadar gula di bawah 5 gram per 100ml.',
    tip: 'Minuman dengan Nutri-Score A dan B adalah pilihan terbaik karena rendah gula dan lemak jenuh.'
  },
  {
    day: 4,
    title: 'Pemanis Alami Sehat',
    desc: 'Jika mendambakan rasa manis, konsumsilah buah potong segar (semangka, jeruk) atau tambahkan satu sendok madu murni ke dalam teh tawar.',
    tip: 'Gula alami buah (fruktosa) disertai serat yang mencegah lonjakan drastis kadar gula darah.'
  },
  {
    day: 5,
    title: 'Aktif Bergerak Setelah Manis',
    desc: 'Lakukan jalan kaki santai selama 15 menit setelah mengonsumsi karbohidrat atau minuman manis agar kalori langsung dibakar menjadi energi.',
    tip: 'Bergerak ringan membantu otot menggunakan glukosa dari aliran darah dengan cepat.'
  },
  {
    day: 6,
    title: 'Beralih ke Zero-Calorie',
    desc: 'Cobalah beralih ke kopi hitam tanpa gula atau teh chamomile di malam hari untuk menenangkan saraf tanpa tambahan kalori.',
    tip: 'Teh chamomile membantu meningkatkan kualitas tidur pulas (deep sleep) Anda.'
  },
  {
    day: 7,
    title: 'Komitmen Gaya Hidup Baru',
    desc: 'Evaluasi asupan minuman manismu selama seminggu ini. Buat rencana batasan asupan gula pribadi untuk minggu depan.',
    tip: 'Kebutuhan gula harian maksimal hanya 50 gram (setara 4 sendok makan). Jaga ini demi masa depan ginjal sehat!'
  }
];

const CheckIn = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('log'); // log, program
    const [waterIntake, setWaterIntake] = useState(4); // in glasses
    const [sugarIntake, setSugarIntake] = useState(15); // in grams
    const [exerciseTime, setExerciseTime] = useState(10); // in minutes
    const [eatFruit, setEatFruit] = useState(false);
    
    const [journalText, setJournalText] = useState('');
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [syncNotice, setSyncNotice] = useState('');
    const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

    // Program status states
    const [completedDays, setCompletedDays] = useState({});

    const getTodayKey = () => new Date().toISOString().split('T')[0];

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        const checkTodayStatus = async () => {
            const username = localStorage.getItem('moodify_currentUser');
            if (!username) return;
            const userKey = `moodify_data_${username}`;
            const todayKey = getTodayKey();
            try {
                const raw = localStorage.getItem(userKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const localAlready = Array.isArray(parsed.history) && parsed.history.some((h) => h?.date?.startsWith(todayKey));
                    if (localAlready) {
                        setHasCheckedInToday(true);
                        setSyncNotice('Kamu telah mencatat laporan gizi hari ini. Mari lanjutkan esok hari!');
                    }
                    if (parsed.completedProgramDays) {
                        setCompletedDays(parsed.completedProgramDays);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
        checkTodayStatus();
    }, []);

    const handleSave = async () => {
        setSyncNotice('');

        const username = localStorage.getItem('moodify_currentUser');
        if (!username) {
            alert('Silakan isi namamu terlebih dahulu di halaman Home!');
            navigate('/home');
            return;
        }

        const userKey = `moodify_data_${username}`;
        const todayKey = getTodayKey();
        let userData = {
            hasCheckedIn: false,
            lastMood: null,
            lastSliders: null,
            totalSessions: 0,
            streak: 0,
            history: [],
            chatHistory: []
        };

        try {
            const savedData = localStorage.getItem(userKey);
            if (savedData) {
                userData = JSON.parse(savedData);
            }
        } catch (e) {
            console.error(e);
        }

        const localAlreadyCheckedInToday = Array.isArray(userData.history) && userData.history.some((h) => h?.date?.startsWith(todayKey));
        if (localAlreadyCheckedInToday || hasCheckedInToday) {
            setHasCheckedInToday(true);
            setSyncNotice('Kamu telah mencatat laporan gizi hari ini. Mari lanjutkan esok hari!');
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            return;
        }

        setIsSaving(true);
        userData.hasCheckedIn = true;
        
        // Convert check-in to beverage metrics
        userData.lastSliders = {
            sadness: sugarIntake, // re-map to old field names so stats charts can read without breaking
            anxiety: waterIntake, 
            stress: exerciseTime
        };

        userData.totalSessions += 1;
        userData.streak += 1;

        const newEntry = {
            date: new Date().toISOString(),
            sliders: {
                sadness: sugarIntake,
                anxiety: waterIntake,
                stress: exerciseTime
            },
            eatFruit: eatFruit,
            journalText: journalText
        };

        if (!userData.history) userData.history = [];
        userData.history.push(newEntry);

        // Award XP
        if (!userData.gamification) userData.gamification = { xp: 0, level: 1, badges: [] };
        userData.gamification.xp += 25;
        userData.gamification.level = Math.max(1, Math.floor(userData.gamification.xp / 60) + 1);

        localStorage.setItem(userKey, JSON.stringify(userData));
        setIsSaving(false);
        setHasCheckedInToday(true);
        setIsSaved(true);
        
        trackEvent('beverage_log_saved', {
            sugar: sugarIntake,
            water: waterIntake,
            exercise: exerciseTime,
            eatFruit
        }).catch(() => {});

        setTimeout(() => {
            navigate('/progress');
        }, 1500);
    };

    const toggleProgramDay = (dayNum) => {
        const username = localStorage.getItem('moodify_currentUser');
        if (!username) return;

        const userKey = `moodify_data_${username}`;
        setCompletedDays(prev => {
            const next = { ...prev, [dayNum]: !prev[dayNum] };
            
            // Save to local storage
            try {
                const raw = localStorage.getItem(userKey);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    parsed.completedProgramDays = next;
                    
                    // Award XP on checkin completion
                    if (!parsed.gamification) parsed.gamification = { xp: 0, level: 1, badges: [] };
                    if (next[dayNum]) {
                        parsed.gamification.xp += 20;
                        parsed.gamification.level = Math.max(1, Math.floor(parsed.gamification.xp / 60) + 1);
                        trackEvent('program_day_completed', { dayNum }).catch(() => {});
                    }
                    localStorage.setItem(userKey, JSON.stringify(parsed));
                }
            } catch (e) {
                console.error(e);
            }
            
            return next;
        });
    };

    return (
        <div className="checkin-container animate-fade-in">
            {/* Top Navigation Tab Bar */}
            <div className="checkin-nav-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`}
                    onClick={() => setActiveTab('log')}
                >
                    📝 Absen Kegiatan
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'program' ? 'active' : ''}`}
                    onClick={() => setActiveTab('program')}
                >
                    📚 Program Gaya Hidup
                </button>
            </div>

            {/* TAB 1: ABSEN KEGIATAN */}
            {activeTab === 'log' && (
                <div className="checkin-card glass-card">
                    <div className="feature-heading"><ClipboardCheck className="feature-heading-icon" /><h2 className="title">Catat Asupan & Kegiatan Harian</h2></div>
                    <p className="subtitle">
                        Yuk pantau gaya hidup sehatmu dengan mencatat asupan gula dan air putih hari ini!
                    </p>

                    {syncNotice && (
                        <div className="alert-box info-alert">
                            <CheckCircle2 size={16} />
                            <span>{syncNotice}</span>
                        </div>
                    )}

                    {!hasCheckedInToday ? (
                        <div className="checkin-form">
                            
                            {/* Water intake slider */}
                            <div className="form-group">
                                <div className="slider-label-row">
                                    <label>Asupan Air Putih</label>
                                    <strong className="text-primary">{waterIntake} Gelas (~{waterIntake * 250} ml)</strong>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="12"
                                    step="1"
                                    value={waterIntake}
                                    onChange={(e) => setWaterIntake(parseInt(e.target.value))}
                                    className="custom-range-slider"
                                />
                                <div className="range-hints">
                                    <span>Dehidrasi</span>
                                    <span>Cukup (8+ Gelas)</span>
                                </div>
                            </div>

                            {/* Sugar intake slider */}
                            <div className="form-group">
                                <div className="slider-label-row">
                                    <label>Kira-kira Konsumsi Gula Minuman</label>
                                    <strong style={{ color: sugarIntake > 30 ? 'var(--danger)' : 'var(--success)' }}>
                                        {sugarIntake} Gram
                                    </strong>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="80"
                                    step="5"
                                    value={sugarIntake}
                                    onChange={(e) => setSugarIntake(parseInt(e.target.value))}
                                    className="custom-range-slider"
                                />
                                <div className="range-hints">
                                    <span>Bebas Gula</span>
                                    <span style={{ color: 'var(--danger)' }}>Batas Maksimal Kemenkes (50g)</span>
                                </div>
                            </div>

                            {/* Exercise time slider */}
                            <div className="form-group">
                                <div className="slider-label-row">
                                    <label>Durasi Olahraga/Fisik</label>
                                    <strong className="text-primary">{exerciseTime} Menit</strong>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="90"
                                    step="5"
                                    value={exerciseTime}
                                    onChange={(e) => setExerciseTime(parseInt(e.target.value))}
                                    className="custom-range-slider"
                                />
                                <div className="range-hints">
                                    <span>Rebahan</span>
                                    <span>Sangat Aktif (60+ m)</span>
                                </div>
                            </div>

                            {/* Eat Fruit Checkbox */}
                            <div className="form-group-checkbox">
                                <label className="checkbox-container">
                                    <input 
                                        type="checkbox" 
                                        checked={eatFruit} 
                                        onChange={(e) => setEatFruit(e.target.checked)} 
                                    />
                                    <span className="checkmark"></span>
                                    <span className="checkbox-text">Saya mengonsumsi buah/sayur segar hari ini</span>
                                </label>
                            </div>

                            {/* Journal Text */}
                            <div className="form-group">
                                <label className="block-label">Catatan Tambahan Minuman & Makanan</label>
                                <textarea
                                    rows="3"
                                    placeholder="Tulis minuman/makanan manis apa saja yang kamu konsumsi hari ini, atau catatan komitmen sehatmu..."
                                    value={journalText}
                                    onChange={(e) => setJournalText(e.target.value)}
                                    maxLength="300"
                                />
                            </div>

                            {/* Save Button */}
                            <button
                                className="btn-primary checkin-save-btn"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Menyimpan...' : 'Simpan Laporan Harian (+25 XP)'}
                            </button>
                        </div>
                    ) : (
                        <div className="saved-success-state animate-fade-in">
                            <span className="emoji-celebrate">🎉</span>
                            <h3>Catatan Hari Ini Berhasil Disimpan!</h3>
                            <p>Skor XP nutrisi Anda telah meningkat. Grafik asupan gula mingguan akan diperbarui secara otomatis.</p>
                            <button className="btn-primary" onClick={() => navigate('/progress')}>
                                Lihat Progres Grafik Gula
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: PROGRAM GAYA HIDUP SEHAT */}
            {activeTab === 'program' && (
                <div className="program-card glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <BookOpen size={24} color="var(--primary)" />
                        <h2 className="title" style={{ margin: 0 }}>Panduan Pola Hidup Sehat 7 Hari</h2>
                    </div>
                    <p className="subtitle">
                        Ikuti misi harian untuk melatih kebiasaan sehat mengurangi minuman manis. Dapatkan +20 XP untuk setiap hari yang berhasil diselesaikan!
                    </p>

                    <div className="program-grid">
                        {PROGRAM_DAYS.map((day) => {
                            const isCompleted = completedDays[day.day];
                            return (
                                <div key={day.day} className={`program-day-card ${isCompleted ? 'completed' : ''}`}>
                                    <div className="day-card-header">
                                        <span className="day-number">HARI 0{day.day}</span>
                                        <label className="program-checkbox-container">
                                            <input 
                                                type="checkbox" 
                                                checked={!!isCompleted} 
                                                onChange={() => toggleProgramDay(day.day)} 
                                            />
                                            <span className="program-checkmark"></span>
                                        </label>
                                    </div>
                                    
                                    <h4 className="day-title">{day.title}</h4>
                                    <p className="day-desc">{day.desc}</p>
                                    
                                    <div className="day-tip-box">
                                        <strong>Fakta Sehat:</strong> {day.tip}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CheckIn;
