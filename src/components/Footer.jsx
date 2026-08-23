import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="desktop-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h3>SUGARSENSE</h3>
                    <p>Panduan nutrisi harian yang ringan, cepat, dan ramah untuk kehidupan sehatmu.</p>
                </div>
                <div className="footer-section">
                    <h4>Tautan Cepat</h4>
                    <ul>
                        <li><Link to="/home">Beranda</Link></li>
                        <li><Link to="/scan">SugarScan</Link></li>
                        <li><Link to="/chat">SUGARSENSE AI</Link></li>
                        <li><Link to="/progress">Pantauan Gula</Link></li>
                        <li><Link to="/education">Edukasi Preventif</Link></li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h4>Bantuan & Info</h4>
                    <ul>
                        <li><Link to="/scan">Cara Menggunakan SugarScan</Link></li>
                        <li><Link to="/education">Batas Gula & Edukasi</Link></li>
                        <li><Link to="/privacy">Kebijakan Privasi</Link></li>
                        <li><Link to="/profile">Profil & Pengaturan</Link></li>
                    </ul>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; {new Date().getFullYear()} SUGARSENSE. Semua hak dilindungi.</p>
            </div>
        </footer>
    );
};

export default Footer;
