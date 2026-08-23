import { useState } from 'react';
import { ArrowLeft, BookOpen, Send, Sparkles, NotebookPen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Journal.css';

const CEREBRAS_API_KEY = import.meta.env.VITE_CEREBRAS_API_KEY;

const Journal = () => {
    const navigate = useNavigate();
    const [entry, setEntry] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [aiFeedback, setAiFeedback] = useState(null);

    const getAiReflection = async (text) => {
        if (!CEREBRAS_API_KEY) {
            return {
                emotion: "Konfigurasi belum lengkap",
                summary: "Fitur AI belum aktif karena API key belum diisi.",
                advice: "Tambahkan VITE_CEREBRAS_API_KEY pada environment variables."
            };
        }

        try {
            const url = `https://api.cerebras.ai/v1/chat/completions`;
            
            const systemPrompt = "Tugasmu adalah membaca curhatan/jurnal pengguna lalu menganalisisnya. Format jawaban WAJIB berupa JSON murni: {\"emotion\": \"[Rangkuman Emosi, misal: Lelah, Kecewa, Senang]\", \"summary\": \"[Satu kalimat singkat refleksi atas curhatannya]\", \"advice\": \"[Satu saran coping/langkah positif singkat]\"}. Hanya berikan JSON mentah tanpa blok kode (```json) dan jangan membalas dengan teks tambahan apapun. Gunakan bahasa Indonesia.";
            
            const requestBody = {
                model: "llama3.1-8b",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: text }
                ],
                max_tokens: 300,
                temperature: 0.2 // Lower temp for more reliable json output
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CEREBRAS_API_KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const textResponse = data.choices[0].message.content;
            
            // Clean up the JSON response (in case AI wraps it in markdown code blocks)
            let jsonText = textResponse.trim();
            if (jsonText.startsWith('```json')) jsonText = jsonText.slice(7);
            if (jsonText.startsWith('```')) jsonText = jsonText.slice(3);
            if (jsonText.endsWith('```')) jsonText = jsonText.slice(0, -3);
            jsonText = jsonText.trim();
            
            const parsed = JSON.parse(jsonText);
            
            return {
                emotion: parsed.emotion || "Netral",
                summary: parsed.summary || "Sepertinya curhatanmu sudah tersimpan dengan baik.",
                advice: parsed.advice || "Coba praktikkan latihan napas jika masih merasa tidak karuan."
            };
        } catch (error) {
            console.error("Cerebras API parsing/fetch error:", error);
            return {
                emotion: "Tersimpan",
                summary: "Curhatan harianmu telah aman tercatat di Jurnal.",
                advice: "Kadang hanya dengan menulis, beban di hati bisa sedikit berkurang."
            };
        }
    };

    const handleSave = async () => {
        if (!entry.trim()) return;
        setIsSubmitting(true);
        setAiFeedback(null);

        // Get AI Reflection
        const feedback = await getAiReflection(entry);
        setAiFeedback(feedback);

        // Save to local storage
        const username = localStorage.getItem('moodify_currentUser');
        if (username) {
            const userKey = `moodify_data_${username}`;
            const savedData = localStorage.getItem(userKey);
            if (savedData) {
                const userData = JSON.parse(savedData);
                if (!userData.journals) userData.journals = [];
                userData.journals.push({
                    date: new Date().toISOString(),
                    text: entry,
                    feedback: feedback
                });
                localStorage.setItem(userKey, JSON.stringify(userData));
            }
        }

        setIsSubmitting(false);
        setEntry('');
    };

    return (
        <div className="journal-container animate-fade-in">
            <header className="page-header">
                <button className="icon-btn-rounded" onClick={() => navigate('/home')}>
                    <ArrowLeft size={24} />
                </button>
                <div className="feature-heading"><NotebookPen className="feature-heading-icon" /><h2>Jurnal & Curhat</h2></div>
                <div style={{ width: 40 }} />
            </header>

            <div className="journal-content">
                <div className="journal-editor glass-card">
                    <div className="editor-header">
                        <BookOpen size={20} className="icon-blue" />
                        <h3>Apa yang kamu rasakan hari ini?</h3>
                    </div>
                    
                    <textarea 
                        className="journal-textarea" 
                        placeholder="Hari ini aku merasa..."
                        value={entry}
                        onChange={(e) => setEntry(e.target.value)}
                        disabled={isSubmitting}
                    ></textarea>

                    <div className="editor-footer">
                        <span className="char-count">{entry.length} karakter</span>
                        <button 
                            className="btn-primary btn-small"
                            onClick={handleSave}
                            disabled={!entry.trim() || isSubmitting}
                        >
                            {isSubmitting ? 'Memproses...' : <><Send size={16} /> Simpan Curhat</>}
                        </button>
                    </div>
                </div>

                {isSubmitting && (
                    <div className="ai-loading">
                        <Sparkles className="pulse-animation" size={24} color="#6366f1" />
                        <p>AI sedang membaca curhatanmu...</p>
                    </div>
                )}

                {aiFeedback && (
                    <div className="ai-feedback-card glass-card animate-slide-up">
                        <div className="feedback-badge"><Sparkles size={14} /> AI Insight</div>
                        <div className="feedback-section">
                            <h4>Terdeteksi Emosi</h4>
                            <p className="emotion-tag">{aiFeedback.emotion}</p>
                        </div>
                        <div className="feedback-section">
                            <h4>Refleksi</h4>
                            <p>"{aiFeedback.summary}"</p>
                        </div>
                        <div className="feedback-section highlight-bg">
                            <h4>Saran SUGARSENSE</h4>
                            <p>{aiFeedback.advice}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Journal;
