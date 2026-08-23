import { ArrowLeft, BookOpen, CheckCircle2, Droplets, ShieldAlert, Trophy, GraduationCap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Education.css';

const Education = () => {
    const navigate = useNavigate();

    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const articles = [
        {
            icon: <ShieldAlert size={28} className="icon-red" />,
            title: "Kenali batas gula",
            desc: "Kemenkes menganjurkan batas gula maksimal 50 gram per hari.",
            color: "red-card",
            content: "Batas ini mencakup gula dari minuman, makanan, saus, dan pemanis tambahan. Satu minuman manis dapat mengambil sebagian besar batas harianmu, jadi cek label sebelum membeli."
        },
        {
            icon: <Droplets size={28} className="icon-orange" />,
            title: "Hidrasi yang cerdas",
            desc: "Air putih adalah pilihan utama untuk memenuhi kebutuhan cairan.",
            color: "orange-card",
            content: "Bawa botol isi ulang dan minum berkala. Lemon water tanpa gula boleh dipakai sebagai alternatif segar, tetapi hindari mengubahnya menjadi minuman tinggi gula dengan sirup."
        },
        {
            icon: <BookOpen size={28} className="icon-blue" />,
            title: "Baca label minuman",
            desc: "Perhatikan takaran saji dan jumlah gula per kemasan.",
            color: "blue-card",
            content: "Bandingkan minuman berdasarkan gula per kemasan, bukan hanya ukuran per sajian. Pilih versi tanpa gula atau less sugar dan jadikan SugarScan sebagai pemeriksaan cepat."
        },
        {
            icon: <CheckCircle2 size={28} className="icon-purple" />,
            title: "Cegah sejak remaja",
            desc: "Kebiasaan kecil hari ini membantu menurunkan risiko kesehatan di masa depan.",
            color: "purple-card",
            content: "Kurangi minuman berpemanis secara bertahap, tetap aktif, tidur cukup, dan konsultasikan keluhan yang menetap kepada tenaga kesehatan. Edukasi ini bukan diagnosis medis."
        }
    ];

    return (
        <div className="education-container animate-fade-in">
            <header className="page-header">
                <button className="icon-btn-rounded" onClick={() => navigate('/home')}>
                    <ArrowLeft size={24} />
                </button>
                <div className="feature-heading"><GraduationCap className="feature-heading-icon" /><h2>Edukasi Preventif</h2></div>
                <div style={{ width: 40 }} />
            </header>

            <div className="education-content">
                <div className="edu-banner">
                    <h3>Pahami Gula, Cegah Risikonya</h3>
                    <p>Pengetahuan tentang minuman membantu kamu mengambil keputusan sehat sebelum masalah muncul.</p>
                </div>

                <section className="quiz-card glass-card">
                    <div className="article-header"><Trophy size={28} className="icon-blue" /><h4>Kuis cepat</h4></div>
                    <p className="article-desc">Berapa batas maksimal gula harian yang dianjurkan Kemenkes?</p>
                    <div className="quiz-options">
                        {[25, 50, 75].map((answer) => (
                            <button key={answer} className={selectedAnswer === answer ? (answer === 50 ? 'correct' : 'wrong') : ''} onClick={() => setSelectedAnswer(answer)}>{answer} gram</button>
                        ))}
                    </div>
                    {selectedAnswer && <p className="quiz-feedback">{selectedAnswer === 50 ? 'Benar. Jadikan 50 gram sebagai batas harian, bukan target yang harus dihabiskan.' : 'Belum tepat. Acuan maksimal gula harian yang digunakan di SugarSense adalah 50 gram.'}</p>}
                </section>

                <div className="articles-grid">
                    {articles.map((art, idx) => (
                        <div key={idx} className={`article-card ${art.color} glass-card`}>
                            <div className="article-header">
                                <div className="article-icon-wrap">
                                    {art.icon}
                                </div>
                                <h4>{art.title}</h4>
                            </div>
                            <p className="article-desc">{art.desc}</p>
                            <div className="article-hide-content">
                                <hr />
                                <p>{art.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Education;
