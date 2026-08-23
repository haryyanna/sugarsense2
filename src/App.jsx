import { lazy, Suspense, useEffect, useLayoutEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import { flushAnalyticsQueue, trackEvent } from './lib/analytics';
import { configureDailyReminder } from './lib/reminder';
import { flushSheetsBackupQueue } from './lib/sheetsBackup';
import './index.css';

const Chat = lazy(() => import('./pages/Chat'));
const CheckIn = lazy(() => import('./pages/CheckIn'));
const Progress = lazy(() => import('./pages/Progress'));
const Profile = lazy(() => import('./pages/Profile'));
const Scan = lazy(() => import('./pages/Scan'));
const NutriGame = lazy(() => import('./pages/NutriGame'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Education = lazy(() => import('./pages/Education'));

function RouteScrollReset() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    const scrollers = document.querySelectorAll('.content-area, .chat-messages, .modal-body');
    scrollers.forEach((node) => {
      if (node && 'scrollTop' in node) {
        node.scrollTop = 0;
      }
    });
    trackEvent('page_view', { path: pathname });
  }, [pathname]);

  return null;
}

function App() {
  const playClickSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('moodify_currentUser');
    if (storedUser) {
      const userKey = `moodify_data_${storedUser}`;
      const savedData = localStorage.getItem(userKey);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.theme) {
          document.documentElement.setAttribute('data-theme', parsed.theme);
        }
        document.documentElement.setAttribute('data-color-mode', parsed.darkMode ? 'dark' : 'light');
      }
    } else {
      document.documentElement.setAttribute('data-color-mode', 'light');
    }
    flushAnalyticsQueue().catch(() => {});
    flushSheetsBackupQueue().catch(() => {});
    configureDailyReminder().catch(() => {});

    const handleOnline = () => {
      flushSheetsBackupQueue().catch(() => {});
    };
    window.addEventListener('online', handleOnline);
    const intervalId = setInterval(() => {
      flushSheetsBackupQueue().catch(() => {});
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(intervalId);
    };
  }, []);

  const handleGlobalClick = (e) => {
    const isInteractive = e.target.closest('button, a, input[type="range"], .select-chip, .tab-btn, .program-checkbox-container');
    if (isInteractive) {
      playClickSound();
    }
  };

  return (
    <Router>
      <RouteScrollReset />
      <div className="app-container" onClick={handleGlobalClick}>
        
        {/* Main Content Area */}
        <div className="content-area" style={{ paddingBottom: '80px' }}>
          <Suspense fallback={<div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat halaman...</div>}>
            <Routes>
              <Route path="/home" element={<Home />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/checkin" element={<CheckIn />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/scan" element={<Scan />} />
              <Route path="/game" element={<NutriGame />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
                            <Route path="/education" element={<Education />} />
              <Route path="/" element={<Navigate to="/home" replace />} />
            </Routes>
          </Suspense>
        </div>

        {/* Fixed Bottom Navigation */}
        <Routes>
          <Route path="/profile" element={null} />
          <Route path="/game" element={null} />
          <Route path="/privacy" element={null} />
          <Route path="*" element={<BottomNav />} />
        </Routes>
        
        {/* Desktop Footer (Hidden on mobile via CSS) */}
        <Routes>
          <Route path="/chat" element={null} />
          <Route path="/profile" element={null} />
          <Route path="/game" element={null} />
          <Route path="/privacy" element={null} />
          <Route path="*" element={<Footer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
