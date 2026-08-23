import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px 120px' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button className="icon-btn-rounded" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="feature-heading"><ShieldCheck className="feature-heading-icon" /><h2 style={{ color: 'var(--text-main)' }}>Kebijakan Privasi SUGARSENSE</h2></div>
      </header>

      <div className="glass-card" style={{ textAlign: 'left', lineHeight: '1.7', color: 'var(--text-main)' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          Dokumen ini menjelaskan cara data kamu digunakan di SUGARSENSE.
        </p>
        <h3 style={{ marginBottom: '8px' }}>Data yang disimpan</h3>
        <p style={{ marginBottom: '16px' }}>
          Kami menyimpan data akun, check-in mood, jurnal, dan interaksi fitur untuk menampilkan progres dan rekomendasi.
        </p>
        <h3 style={{ marginBottom: '8px' }}>Tujuan penggunaan</h3>
        <p style={{ marginBottom: '16px' }}>
          Data digunakan untuk personalisasi pengalaman, statistik admin sekolah, dan peningkatan kualitas layanan.
        </p>
        <h3 style={{ marginBottom: '8px' }}>Batasan layanan</h3>
        <p style={{ marginBottom: '16px' }}>
          SUGARSENSE bukan pengganti diagnosis atau perawatan medis profesional.
        </p>
        <h3 style={{ marginBottom: '8px' }}>Kontrol pengguna</h3>
        <p>
          Kamu dapat meminta penghapusan data melalui admin sekolah atau fitur penghapusan di dashboard admin.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
