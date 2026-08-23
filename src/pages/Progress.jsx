import { useState, useEffect } from 'react';
import { Flame, Calendar, Award, Target, BarChart3 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { trackEvent } from '../lib/analytics';
import { enqueueSheetsBackup } from '../lib/sheetsBackup';
import './Progress.css';

const DEFAULT_DATA = [
    { name: 'Min', gula: 0, air: 0, olahraga: 0 },
    { name: 'Sen', gula: 0, air: 0, olahraga: 0 },
    { name: 'Sel', gula: 0, air: 0, olahraga: 0 },
    { name: 'Rab', gula: 0, air: 0, olahraga: 0 },
    { name: 'Kam', gula: 0, air: 0, olahraga: 0 },
    { name: 'Jum', gula: 0, air: 0, olahraga: 0 },
    { name: 'Sab', gula: 0, air: 0, olahraga: 0 }
];

const Progress = () => {
    const [hasData, setHasData] = useState(false);
    const [chartData, setChartData] = useState(DEFAULT_DATA);
    const [stats, setStats] = useState({
        streak: 0,
        scans: 0,
        averageSugar: 0,
        averageWater: 0,
        level: "🌱 NutriNovice",
        healthStatus: "Optimal",
        sugarTrend: "Aman",
        activities: 0
    });
    
    const [weeklyInsight, setWeeklyInsight] = useState({
        title: 'Analisis Gizi Mingguan',
        summary: 'Mulai catat absen harian atau pindai minuman agar analisis otomatis tampil di sini.',
        recommendation: 'Targetkan minum air putih 8 gelas sehari dan batasi gula di bawah 50 gram.',
        trigger: 'Belum ada data asupan yang cukup.'
    });
    const [manualDrink, setManualDrink] = useState({ name: '', sugar: '' });
    const [todaySugar, setTodaySugar] = useState(0);

    const addManualDrink = (event) => {
        event.preventDefault();
        const username = localStorage.getItem('moodify_currentUser');
        const sugar = Number(manualDrink.sugar);
        if (!username || !manualDrink.name.trim() || !Number.isFinite(sugar) || sugar < 0) return;
        const key = `moodify_data_${username}`;
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        const entry = { date: new Date().toISOString(), drinkId: 'manual', name: manualDrink.name.trim(), sugar, source: 'Input manual' };
        data.scanHistory = [...(data.scanHistory || []), entry];
        localStorage.setItem(key, JSON.stringify(data));
        enqueueSheetsBackup({ eventType: 'manual_drink_log', username, payload: entry });
        setTodaySugar((value) => value + sugar);
        setManualDrink({ name: '', sugar: '' });
        setStats((value) => ({ ...value, scans: value.scans + 1 }));
    };

    useEffect(() => {
        const username = localStorage.getItem('moodify_currentUser');
        if (!username) return;

        const userKey = `moodify_data_${username}`;
        try {
            const savedData = localStorage.getItem(userKey);
            if (savedData) {
                const userData = JSON.parse(savedData);
                const today = new Date().toISOString().slice(0, 10);
                const todayTotal = (userData.scanHistory || [])
                    .filter((entry) => String(entry.date || '').slice(0, 10) === today)
                    .reduce((total, entry) => total + (Number(entry.sugar) || 0), 0);
                setTodaySugar(Number(todayTotal.toFixed(1)));
                
                let newChartData = [...DEFAULT_DATA];

                if (userData.hasCheckedIn || (userData.history && userData.history.length > 0)) {
                    setHasData(true);

                    // Parse history into chart data
                    if (userData.history && userData.history.length > 0) {
                        const historyData = userData.history.slice(-7);
                        const startIndex = Math.max(0, 7 - historyData.length);
                        
                        for (let i = 0; i < historyData.length; i++) {
                            const entry = historyData[i];
                            const dateObj = new Date(entry.date);
                            const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
                            const dayName = dayNames[dateObj.getDay()];

                            // Map sadness -> gula, anxiety -> air, stress -> olahraga
                            newChartData[startIndex + i] = {
                                name: dayName,
                                gula: Math.max(0, entry.sliders?.sadness || 0),
                                air: Math.max(0, entry.sliders?.anxiety || 0),
                                olahraga: Math.max(0, entry.sliders?.stress || 0)
                            };
                        }

                        const avgSugar = historyData.reduce((acc, item) => acc + (item.sliders?.sadness || 0), 0) / historyData.length;
                        const avgWater = historyData.reduce((acc, item) => acc + (item.sliders?.anxiety || 0), 0) / historyData.length;
                        const avgExercise = historyData.reduce((acc, item) => acc + (item.sliders?.stress || 0), 0) / historyData.length;
                        const scanCount = userData.scanHistory?.length || 0;

                        let insightTitle = 'Asupan Gizi Seimbang 🌟';
                        let insightSummary = `Rata-rata asupan gula minumanmu ${avgSugar.toFixed(0)}g/hari dan minum air ${avgWater.toFixed(1)} gelas/hari.`;
                        let insightRecommendation = 'Luar biasa! Pertahankan konsumsi gula di bawah batas 50 gram harian Kemenkes.';
                        let insightTrigger = 'Kondisi hidrasimu sangat stabil dan optimal.';

                        if (avgSugar >= 50) {
                            insightTitle = 'Peringatan: Gula Berlebih! 🥫';
                            insightSummary = `Asupan gula rata-rata (${avgSugar.toFixed(0)}g) sudah mencapai atau melebihi batas maksimal harian (50g).`;
                            insightRecommendation = 'Kurangi konsumsi boba, soda, atau es kopi susu berpemanis gula aren. Coba gantikan dengan teh tawar hangat atau air mineral.';
                            insightTrigger = 'Kelebihan gula dapat merusak ginjal dalam jangka panjang.';
                        } else if (avgWater < 6) {
                            insightTitle = 'Dehidrasi Ringan 💧';
                            insightSummary = `Asupan air putihmu rata-rata baru ${avgWater.toFixed(1)} gelas dari target 8 gelas harian.`;
                            insightRecommendation = 'Bawa selalu botol minum isi ulang saat pergi sekolah atau kuliah untuk memudahkan hidrasi teratur.';
                            insightTrigger = 'Kurang cairan dapat memicu pusing dan kurang konsentrasi.';
                        }

                        setWeeklyInsight({
                            title: insightTitle,
                            summary: insightSummary,
                            recommendation: insightRecommendation,
                            trigger: insightTrigger
                        });

                        // Calculate Level
                        let currentLevel = "🌱 NutriNovice";
                        const totalXP = userData.gamification?.xp || 0;
                        if (totalXP >= 300) currentLevel = "🏆 NutriMaster";
                        else if (totalXP >= 120) currentLevel = "🌿 SipConsistent";

                        // Calculate total activities completed
                        let actsCompleted = 0;
                        historyData.forEach(item => {
                            if (item.dailyCompleted) actsCompleted += item.dailyCompleted;
                        });

                        setStats({
                            streak: userData.streak || 0,
                            scans: scanCount,
                            averageSugar: Math.round(avgSugar),
                            averageWater: Number(avgWater.toFixed(1)),
                            level: currentLevel,
                            healthStatus: avgSugar >= 50 ? "Peringatan Gula" : "Sehat/Optimal",
                            sugarTrend: avgSugar < 25 ? "Sangat Rendah" : (avgSugar < 50 ? "Normal" : "Tinggi Gula"),
                            activities: historyData.length
                        });
                    }
                    setChartData(newChartData);
                }
            }
        } catch (e) {
            console.error(e);
        }
    }, []);

    return (
        <div className="progress-container animate-fade-in">
            <header className="progress-top-brand">
                <div className="feature-heading"><BarChart3 className="feature-heading-icon" /><span className="brand-text">Pantauan Gula & Statistik</span></div>
            </header>

            <div className="stats-cards-grid">
                <div className="stat-card hover-lift">
                    <Flame size={20} color="#ea580c" />
                    <span className="stat-num">{stats.streak} Hari</span>
                    <span className="stat-desc">Streak Sehat</span>
                </div>
                <div className="stat-card hover-lift">
                    <Calendar size={20} color="#0d9488" />
                    <span className="stat-num">{stats.scans} Kali</span>
                    <span className="stat-desc">Pindai Minuman</span>
                </div>
                <div className="stat-card hover-lift">
                    <Target size={20} color="#2563eb" />
                    <span className="stat-num">{stats.averageSugar}g / Harian</span>
                    <span className="stat-desc">Rata-rata Gula</span>
                </div>
                <div className="stat-card hover-lift">
                    <Award size={20} color="#7c3aed" />
                    <span className="stat-num">{stats.averageWater} Gelas</span>
                    <span className="stat-desc">Rata-rata Air</span>
                </div>
            </div>

            <section className="consumption-panel glass-card">
                <div className="section-heading-row">
                    <div><h3 className="chart-title">Pantauan Gula Hari Ini</h3><p className="chart-subtitle">Target maksimal 50 gram. Hasil scan dan input manual tersimpan di riwayat.</p></div>
                    <strong>{todaySugar}g / 50g</strong>
                </div>
                <div className="consumption-progress"><span style={{ width: `${Math.min(100, (todaySugar / 50) * 100)}%` }} /></div>
                <form className="manual-drink-form" onSubmit={addManualDrink}>
                    <input aria-label="Nama minuman" placeholder="Nama minuman" value={manualDrink.name} onChange={(event) => setManualDrink({ ...manualDrink, name: event.target.value })} />
                    <input aria-label="Gula minuman dalam gram" type="number" min="0" step="0.1" placeholder="Gula (gram)" value={manualDrink.sugar} onChange={(event) => setManualDrink({ ...manualDrink, sugar: event.target.value })} />
                    <button className="btn-primary" type="submit">Tambah</button>
                </form>
            </section>

            {/* Recharts Gula Area Chart */}
            <div className="chart-section glass-card">
                <h3 className="chart-title">Grafik Asupan Gula & Air Mingguan</h3>
                <p className="chart-subtitle">Memetakan asupan minuman manis (gram) & air mineral (gelas).</p>
                
                <div className="chart-container-wrapper" style={{ width: '100%', height: 260 }}>
                    {hasData ? (
                        <ResponsiveContainer>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorGula" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0}/>
                                    </linearGradient>
                                    <linearGradient id="colorAir" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                                <Tooltip />
                                <Area type="monotone" name="Gula (g)" dataKey="gula" stroke="#f97316" fillOpacity={1} fill="url(#colorGula)" strokeWidth={2} />
                                <Area type="monotone" name="Air (gelas)" dataKey="air" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorAir)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart-state">
                            <span style={{ fontSize: '32px' }}>📊</span>
                            <p>Data belum cukup. Lakukan absen kegiatan harian minimal sekali untuk memunculkan grafik.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Weekly Insight Section */}
            <div className="insight-section glass-card">
                <h3 className="insight-title-main">{weeklyInsight.title}</h3>
                <p className="insight-summary">{weeklyInsight.summary}</p>
                <div className="insight-bullet">
                    <strong className="text-primary">Rekomendasi Sehat:</strong> {weeklyInsight.recommendation}
                </div>
                <div className="insight-bullet">
                    <strong>Fakta Pendukung:</strong> {weeklyInsight.trigger}
                </div>
            </div>
        </div>
    );
};

export default Progress;
