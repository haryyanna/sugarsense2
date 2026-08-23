import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Settings, Award, CalendarDays, Clock, Bell, Moon, Palette, UserRound } from 'lucide-react';
import { trackEvent } from '../lib/analytics';
import { configureDailyReminder, requestNotificationPermission, stopDailyReminder } from '../lib/reminder';
import './Profile.css';

const THEMES = [
    { id: 'default', name: 'Mint', color: '#2a9d8f' },
    { id: 'ocean', name: 'Ocean', color: '#0284c7' },
    { id: 'sunset', name: 'Sunset', color: '#f97316' },
    { id: 'lavender', name: 'Lavender', color: '#8b5cf6' }
];

const AVATARS = ['🍎', '🍊', '🥑', '🥥', '🍓', '🍋', '🍉', '🥤'];

const Profile = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [userData, setUserData] = useState(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const [settings, setSettings] = useState({
        notifications: true,
        darkMode: false,
        reminderAt: '08:00'
    });
    
    const [activeTheme, setActiveTheme] = useState('default');
    const [activeAvatar, setActiveAvatar] = useState('🍎');

    useEffect(() => {
        const storedUser = localStorage.getItem('moodify_currentUser');
        if (!storedUser) {
            navigate('/home');
            return;
        }

        setUsername(storedUser);
        const userKey = `moodify_data_${storedUser}`;
        const savedData = localStorage.getItem(userKey);
        
        if (savedData) {
            const parsed = JSON.parse(savedData);
            setUserData(parsed);
            if (parsed.theme) setActiveTheme(parsed.theme);
            if (parsed.avatar) setActiveAvatar(parsed.avatar);
            setSettings(prev => ({
                ...prev,
                darkMode: Boolean(parsed.darkMode),
                notifications: parsed.notificationsEnabled !== false,
                reminderAt: parsed.reminderAt || '08:00'
            }));
            document.documentElement.setAttribute('data-color-mode', parsed.darkMode ? 'dark' : 'light');
        }
    }, [navigate]);

    useEffect(() => {
        if (showLogoutConfirm) {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        }
    }, [showLogoutConfirm]);

    const savePreferences = (themeStr, avatarStr, darkModeVal = settings.darkMode, notificationsVal = settings.notifications, reminderAtVal = settings.reminderAt) => {
        if (!username) return;
        const userKey = `moodify_data_${username}`;
        const savedData = localStorage.getItem(userKey);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            parsed.theme = themeStr;
            parsed.avatar = avatarStr;
            parsed.darkMode = darkModeVal;
            parsed.notificationsEnabled = notificationsVal;
            parsed.reminderAt = reminderAtVal;
            localStorage.setItem(userKey, JSON.stringify(parsed));
        }
        
        document.documentElement.setAttribute('data-theme', themeStr);
        document.documentElement.setAttribute('data-color-mode', darkModeVal ? 'dark' : 'light');
    };

    const handleThemeChange = (themeId) => {
        setActiveTheme(themeId);
        savePreferences(themeId, activeAvatar);
        trackEvent('theme_changed', { theme: themeId }).catch(() => {});
    };

    const handleAvatarChange = (avatar) => {
        setActiveAvatar(avatar);
        savePreferences(activeTheme, avatar);
    };

    const handleDarkModeToggle = () => {
        const nextDarkMode = !settings.darkMode;
        setSettings(prev => ({ ...prev, darkMode: nextDarkMode }));
        savePreferences(activeTheme, activeAvatar, nextDarkMode, settings.notifications, settings.reminderAt);
        trackEvent('dark_mode_toggled', { enabled: nextDarkMode }).catch(() => {});
    };

    const handleLogout = async () => {
        localStorage.removeItem('moodify_currentUser');
        trackEvent('logout', { username }).catch(() => {});
        navigate('/home');
    };

    const toggleNotification = async () => {
        const nextEnabled = !settings.notifications;
        setSettings(prev => ({ ...prev, notifications: nextEnabled }));
        savePreferences(activeTheme, activeAvatar, settings.darkMode, nextEnabled, settings.reminderAt);
        if (nextEnabled) {
            await requestNotificationPermission().catch(() => {});
            await configureDailyReminder().catch(() => {});
        } else {
            stopDailyReminder();
        }
        trackEvent('notification_toggle', { enabled: nextEnabled }).catch(() => {});
    };

    const handleReminderTimeChange = async (value) => {
        setSettings(prev => ({ ...prev, reminderAt: value }));
        savePreferences(activeTheme, activeAvatar, settings.darkMode, settings.notifications, value);
        if (settings.notifications) {
            await configureDailyReminder().catch(() => {});
        }
        trackEvent('reminder_time_changed', { value }).catch(() => {});
    };

    if (!userData) return null;

    const joinedDate = new Date(userData.joinedAt || Date.now());
    const daysJoined = Math.max(1, Math.ceil((new Date() - joinedDate) / (1000 * 60 * 60 * 24)));

    return (
        <div className="profile-container animate-fade-in">
            {/* Header */}
            <header className="profile-header">
                <button className="icon-btn-rounded" onClick={() => navigate('/home')}>
                    <ArrowLeft size={20} />
                </button>
                <div className="feature-heading"><UserRound className="feature-heading-icon" /><h2>Profil & Pengaturan</h2></div>
                <div style={{ width: 40 }} />
            </header>

            <main className="profile-content">
                {/* User Info Card */}
                <div className="glass-card user-info-card" style={{ flexDirection: 'column', textAlign: 'center' }}>
                    <div className="avatar-lg bg-blue-soft" style={{ fontSize: '40px' }}>
                        {activeAvatar}
                    </div>
                    <div className="user-details">
                        <h3 className="profile-name">{username}</h3>
                        <p className="profile-joined">Bergabung sejak {joinedDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-green-soft">
                            <CalendarDays size={20} className="icon-green" />
                        </div>
                        <div className="stat-value">{daysJoined} Hari</div>
                        <div className="stat-label">Bersama SUGARSENSE</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-orange-soft">
                            <Award size={20} className="icon-orange" />
                        </div>
                        <div className="stat-value">{userData.streak || 0} Hari</div>
                        <div className="stat-label">Streak Laporan</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon-wrapper bg-blue-soft">
                            <Clock size={20} className="icon-blue" />
                        </div>
                        <div className="stat-value">{userData.scanHistory?.length || 0}</div>
                        <div className="stat-label">Minuman Di-scan</div>
                    </div>
                </div>

                {/* Settings Section */}
                <div className="settings-section">
                    <h3 className="section-title">
                        <Award size={18} />
                        Pencapaian Gizi
                    </h3>
                    <div className="glass-card settings-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '16px', textAlign: 'center' }}>
                            <div style={{ opacity: userData.history?.length > 0 ? 1 : 0.4, filter: userData.history?.length > 0 ? 'none' : 'grayscale(100%)' }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌱</div>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-main)' }}>Langkah Sehat</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Absen pertama</div>
                            </div>
                            
                            <div style={{ opacity: userData.streak >= 3 ? 1 : 0.4, filter: userData.streak >= 3 ? 'none' : 'grayscale(100%)' }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔥</div>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-main)' }}>SipConsistent</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>3 hari streak</div>
                            </div>

                            <div style={{ opacity: userData.chatHistory?.length > 1 ? 1 : 0.4, filter: userData.chatHistory?.length > 1 ? 'none' : 'grayscale(100%)' }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>💬</div>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-main)' }}>NutriBuddy</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Tanya SUGARSENSE AI</div>
                            </div>

                            <div style={{ opacity: daysJoined >= 7 ? 1 : 0.4, filter: daysJoined >= 7 ? 'none' : 'grayscale(100%)' }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👑</div>
                                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-main)' }}>NutriLover</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>7 hari bersama</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-section">
                    <h3 className="section-title">
                        <Palette size={18} />
                        Personalisasi
                    </h3>
                    
                    <div className="glass-card settings-card" style={{ padding: '20px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-main)' }}>Pilih Tema Warna</h4>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                {THEMES.map(theme => (
                                    <button 
                                        key={theme.id}
                                        onClick={() => handleThemeChange(theme.id)}
                                        style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            backgroundColor: theme.color,
                                            border: activeTheme === theme.id ? '3px solid var(--text-main)' : '2px solid transparent',
                                            cursor: 'pointer', transition: 'all 0.2s',
                                            boxShadow: activeTheme === theme.id ? '0 0 0 2px white inset' : 'none'
                                        }}
                                        title={theme.name}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="setting-divider" style={{ margin: '0 0 20px 0' }}></div>

                        <div>
                            <h4 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--text-main)' }}>Pilih Avatar Buah/Minuman</h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {AVATARS.map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleAvatarChange(emoji)}
                                        style={{
                                            width: '44px', height: '44px', borderRadius: '12px',
                                            fontSize: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                            backgroundColor: activeAvatar === emoji ? 'var(--primary-surface)' : 'rgba(148, 163, 184, 0.2)',
                                            border: activeAvatar === emoji ? '2px solid var(--primary)' : '2px solid transparent',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-section">
                    <h3 className="section-title">
                        <Settings size={18} />
                        Pengaturan Aplikasi
                    </h3>
                    
                    <div className="glass-card settings-card">
                        <div className="setting-item">
                            <div className="setting-info">
                                <div className="setting-icon bg-blue-soft"><Bell size={18} className="icon-blue"/></div>
                                <div>
                                    <h4>Notifikasi Pengingat Minum</h4>
                                    <p>Ingatkan saya untuk rutin minum air mineral</p>
                                </div>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={settings.notifications} onChange={toggleNotification} />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <div className="setting-divider"></div>
                        <div className="setting-item">
                            <div className="setting-info">
                                <div className="setting-icon bg-blue-soft"><Clock size={18} className="icon-blue"/></div>
                                <div>
                                    <h4>Jam Pengingat Harian</h4>
                                    <p>Atur jam notifikasi pengingat harian</p>
                                </div>
                            </div>
                            <input
                                type="time"
                                value={settings.reminderAt}
                                onChange={(e) => handleReminderTimeChange(e.target.value)}
                                style={{ padding: '8px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'var(--white)', color: 'var(--text-main)' }}
                                disabled={!settings.notifications}
                            />
                        </div>
                        
                        <div className="setting-divider"></div>

                        <div className="setting-item">
                            <div className="setting-info">
                                <div className="setting-icon bg-purple-soft"><Moon size={18} className="icon-purple"/></div>
                                <div>
                                    <h4>Dark Mode</h4>
                                    <p>Ubah tampilan menjadi mode gelap</p>
                                </div>
                            </div>
                            <label className="toggle-switch">
                                <input type="checkbox" checked={settings.darkMode} onChange={handleDarkModeToggle} />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button 
                    className="btn-logout hover-lift" 
                    onClick={() => setShowLogoutConfirm(true)}
                >
                    <LogOut size={18} />
                    Keluar Akun
                </button>

                {/* Overlay Detail Modal for Logout Confirm */}
                {showLogoutConfirm && (
                    <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
                        <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                            <h3 style={{ marginBottom: '16px', color: 'var(--text-main)' }}>Keluar Akun?</h3>
                            <p style={{ marginBottom: '24px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.5' }}>
                                Apakah kamu yakin ingin keluar dari {username}? Data laporan gizi harianmu tetap tersimpan di perangkat ini.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowLogoutConfirm(false)}>Batal</button>
                                <button className="btn-danger" style={{ flex: 1 }} onClick={handleLogout}>Ya, Keluar</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Profile;
