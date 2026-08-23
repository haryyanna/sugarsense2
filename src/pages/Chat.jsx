import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { chatCompletion } from '../lib/nutriApi';
import './Chat.css';

const INITIAL_MESSAGES = [
    {
        id: 1,
        sender: 'bot',
        text: 'Halo! Aku SugarSense AI, asisten gizi minumanmu. Aku bisa membantu membaca kandungan gula, membandingkan pilihan minuman, menjelaskan risikonya, dan memberi langkah praktis yang sesuai untuk remaja.',
    }
];

const SUGGESTIONS = [
    "Berapa batas gula harian?",
    "Tips kopi susu rendah kalori",
    "Rekomendasi jus buah segar",
    "Bahaya soda untuk ginjal"
];
    const CHAT_REFERENCES = '\n\nReferensi:\n- Kemenkes RI, Pedoman Gizi Seimbang: https://ayosehat.kemkes.go.id/pedoman-gizi-seimbang\n- WHO, Guideline: Sugars intake for adults and children: https://www.who.int/publications/i/item/9789241549028\n- USDA FoodData Central, basis data komposisi pangan: https://fdc.nal.usda.gov/';

    const withReferences = (text) => {
        const answer = String(text || '').trim();
        return answer.toLowerCase().includes('referensi:') ? answer : `${answer}${CHAT_REFERENCES}`;
    };

const Chat = () => {
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Load chat history from localStorage on mount
    useEffect(() => {
        const username = localStorage.getItem('moodify_currentUser');
        if (username) {
            const userKey = `moodify_data_${username}`;
            try {
                const savedData = localStorage.getItem(userKey);
                if (savedData) {
                    const userData = JSON.parse(savedData);
                    if (userData.chatHistory && userData.chatHistory.length > 0 && userData.chatHistory[0].text.includes('SugarSense AI')) {
                        setMessages(userData.chatHistory);
                    } else {
                        // Custom initial greeting with username
                        const personalizedGreeting = [
                            {
                                id: 1,
                                sender: 'bot',
                                text: `Halo ${username}! Aku SugarSense AI, asisten gizi minumanmu. Aku bisa membantu membaca kandungan gula, membandingkan pilihan minuman, menjelaskan risikonya, dan memberi langkah praktis yang sesuai untuk remaja.`,
                            }
                        ];
                        setMessages(personalizedGreeting);
                        userData.chatHistory = personalizedGreeting;
                        localStorage.setItem(userKey, JSON.stringify(userData));
                    }
                }
            } catch (e) {
                console.error("Error loading chat history:", e);
            }
        }
    }, []);

    // Helper to save messages to localStorage
    const saveMessagesToLocal = (newMessages) => {
        const username = localStorage.getItem('moodify_currentUser');
        if (username) {
            const userKey = `moodify_data_${username}`;
            try {
                const savedData = localStorage.getItem(userKey);
                if (savedData) {
                    const userData = JSON.parse(savedData);
                    userData.chatHistory = newMessages;
                    localStorage.setItem(userKey, JSON.stringify(userData));
                }
            } catch (e) {
                console.error("Error saving chat history:", e);
            }
        }
    };

    const playSendSound = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const getAiResponse = async (userText, history) => {
        try {
            const formattedHistory = history.map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.text
            }));

            formattedHistory.push({
                role: 'user',
                content: userText
            });

            const systemPrompt = "Karaktermu: SugarSense AI, asisten gizi minuman yang ramah, santai, akurat, dan edukatif untuk remaja. Jawab sesuai pertanyaan dengan bahasa Indonesia yang mudah dipahami. Berikan minimal satu paragraf yang cukup lengkap, biasanya 4-7 kalimat, tanpa bertele-tele. Bila relevan, gunakan struktur: jawaban inti, alasan/fakta, lalu langkah praktis atau alternatif. Sertakan angka gula/kalori hanya jika ada dasar yang jelas dan tandai sebagai perkiraan jika bervariasi. Gunakan paling banyak 1-2 emoji. Jangan mendiagnosis atau menggantikan tenaga kesehatan.";

            const data = await chatCompletion({
                messages: [
                    { role: "system", content: systemPrompt },
                    ...formattedHistory
                ],
                max_tokens: 800,
                temperature: 0.7
            });
            return data.content?.trim() || getLocalResponseFallback(userText);
                return withReferences(data.content?.trim() || getLocalResponseFallback(userText));
        } catch (error) {
            console.warn('AI chat unavailable; using local nutrition guidance.', error);
            return getLocalResponseFallback(userText);
                return withReferences(getLocalResponseFallback(userText));
        }
    };

    const getLocalResponseFallback = (text) => {
        const lower = text.toLowerCase();
        if (lower.includes('batas') || lower.includes('limit') || lower.includes('gula')) {
            return "Batas konsumsi gula harian remaja menurut Kemenkes RI maksimal 50 gram (setara 4 sendok makan). Kebanyakan minuman boba menyumbang 40g+ gula sekaligus! Jadi batasi ya. 💧";
        }
        if (lower.includes('kopi') || lower.includes('kafein')) {
            return "Kopi hitam tanpa gula itu sangat sehat! Namun kopi susu gula aren kekinian biasanya sarat kalori kosong. Coba pesan dengan less sugar atau ganti susunya dengan oat milk. ☕";
        }
        if (lower.includes('jus') || lower.includes('buah')) {
            return "Jus buah murni tanpa gula tambahan itu bagus, kaya vitamin dan serat alami! Usahakan makan buah langsung atau buat jus tanpa kental manis cokelat agar rendah gula. 🥑";
        }
        if (lower.includes('soda') || lower.includes('sprite') || lower.includes('cola')) {
            return "Minuman soda mengandung asam fosfat dan pemanis buatan tinggi yang memperberat kerja ginjal jika diminum terlalu sering. Lebih baik ganti dengan infused water lemon segar! 🥫";
        }
        return "Pertanyaan menarik. Untuk mendapat jawaban yang lebih tepat, pindai minuman atau tuliskan nama, ukuran, dan tambahan gulanya. Setelah itu SugarSense bisa membantu memperkirakan kontribusi gula dan memberi pilihan yang lebih rendah gula untuk konsumsi harianmu. 🥤";
    };

    const handleSend = async (textToSend = inputText) => {
        if (!textToSend.trim()) return;
        
        playSendSound();

        const currentHistory = [...messages];

        const newMessage = {
            id: messages.length + 1,
            sender: 'user',
            text: textToSend
        };

        const updatedMessagesWithUser = [...currentHistory, newMessage];
        setMessages(updatedMessagesWithUser);
        saveMessagesToLocal(updatedMessagesWithUser);

        setInputText('');
        setIsTyping(true);

        const aiText = await getAiResponse(textToSend, currentHistory);

        const botResponse = {
            id: updatedMessagesWithUser.length + 1,
            sender: 'bot',
            text: aiText
        };

        const finalUpdatedMessages = [...updatedMessagesWithUser, botResponse];
        setMessages(finalUpdatedMessages);
        saveMessagesToLocal(finalUpdatedMessages);

        setIsTyping(false);
    };

    return (
        <div className="chat-container">
            <header className="chat-header">
                <div className="chat-header-left">
                    <div className="chat-logo-mini">🥤</div>
                    <div className="chat-header-text">
                        <h2>SugarSense AI</h2>
                        <p>Konsultan Gizi Minuman</p>
                    </div>
                </div>
            </header>

            <div className="messages-area">
                {messages.map((msg, index) => (
                    <div key={index} className={`message-wrapper ${msg.sender === 'user' ? 'user' : 'bot'}`}>
                        {msg.sender === 'bot' && (
                            <div className="message-avatar">🤖</div>
                        )}
                        <div className={`message-bubble ${msg.sender === 'user' ? 'bubble-user' : 'bubble-bot'}`}>
                            {msg.text.split('\n').map((line, i) => (
                                <span key={i}>
                                    {line}
                                    {i !== msg.text.split('\n').length - 1 && <br />}
                                </span>
                            ))}
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="message-wrapper bot">
                        <div className="message-avatar">🤖</div>
                        <div className="message-bubble bubble-bot typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-wrapper">
                <div className="suggestions-container">
                    {SUGGESTIONS.map((suggestion, idx) => (
                        <button
                            key={idx}
                            className="suggestion-chip"
                            onClick={() => handleSend(suggestion)}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>

                <div className="input-bar">
                    <input
                        type="text"
                        placeholder="Tanya seputar gizi minuman di sini..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        className={`send-btn ${inputText.trim() ? 'active' : ''}`}
                        onClick={() => handleSend()}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
