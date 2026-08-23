import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Sparkles, AlertTriangle, RotateCcw, Upload, Info, SwitchCamera, ScanLine, Lightbulb, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { analyzeDrinkImage } from '../lib/nutriApi';
import { enqueueSheetsBackup } from '../lib/sheetsBackup';
import { VERIFIED_DRINKS } from '../data/verifiedDrinks';
import './Scan.css';

const Scan = () => {
  const videoRef = useRef(null), canvasRef = useRef(null), inputRef = useRef(null), streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [cameraState, setCameraState] = useState('loading');
  const [cameraError, setCameraError] = useState('');
  const [hasFlash, setHasFlash] = useState(false);
  const [photo, setPhoto] = useState(''), [selectedDrinkId, setSelectedDrinkId] = useState('');
  const [showAllDrinks, setShowAllDrinks] = useState(false);
  const [scanSteps, setScanSteps] = useState(''), [progress, setProgress] = useState(0), [scannedDrink, setScannedDrink] = useState(null);

  const stopCamera = useCallback(() => { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; }, []);
  const startCamera = useCallback(async () => {
    stopCamera(); setCameraError(''); setCameraState('loading');
    try {
      if (!window.isSecureContext) throw new Error('Kamera membutuhkan koneksi HTTPS. Buka alamat https:// dari server jaringan, lalu izinkan sertifikat dan akses kamera.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser ini tidak mendukung akses kamera.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraState('ready');
    } catch (error) {
      setCameraError(error.name === 'NotAllowedError' ? 'Izin kamera ditolak. Aktifkan izin kamera pada browser, lalu coba lagi.' : error.message || 'Kamera tidak dapat dibuka.');
      setCameraState('error');
    }
  }, [facingMode, stopCamera]);
  useEffect(() => { startCamera(); return stopCamera; }, [startCamera, stopCamera]);

  const capturePhoto = () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video?.videoWidth || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    setPhoto(canvas.toDataURL('image/jpeg', 0.88)); stopCamera(); setCameraState('preview');
  };
  const handleUpload = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    event.target.value = '';
    if (!file.type.startsWith('image/')) {
      setCameraError('File yang dipilih harus berupa foto atau gambar.');
      setCameraState('error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setCameraError(''); setPhoto(String(reader.result)); stopCamera(); setCameraState('preview'); };
    reader.onerror = () => { setCameraError('Foto tidak dapat dibaca. Silakan pilih file gambar lain.'); setCameraState('error'); };
    reader.readAsDataURL(file);
  };
  const toggleFlash = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0]; if (!track?.applyConstraints) return;
    try { const next = !hasFlash; await track.applyConstraints({ advanced: [{ torch: next }] }); setHasFlash(next); } catch { setCameraError('Lampu flash tidak tersedia pada kamera ini.'); }
  };
  const saveScanToHistory = (drink) => {
    const username = localStorage.getItem('moodify_currentUser'); if (!username || !drink) return;
    try { const key = `moodify_data_${username}`, data = JSON.parse(localStorage.getItem(key) || '{}'); const scan = { date: new Date().toISOString(), drinkId: drink.id, name: drink.name, grade: drink.grade, calories: drink.calories, sugar: drink.sugar, source: drink.source }; data.scanHistory = data.scanHistory || []; data.scanHistory.push(scan); data.gamification = data.gamification || { xp: 0, level: 1, badges: [] }; data.gamification.xp += 15; data.gamification.level = Math.max(1, Math.floor(data.gamification.xp / 60) + 1); localStorage.setItem(key, JSON.stringify(data)); enqueueSheetsBackup({ eventType: 'drink_scan', username, payload: scan }); } catch (error) { console.warn('Tidak dapat menyimpan riwayat scan', error); }
  };
  const startAnalysis = async () => {
    if (!photo) return;
    setCameraState('scanning'); setProgress(8); const steps = ['Mengirim foto dengan aman...', 'Mengenali minuman dan label...', 'Mencari data gizi FatSecret...', 'Menghitung ringkasan nutrisi...']; let index = 0; setScanSteps(steps[index]);
    const timer = window.setInterval(() => { index = Math.min(index + 1, steps.length - 1); setScanSteps(steps[index]); setProgress((value) => Math.min(value + 16, 88)); }, 900);
    try { const selectedDrink = VERIFIED_DRINKS.find((item) => item.id === selectedDrinkId); const response = await analyzeDrinkImage({ imageB64: photo, drinkKey: selectedDrinkId || undefined, searchHint: selectedDrink?.name }); const drink = response.result; setScannedDrink({ ...drink, source: response.source || drink.source }); setProgress(100); saveScanToHistory(drink); setCameraState('result'); } catch (error) { setCameraError(error.message || 'Label belum terbaca. Pilih jenis minuman yang paling sesuai, lalu coba lagi.'); setCameraState('preview'); } finally { window.clearInterval(timer); }
  };
  const resetScanner = () => { setPhoto(''); setProgress(0); setScannedDrink(null); startCamera(); };
  const drink = scannedDrink;
  const sugarInterpretation = drink?.sugar >= 25
    ? 'Kandungan gula cukup tinggi. Jadikan hasil ini sebagai pertimbangan untuk memilih porsi lebih kecil atau alternatif tanpa gula tambahan.'
    : drink?.sugar > 5
      ? 'Kandungan gula masih perlu diperhitungkan dalam total asupan harian, terutama jika kamu mengonsumsi lebih dari satu minuman manis.'
      : 'Kandungan gula relatif rendah. Tetap periksa apakah ada pemanis tambahan dan prioritaskan air putih untuk hidrasi rutin.';

  return <div className="scan-container">
    <header className="scan-header"><div className="feature-heading"><ScanLine className="feature-heading-icon" /><h2 className="title">SugarScan</h2></div><p className="subtitle">Pindai kemasan atau label minuman untuk melihat kandungan gulanya.</p></header>
    <div className="drink-selector-wrapper"><label>Bantuan identifikasi (opsional bila foto kurang jelas)</label><div className="selector-grid">{(showAllDrinks ? VERIFIED_DRINKS : VERIFIED_DRINKS.slice(0, 5)).map((item) => <button key={item.id} className={`select-chip ${selectedDrinkId === item.id ? 'active' : ''}`} onClick={() => setSelectedDrinkId(selectedDrinkId === item.id ? '' : item.id)}><span>{item.emoji}</span> {item.name.split(' ').slice(0, 2).join(' ')}</button>)}</div><button type="button" className="toggle-drinks-btn" onClick={() => setShowAllDrinks((value) => !value)}>{showAllDrinks ? 'Tampilkan lebih sedikit' : `Tampilkan selengkapnya (${VERIFIED_DRINKS.length - 5} lainnya)`}</button></div>
    <button type="button" className="upload-file-btn" onClick={() => inputRef.current?.click()}><Upload size={18} /> Upload foto dari galeri / file</button>
    <div className="camera-viewport-card">
      {(cameraState === 'loading' || cameraState === 'ready') && <div className="camera-live"><video ref={videoRef} className="camera-video" playsInline muted /><div className="scan-guide-box guide-green"><span className="guide-label">ARAHKAN KE LABEL / MINUMAN</span></div><div className="camera-bar-top"><button onClick={toggleFlash} className={`icon-btn ${hasFlash ? 'text-amber' : ''}`} title="Flash">⚡</button><span className="cam-status">KAMERA AKTIF</span><button className="icon-btn" onClick={() => setFacingMode((mode) => mode === 'environment' ? 'user' : 'environment')} title="Ganti kamera"><SwitchCamera size={18} /></button></div><div className="camera-bar-bottom"><button className="camera-action" onClick={() => inputRef.current?.click()} title="Pilih foto"><Upload size={22} /></button><button className="shutter-btn" disabled={cameraState === 'loading'} onClick={capturePhoto} title="Ambil foto"><div className="inner-shutter" /></button><span className="camera-action"><Camera size={22} /></span></div></div>}
      {cameraState === 'error' && <div className="camera-preview camera-error"><AlertTriangle size={44} /><h3>Kamera belum tersedia</h3><p>{cameraError}</p><button className="btn-primary" onClick={startCamera}><Camera size={16} /> Coba buka kamera</button><button className="btn-secondary" onClick={() => inputRef.current?.click()}><Upload size={16} /> Pilih foto</button></div>}
      {cameraState === 'preview' && <div className="camera-preview"><h3 className="preview-heading">Hasil Tangkapan</h3><img className="captured-image-box captured-photo" src={photo} alt="Foto minuman untuk dianalisis" /><p className="analysis-error">{cameraError}</p><div className="action-buttons"><button className="btn-secondary" onClick={resetScanner}><RotateCcw size={16} /> Foto Ulang</button><button className="btn-primary" onClick={startAnalysis}><Sparkles size={16} /> Analisis Gizi</button></div></div>}
      {cameraState === 'scanning' && <div className="camera-scanning"><div className="radar-circle"><div className="scan-line" /><Camera size={56} /></div><h3 className="scanning-title">Menganalisis Gizi</h3><p className="scanning-step">{scanSteps}</p><div className="progress-bar-container"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><span className="progress-percentage">{progress}%</span></div>}
      {cameraState === 'result' && drink && <div className="scan-result-card animate-fade-in"><div className="result-header"><span className="result-emoji">{drink.emoji || '🥤'}</span><div><h3 className="drink-title">{drink.name}</h3><span className="drink-cat">{drink.category} · {drink.servingDescription || '1 porsi'}</span></div></div><div className="scan-insight-grid"><div className="scan-insight-item"><Lightbulb size={19} /><div><strong>Mengapa dipindai?</strong><p>Gula sering tersembunyi dalam ukuran sajian, sirup, krimer, atau topping. SugarScan membantu membuatnya mudah dibandingkan sebelum diminum.</p></div></div><div className="scan-insight-item"><BookOpenCheck size={19} /><div><strong>Cara membaca hasil</strong><p>Grade menunjukkan ringkasan, sedangkan rasio menunjukkan kontribusi gula minuman ini terhadap acuan maksimal 50 gram per hari.</p></div></div></div><div className="grade-badge-row"><div className="nutriscore-badge" style={{ backgroundColor: drink.gradeColor }}><span className="score-lbl">Nutri-Score</span><span className="score-val">{drink.grade}</span></div><div className="health-status-msg"><span className="status-title">Status Asupan</span><span className="status-desc" style={{ color: drink.gradeColor }}>{drink.status}</span></div></div><div className="nutrition-slider-section"><div className="slider-header"><span>Rasio Batas Gula Harian</span><strong>{drink.sugar}g / 50g ({drink.sugarPercent}%)</strong></div><div className="slider-bar-bg"><div className="slider-bar-fill" style={{ width: `${Math.min(100, drink.sugarPercent)}%`, backgroundColor: drink.gradeColor }} /></div><p className="slider-footnote">*Acuan batas gula Kemenkes RI: maksimal 50 gram per hari.</p></div><div className="nutrition-details-table">{drink.nutritionList.map((item, index) => <div key={index} className="details-row"><span className="lbl">{item.label}</span><div className="val-group"><span className="val">{item.value}</span><span className="desc">{item.desc}</span></div></div>)}</div><div className="interpretation-card"><div className="interpretation-header"><ShieldCheck size={17} /><span>Interpretasi SugarSense</span></div><p>{sugarInterpretation}</p></div><div className="tips-advice-card"><div className="tips-header"><Info size={16} color="#0284c7" /><span>Langkah Sehat Berikutnya</span></div><p>{drink.tips}</p><small>Sumber data: {drink.source || 'FatSecret'} · Nilai dapat berbeda menurut merek dan ukuran sajian.</small></div><button className="btn-primary reset-scan-btn" onClick={resetScanner}><RotateCcw size={16} /> Pindai Minuman Lain</button></div>}
    </div><canvas ref={canvasRef} className="hidden-canvas" /><input ref={inputRef} className="hidden-file-input" type="file" accept="image/*,.heic,.heif" onChange={handleUpload} />
  </div>;
};
export default Scan;
