import React, { useState } from 'react';
import { Phone, HeartHandshake, X, ExternalLink } from 'lucide-react';
import './SOSButton.css';

const SOSButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button 
        className={`sos-floating-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(true)}
        title="Butuh Bantuan Darurat?"
      >
        <Phone size={24} />
      </button>

      {isOpen && (
        <div className="sos-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="sos-modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <button className="sos-close-btn" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
            
            <div className="sos-header">
              <div className="sos-icon-wrapper">
                <HeartHandshake size={32} color="#dc2626" />
              </div>
              <h2>Kamu Tidak Sendirian</h2>
              <p>Jika kamu merasa sedang dalam krisis, memiliki pikiran untuk menyakiti diri sendiri, atau butuh bantuan segera, tolong hubungi profesional langsung.</p>
            </div>

            <div className="sos-contacts">
              <a href="tel:119" className="sos-contact-card">
                <div className="sos-contact-info">
                  <h4>Layanan Gawat Darurat</h4>
                  <span>119 (Bebas Pulsa)</span>
                </div>
                <ExternalLink size={18} color="#64748b" />
              </a>
              
              <a href="https://intothelightid.org/tentang-bunuh-diri/hotline-dan-konseling/" target="_blank" rel="noopener noreferrer" className="sos-contact-card">
                <div className="sos-contact-info">
                  <h4>Into The Light Indonesia</h4>
                  <span>Pusat Informasi & Pencegahan</span>
                </div>
                <ExternalLink size={18} color="#64748b" />
              </a>

              <a href="https://pijarpsikologi.org/" target="_blank" rel="noopener noreferrer" className="sos-contact-card">
                <div className="sos-contact-info">
                  <h4>Pijar Psikologi</h4>
                  <span>Konseling Psikologi Gratis</span>
                </div>
                <ExternalLink size={18} color="#64748b" />
              </a>
            </div>

            <div className="sos-footer">
              <p style={{ marginBottom: '8px', color: '#475569', fontWeight: 600 }}>
                Jika memungkinkan sekarang:
              </p>
              <p style={{ marginBottom: '6px' }}>1. Letakkan benda tajam/jarang aman dari sekitar kamu.</p>
              <p style={{ marginBottom: '6px' }}>2. Hubungi orang dewasa/teman tepercaya untuk menemani.</p>
              <p style={{ marginBottom: '10px' }}>3. Jika ada risiko langsung, telepon 119 sekarang.</p>
              <p>Layanan SUGARSENSE AI bukan pengganti tenaga medis atau psikolog profesional.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SOSButton;
