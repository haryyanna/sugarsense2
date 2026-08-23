import { useDeferredValue, useState, useEffect, useRef } from 'react';
import { Users, Activity, MessageCircle, AlertCircle, Download, X, BarChart2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { deleteNeonUser, isNeonEnabled, listNeonAdminUsers } from '../lib/neonApi';
import { trackEvent } from '../lib/analytics';
import moodifyLogo from '../assets/Moodify.png';
import './AdminDatabase.css';
const ADMIN_AUDIT_KEY = 'moodify_admin_audit_log';

const getAdminAuditLog = () => {
    try {
        const raw = localStorage.getItem(ADMIN_AUDIT_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const appendAdminAuditLog = (action, detail = {}) => {
    const current = getAdminAuditLog();
    const next = [
        ...current,
        {
            at: new Date().toISOString(),
            action,
            detail
        }
    ];
    localStorage.setItem(ADMIN_AUDIT_KEY, JSON.stringify(next.slice(-100)));
};

const AdminDatabase = () => {
    const [users, setUsers] = useState([]);
    const [globalChartData, setGlobalChartData] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showUserChart, setShowUserChart] = useState(false);
    const [dataSource, setDataSource] = useState('cloud');
    const [loadWarning, setLoadWarning] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [riskAlerts, setRiskAlerts] = useState([]);
    const [cohortStats, setCohortStats] = useState({ d1: 0, d7: 0, d30: 0, checkinCompletion: 0, onboardingToActive: 0 });
    const [funnelStats, setFunnelStats] = useState({ login: 0, onboarding: 0, checkin: 0, progress: 0 });
    const [heatmapData, setHeatmapData] = useState([]);
    const [distributionData, setDistributionData] = useState([]);
    const [segmentTrendData, setSegmentTrendData] = useState([]);
    const [dataQuality, setDataQuality] = useState({ missingFieldRate: 0, syncFailRate: 0, avgSyncDelayMins: 0 });
    const [auditLog, setAuditLog] = useState([]);
    const [refreshTick, setRefreshTick] = useState(0);
    const modalBodyRef = useRef(null);
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const pageSize = 10;

    const [stats, setStats] = useState({
        total: 0,
        checkInsToday: 0,
        interventions: 0,
        highRisk: 0
    });

    const calculateRiskLevel = (sliders) => {
        if (!sliders) return 'Belum Ada';
        const avg = (sliders.sadness + sliders.anxiety + sliders.stress) / 3;
        if (avg >= 7) return 'Tinggi';
        if (avg >= 4) return 'Sedang';
        return 'Rendah';
    };

    const getMoodText = (moodId) => {
        const MOOD_DATA_MAP = {
            1: "Sangat Sedih",
            2: "Sedih",
            3: "Biasa Saja",
            4: "Senang",
            5: "Sangat Senang"
        };
        return MOOD_DATA_MAP[moodId] || 'Tidak Diketahui';
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return 'Belum Aktif';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMins / 60);
        const diffDays = Math.round(diffHours / 24);

        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} jam ago`;
        if (diffDays === 1) return `Kemarin`;
        return `${diffDays} hari ago`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const isToday = (dateString) => {
        if (!dateString) return false;
        const date = new Date(dateString);
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    useEffect(() => {
        const loadUsers = async () => {
            setIsLoading(true);
            setLoadWarning('');
            const loadedUsers = [];
            let totalCheckInsToday = 0;
            let totalInterventions = 0;
            let totalHighRisk = 0;
            let missingFields = 0;
            let totalFields = 0;
            let syncFailures = 0;
            let totalCheckins = 0;
            const riskAlertRows = [];
            const dayHourMap = {};
            const distributionBins = {
                '0-2': 0,
                '3-5': 0,
                '6-8': 0,
                '9-10': 0
            };
            const segmentSeries = {};

            // For global chart: count moods per day
            const moodTrends = {
                'Min': 0, 'Sen': 0, 'Sel': 0, 'Rab': 0, 'Kam': 0, 'Jum': 0, 'Sab': 0
            };

            const processUserRecord = (username, userRecord, createdAt) => {
                const history = (userRecord || []).map(w => {
                    const sliders = w.sliders
                        ? w.sliders
                        : {
                            sadness: w.sadness || 0,
                            anxiety: w.anxiety || 0,
                            stress: w.stress || 0
                        };

                    return {
                        date: w.created_at || w.date,
                        mood: w.mood,
                        sliders,
                        journalText: w.journal || w.journalText || ''
                    };
                }).sort((a, b) => new Date(a.date) - new Date(b.date));

                let lastActiveStr = null;
                let lastRisk = 'Belum Ada';
                let lastMoodStr = 'Belum Ada Data';

                if (history.length > 0) {
                    const lastEntry = history[history.length - 1];
                    lastActiveStr = lastEntry.date;
                    lastRisk = calculateRiskLevel(lastEntry.sliders);
                    lastMoodStr = getMoodText(lastEntry.mood);

                    if (isToday(lastEntry.date)) {
                        totalCheckInsToday++;
                    }

                    history.forEach(entry => {
                        const dateObj = new Date(entry.date);
                        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
                        const dayName = dayNames[dateObj.getDay()];
                        moodTrends[dayName]++;
                        totalCheckins++;

                        const hour = String(dateObj.getHours()).padStart(2, '0');
                        const heatKey = `${dayName}-${hour}`;
                        dayHourMap[heatKey] = (dayHourMap[heatKey] || 0) + 1;

                        const avgScore = ((entry.sliders?.sadness || 0) + (entry.sliders?.anxiety || 0) + (entry.sliders?.stress || 0)) / 3;
                        if (avgScore <= 2) distributionBins['0-2'] += 1;
                        else if (avgScore <= 5) distributionBins['3-5'] += 1;
                        else if (avgScore <= 8) distributionBins['6-8'] += 1;
                        else distributionBins['9-10'] += 1;

                        totalFields += 4;
                        if (!entry.mood) missingFields++;
                        if (entry.sliders?.sadness == null) missingFields++;
                        if (entry.sliders?.anxiety == null) missingFields++;
                        if (entry.sliders?.stress == null) missingFields++;

                        const segment = (createdAt && (new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24) > 14) ? 'Returning' : 'New';
                        if (!segmentSeries[dayName]) {
                            segmentSeries[dayName] = { name: dayName, New: 0, Returning: 0 };
                        }
                        segmentSeries[dayName][segment] += 1;
                    });

                    const recent3 = history.slice(-3);
                    const hasConsecutiveHighRisk = recent3.length === 3 && recent3.every((entry) => calculateRiskLevel(entry.sliders) === 'Tinggi');
                    if (hasConsecutiveHighRisk) {
                        riskAlertRows.push({
                            username,
                            reason: 'Risiko tinggi 3 sesi beruntun',
                            lastActive: formatDate(lastEntry.date)
                        });
                    }
                }

                if (lastRisk === 'Tinggi') {
                    totalHighRisk++;
                }

                totalInterventions += history.length;

                loadedUsers.push({
                    id: `USR-${Math.floor(Math.random() * 9000) + 1000}`,
                    name: username,
                    lastActive: formatTimeAgo(lastActiveStr),
                    lastActiveRaw: lastActiveStr || '',
                    joinedAt: createdAt || '',
                    mood: lastMoodStr,
                    riskLevel: lastRisk,
                    history
                });
            };

            try {
                if (!isNeonEnabled()) {
                    throw new Error('Neon API tidak aktif.');
                }

                const cloudUsers = await listNeonAdminUsers();
                cloudUsers.forEach((user) => {
                    processUserRecord(
                        user.username || `user_${String(user.id || '').slice(0, 6)}`,
                        user.history || [],
                        user.created_at || ''
                    );
                });
                setDataSource('cloud');
            } catch (err) {
                console.error('Cloud fetch error, fallback to localStorage', err);
                setDataSource('local');
                setLoadWarning(
                    `Gagal mengambil data cloud (${err.message || 'Unknown error'}). Dashboard admin menampilkan localStorage browser ini.`
                );

                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('moodify_data_')) {
                        try {
                            const savedData = localStorage.getItem(key);
                            const userData = JSON.parse(savedData);
                            const username = key.replace('moodify_data_', '');

                            processUserRecord(username, userData.history || [], userData.joinedAt || '');
                        } catch (e) {
                            console.error('Error parsing user data:', key, e);
                        }
                    }
                }
            }

            loadedUsers.sort((a, b) => {
                if (!a.lastActiveRaw) return 1;
                if (!b.lastActiveRaw) return -1;
                return new Date(b.lastActiveRaw) - new Date(a.lastActiveRaw);
            });

            const chartDataArray = Object.keys(moodTrends).map(day => ({
                name: day,
                CheckIn: moodTrends[day]
            }));

            setUsers(loadedUsers);
            setGlobalChartData(chartDataArray);
            setStats({
                total: loadedUsers.length,
                checkInsToday: totalCheckInsToday,
                interventions: totalInterventions,
                highRisk: totalHighRisk
            });
            const dayOrder = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
            const heatRows = [];
            dayOrder.forEach((day) => {
                for (let hour = 0; hour < 24; hour += 4) {
                    const hh = String(hour).padStart(2, '0');
                    heatRows.push({
                        slot: `${day} ${hh}:00`,
                        count: dayHourMap[`${day}-${hh}`] || 0
                    });
                }
            });
            setHeatmapData(heatRows);
            setDistributionData(Object.keys(distributionBins).map((bin) => ({ range: bin, total: distributionBins[bin] })));
            setSegmentTrendData(dayOrder.map((day) => segmentSeries[day] || { name: day, New: 0, Returning: 0 }));
            setRiskAlerts(riskAlertRows);

            const now = new Date();
            const retained = { d1: 0, d7: 0, d30: 0 };
            loadedUsers.forEach((user) => {
                if (!user.joinedAt || !user.lastActiveRaw) return;
                const joined = new Date(user.joinedAt);
                const active = new Date(user.lastActiveRaw);
                const diffDays = (active - joined) / (1000 * 60 * 60 * 24);
                if (diffDays >= 1) retained.d1 += 1;
                if (diffDays >= 7) retained.d7 += 1;
                if (diffDays >= 30) retained.d30 += 1;
            });
            const totalUsers = Math.max(1, loadedUsers.length);
            const onboardingDoneCount = loadedUsers.filter((user) => localStorage.getItem(`moodify_onboarding_done_${user.name}`) === 'true').length;
            const activeAfterOnboarding = loadedUsers.filter((user) => localStorage.getItem(`moodify_onboarding_done_${user.name}`) === 'true' && user.history.length > 0).length;
            const checkinCompletion = Math.round((loadedUsers.filter((u) => u.history.length > 0).length / totalUsers) * 100);
            const onboardingToActive = onboardingDoneCount ? Math.round((activeAfterOnboarding / onboardingDoneCount) * 100) : 0;

            setCohortStats({
                d1: Math.round((retained.d1 / totalUsers) * 100),
                d7: Math.round((retained.d7 / totalUsers) * 100),
                d30: Math.round((retained.d30 / totalUsers) * 100),
                checkinCompletion,
                onboardingToActive
            });

            const analyticsQueueRaw = localStorage.getItem('moodify_analytics_queue');
            let analyticsQueue = [];
            try {
                analyticsQueue = analyticsQueueRaw ? JSON.parse(analyticsQueueRaw) : [];
            } catch {
                analyticsQueue = [];
            }
            const funnel = { login: loadedUsers.length, onboarding: 0, checkin: 0, progress: 0 };
            analyticsQueue.forEach((event) => {
                if (event.event_name === 'onboarding_complete') funnel.onboarding += 1;
                if (event.event_name === 'checkin_saved') funnel.checkin += 1;
                if (event.event_name === 'page_view' && event.payload?.path === '/progress') funnel.progress += 1;
                if (event.event_name === 'checkin_saved' && event.payload?.syncedToCloud === false) syncFailures += 1;
            });
            setFunnelStats(funnel);
            setDataQuality({
                missingFieldRate: totalFields ? Number(((missingFields / totalFields) * 100).toFixed(1)) : 0,
                syncFailRate: totalCheckins ? Number(((syncFailures / totalCheckins) * 100).toFixed(1)) : 0,
                avgSyncDelayMins: 0
            });
            setAuditLog(getAdminAuditLog().slice(-10).reverse());
            setIsLoading(false);
        };

        loadUsers();
    }, [refreshTick]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setRefreshTick((prev) => prev + 1);
        }, 15000);

        const onVisible = () => {
            if (document.visibilityState === 'visible') {
                setRefreshTick((prev) => prev + 1);
            }
        };

        document.addEventListener('visibilitychange', onVisible);
        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            if (modalBodyRef.current) {
                modalBodyRef.current.scrollTop = 0;
            }
        }
    }, [isModalOpen]);

    useEffect(() => {
        if (showUserChart && modalBodyRef.current) {
            modalBodyRef.current.scrollTop = 0;
        }
    }, [showUserChart]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, riskFilter]);

    useEffect(() => {
        trackEvent('admin_filter_changed', { search: searchTerm, risk: riskFilter }).catch(() => {});
    }, [searchTerm, riskFilter]);

    useEffect(() => {
        trackEvent('admin_page_changed', { page: currentPage }).catch(() => {});
    }, [currentPage]);

    const exportToCSV = () => {
        if (users.length === 0) return;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        // Header
        csvContent += "ID,Nama,Tanggal Bergabung,Status Mood Terakhir,Tingkat Risiko,Aktivitas Terakhir,Total Check-in\n";
        
        // Rows
        users.forEach(user => {
            const joinDate = formatDate(user.joinedAt);
            const totalSesh = user.history.length;
            const row = `${user.id},${user.name},${joinDate},${user.mood},${user.riskLevel},${user.lastActiveRaw},${totalSesh}`;
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `moodify_admin_report_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        appendAdminAuditLog('export_csv', { rows: users.length, riskFilter, searchTerm });
        setAuditLog(getAdminAuditLog().slice(-10).reverse());
    };

    const openModal = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
        setShowUserChart(false);
    };

    const handleDeleteUser = async (username) => {
        if (window.confirm(`Apakah Anda yakin ingin menghapus data pengguna ${username}? Tindakan ini tidak dapat dibatalkan.`)) {
            try {
                setIsDeleting(true);
                if (dataSource === 'cloud') {
                    await deleteNeonUser(username);
                } else {
                    localStorage.removeItem(`moodify_data_${username}`);
                }
                appendAdminAuditLog('delete_user', { username, dataSource });
                setAuditLog(getAdminAuditLog().slice(-10).reverse());

                // Refresh the page to update all stats and charts accurately
                window.location.reload();
            } catch (error) {
                alert(`Gagal menghapus data pengguna: ${error.message || 'Unknown error'}.`);
                console.error('Delete user error', error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const filteredUsers = users.filter((user) => {
        const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
        const matchesName = !normalizedSearch || user.name.toLowerCase().includes(normalizedSearch);
        const matchesRisk = riskFilter === 'all' || user.riskLevel.toLowerCase() === riskFilter;
        return matchesName && matchesRisk;
    });

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedUsers = filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);

    return (
        <div className="admin-container animate-fade-in">
            <div className="admin-header">
                <div className="admin-logo-area">
                    <div className="admin-logo">
                        <img src={moodifyLogo} alt="SUGARSENSE logo" />
                    </div>
                    <div>
                        <h1>SUGARSENSE Admin Portal</h1>
                        <p>Database & Analytics Dashboard</p>
                    </div>
                </div>
                <div className="admin-user">
                    <div className="admin-avatar">A</div>
                    <span>{dataSource === 'cloud' ? 'Admin SMAN 1 (Cloud)' : 'Admin SMAN 1 (Local)'}</span>
                </div>
            </div>

            {loadWarning && (
                <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '12px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '13px' }}>
                    {loadWarning}
                </div>
            )}

            <div className="admin-stats-overview">
                <div className="admin-stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Total Pengguna Aktif</span>
                        <Users size={18} color="#64748b" />
                    </div>
                    <h2 className="stat-value">{stats.total}</h2>
                    <span className="stat-trend neutral">Data terkini</span>
                </div>

                <div className="admin-stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Check-in Hari Ini</span>
                        <Activity size={18} color="#64748b" />
                    </div>
                    <h2 className="stat-value">{stats.checkInsToday}</h2>
                    <span className="stat-trend positive">Terakumulasi hari ini</span>
                </div>

                <div className="admin-stat-card">
                    <div className="stat-header">
                        <span className="stat-title">Total Sesi Check-in</span>
                        <MessageCircle size={18} color="#64748b" />
                    </div>
                    <h2 className="stat-value">{stats.interventions}</h2>
                    <span className="stat-trend neutral">Keseluruhan sesi berjalan</span>
                </div>

                <div className="admin-stat-card alert-card">
                    <div className="stat-header">
                        <span className="stat-title">Peringatan Risiko (Tinggi)</span>
                        <AlertCircle size={18} color="#ef4444" />
                    </div>
                    <h2 className="stat-value text-danger">{stats.highRisk}</h2>
                    <span className="stat-trend negative">Siswa dengan rata-rata slider {'>='} 7</span>
                </div>
            </div>

            <div className="admin-data-section glass-card" style={{ marginBottom: '24px' }}>
                <div className="data-section-header">
                    <h3>Risk Alert Otomatis</h3>
                </div>
                {riskAlerts.length > 0 ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {riskAlerts.map((alert, idx) => (
                            <div key={`${alert.username}-${idx}`} style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: '12px', padding: '12px' }}>
                                <strong style={{ color: '#991b1b', fontSize: '14px' }}>{alert.username}</strong>
                                <p style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '4px' }}>{alert.reason} • {alert.lastActive}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted">Belum ada alert risiko tinggi beruntun.</p>
                )}
            </div>

            <div className="admin-stats-overview" style={{ marginBottom: '24px' }}>
                <div className="admin-stat-card">
                    <div className="stat-header"><span className="stat-title">Retention D1</span></div>
                    <h2 className="stat-value">{cohortStats.d1}%</h2>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-header"><span className="stat-title">Retention D7</span></div>
                    <h2 className="stat-value">{cohortStats.d7}%</h2>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-header"><span className="stat-title">Retention D30</span></div>
                    <h2 className="stat-value">{cohortStats.d30}%</h2>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-header"><span className="stat-title">Onboarding → Active</span></div>
                    <h2 className="stat-value">{cohortStats.onboardingToActive}%</h2>
                </div>
            </div>

            <div className="admin-data-section glass-card" style={{ marginBottom: '24px' }}>
                <div className="data-section-header">
                    <h3>Funnel Aktivasi</h3>
                </div>
                <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { step: 'Login', total: funnelStats.login },
                            { step: 'Onboarding', total: funnelStats.onboarding },
                            { step: 'Check-in', total: funnelStats.checkin },
                            { step: 'Progress', total: funnelStats.progress }
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="step" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="total" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Global Chart Section */}
            <div className="admin-data-section glass-card" style={{ marginBottom: '24px' }}>
                <div className="data-section-header">
                    <h3>Tren Check-in Keseluruhan (Mingguan)</h3>
                </div>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={globalChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="CheckIn" fill="#2a9d8f" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="admin-stats-overview" style={{ marginBottom: '24px' }}>
                <div className="admin-data-section glass-card" style={{ minHeight: '320px' }}>
                    <div className="data-section-header">
                        <h3>Heatmap Jam/Hari Check-in</h3>
                    </div>
                    <div style={{ width: '100%', height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={heatmapData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="slot" axisLine={false} tickLine={false} interval={5} tick={{ fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#14b8a6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="admin-data-section glass-card" style={{ minHeight: '320px' }}>
                    <div className="data-section-header">
                        <h3>Distribusi Skor Emosi</h3>
                    </div>
                    <div style={{ width: '100%', height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distributionData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="range" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="total" fill="#f97316" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="admin-data-section glass-card" style={{ marginBottom: '24px' }}>
                <div className="data-section-header">
                    <h3>Trend Segmen User (Baru vs Lama)</h3>
                </div>
                <div style={{ width: '100%', height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={segmentTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="New" stroke="#3b82f6" strokeWidth={2} />
                            <Line type="monotone" dataKey="Returning" stroke="#22c55e" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="admin-stats-overview" style={{ marginBottom: '24px' }}>
                <div className="admin-stat-card">
                    <div className="stat-header"><span className="stat-title">Missing Field Rate</span></div>
                    <h2 className="stat-value">{dataQuality.missingFieldRate}%</h2>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-header"><span className="stat-title">Sync Failure Rate</span></div>
                    <h2 className="stat-value">{dataQuality.syncFailRate}%</h2>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-header"><span className="stat-title">Avg Sync Delay</span></div>
                    <h2 className="stat-value">{dataQuality.avgSyncDelayMins}m</h2>
                </div>
                <div className="admin-stat-card">
                    <div className="stat-header"><span className="stat-title">Check-in Completion</span></div>
                    <h2 className="stat-value">{cohortStats.checkinCompletion}%</h2>
                </div>
            </div>

            <div className="admin-data-section glass-card" style={{ marginBottom: '24px' }}>
                <div className="data-section-header">
                    <h3>Audit Log Admin</h3>
                </div>
                {auditLog.length ? (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {auditLog.map((item, idx) => (
                            <div key={`${item.at}-${idx}`} style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.action}</strong>
                                <p style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>{formatDate(item.at)} • {JSON.stringify(item.detail)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted">Belum ada aktivitas admin yang tercatat.</p>
                )}
            </div>

            <div className="admin-data-section glass-card">
                <div className="data-section-header">
                    <h3>Log Interaksi Pengguna Terkini</h3>
                    <div className="data-actions">
                        <input
                            type="text"
                            placeholder="Cari nama pengguna..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', minWidth: '220px' }}
                        />
                        <select
                            value={riskFilter}
                            onChange={(e) => setRiskFilter(e.target.value)}
                            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="all">Semua Risiko</option>
                            <option value="rendah">Rendah</option>
                            <option value="sedang">Sedang</option>
                            <option value="tinggi">Tinggi</option>
                        </select>
                        <button className="btn-secondary" onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Download size={16} /> Export CSV
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Nama (Anonim)</th>
                                <th>Bergabung Sejak</th>
                                <th>Status Mood Terakhir</th>
                                <th>Tingkat Risiko</th>
                                <th>Aktivitas Terakhir</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                        Memuat data pengguna...
                                    </td>
                                </tr>
                            ) : paginatedUsers.length > 0 ? (
                                paginatedUsers.map((user, idx) => (
                                    <tr key={idx}>
                                        <td className="font-medium">{user.name}</td>
                                        <td className="text-muted">{formatDate(user.joinedAt)}</td>
                                        <td>
                                            <span className={`mood-badge mood-${user.mood.toLowerCase().replace(/ /g, '-')}`}>
                                                {user.mood}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`risk-badge risk-${user.riskLevel.toLowerCase()}`}>
                                                {user.riskLevel}
                                            </span>
                                        </td>
                                        <td className="text-muted">{user.lastActive}</td>
                                        <td>
                                            <button className="btn-link" onClick={() => openModal(user)}>Lihat Detail</button>
                                            <button className="btn-link" onClick={() => handleDeleteUser(user.name)} style={{ marginLeft: '12px', color: '#ef4444' }} disabled={isDeleting}>
                                                {isDeleting ? 'Menghapus...' : 'Hapus'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                        Tidak ada data yang cocok dengan filter saat ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {!isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                            Menampilkan {paginatedUsers.length} dari {filteredUsers.length} pengguna
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={safePage <= 1}
                            >
                                Sebelumnya
                            </button>
                            <span style={{ padding: '10px 12px', fontSize: '13px', color: '#475569' }}>
                                Halaman {safePage} / {totalPages}
                            </span>
                            <button
                                className="btn-secondary"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage >= totalPages}
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal for User Detail */}
            {isModalOpen && selectedUser && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detail Pengguna: {selectedUser.name}</h2>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body" ref={modalBodyRef}>
                            <div className="modal-stats-row">
                                <div className="modal-stat">
                                    <span>Total Sesi</span>
                                    <strong>{selectedUser.history.length}</strong>
                                </div>
                                <div className="modal-stat">
                                    <span>Bergabung</span>
                                    <strong>{formatDate(selectedUser.joinedAt)}</strong>
                                </div>
                                <div className="modal-stat">
                                    <span>Status Risiko Terkini</span>
                                    <strong className={`text-${selectedUser.riskLevel === 'Tinggi' ? 'danger' : 'main'}`}>
                                        {selectedUser.riskLevel}
                                    </strong>
                                </div>
                            </div>
                            
                            <button 
                                className="btn-primary" 
                                style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', width: '100%', justifyContent: 'center' }}
                                onClick={() => setShowUserChart(!showUserChart)}
                            >
                                <BarChart2 size={16} /> {showUserChart ? "Sembunyikan Grafik" : "Lihat Grafik & Data Status Mood"}
                            </button>

                            {showUserChart && selectedUser.history && selectedUser.history.length > 0 && (
                                <div className="user-chart-section" style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px' }}>
                                    <h3 style={{ marginBottom: '16px', fontSize: '14px' }}>Tren Mood dan Risiko (Seluruh Histori Check-in)</h3>
                                    <div style={{ width: '100%', height: 250 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={selectedUser.history.map(h => ({
                                                name: formatDate(h.date).substring(0, 6),
                                                Depresi: h.sliders?.sadness || 0,
                                                Cemas: h.sliders?.anxiety || 0,
                                                Stres: h.sliders?.stress || 0,
                                                Mood: h.mood || 0
                                            }))}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                                <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                                                <Tooltip formatter={(value) => [Math.round(value), undefined]} />
                                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                                <Line type="monotone" dataKey="Depresi" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                <Line type="monotone" dataKey="Cemas" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                <Line type="monotone" dataKey="Stres" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                <Line type="monotone" dataKey="Mood" stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 4 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', marginTop: '8px' }}>
                                        Skala 0-10. Garis putus-putus hijau menunjukkan rating Mood keseluruhan (1-5).
                                    </p>
                                </div>
                            )}

                            <h3 style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px' }}>Riwayat Check-in</h3>
                            {selectedUser.history && selectedUser.history.length > 0 ? (
                                <div className="history-list">
                                    {[...selectedUser.history].reverse().map((entry, idx) => (
                                        <div key={idx} className="history-card">
                                            <div className="history-date">{formatDate(entry.date)}</div>
                                            <div className="history-mood">Mood: <strong>{getMoodText(entry.mood)}</strong></div>
                                            <div className="history-sliders">
                                                <span>Depresi: {entry.sliders?.sadness || 0}/10 | </span>
                                                <span>Cemas: {entry.sliders?.anxiety || 0}/10 | </span>
                                                <span>Stres: {entry.sliders?.stress || 0}/10</span>
                                            </div>
                                            {entry.journalText && (
                                                <div className="history-journal">"{entry.journalText}"</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted">Belum ada riwayat check-in tersimpan.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDatabase;
