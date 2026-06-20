const { useState, useRef, useEffect, useCallback } = React;

// ========== جزيئات ذهبية ==========
function Particles() {
    useEffect(() => {
        const container = document.createElement('div');
        container.className = 'particles';
        document.body.appendChild(container);
        for (let i = 0; i < 35; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            const size = Math.random() * 3 + 1;
            p.style.cssText = `
                width: ${size}px; height: ${size}px;
                left: ${Math.random() * 100}%;
                animation-duration: ${Math.random() * 10 + 8}s;
                animation-delay: -${Math.random() * 8}s;
                opacity: ${Math.random() * 0.6 + 0.2};
            `;
            container.appendChild(p);
        }
        return () => container.remove();
    }, []);
    return null;
}

// ========== التطبيق الرئيسي ==========
function App() {
    const [messages, setMessages] = useState([
        { role: 'bot', content: 'مرحباً بك في المساعد الذكي لجامعة القرآن الكريم - فرع غيل باوزير. تفضل بطرح استفسارك.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [playingMsg, setPlayingMsg] = useState(null);
    const chatRef = useRef(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);
    const audioRef = useRef(new Audio());

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    // ========== إرسال رسالة نصية ==========
    const sendMessage = async (text) => {
        if (!text || !text.trim() || loading) return;
        const q = text.trim();
        setMessages(prev => [...prev, { role: 'user', content: q }]);
        setInput('');
        setLoading(true);
        await getAIResponse(q);
    };

    // ========== استدعاء الذكاء الاصطناعي ==========
    const getAIResponse = async (q) => {
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q })
            });
            const data = await res.json();
            const reply = data.reply || 'عذراً، حدث خطأ.';
            setMessages(prev => [...prev, { role: 'bot', content: reply }]);
            // تحويل الرد إلى صوت
            speakText(reply);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'bot', content: '⚠️ خطأ في الاتصال بالخادم.' }]);
        }
        setLoading(false);
    };

    // ========== تحويل النص إلى صوت ==========
    const speakText = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.onstart = () => setPlayingMsg(text.substring(0, 50));
        utterance.onend = () => setPlayingMsg(null);
        window.speechSynthesis.speak(utterance);
    };

    // ========== بدء التسجيل ==========
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            mediaRecorder.current.onstop = async () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', blob, 'recording.wav');
                try {
                    const res = await fetch('/api/speech-to-text', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.text) {
                        setInput(data.text);
                        sendMessage(data.text);
                    }
                } catch (e) {}
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.current.start();
            setRecording(true);
        } catch (e) {}
    };

    // ========== إيقاف التسجيل ==========
    const stopRecording = () => {
        if (mediaRecorder.current) {
            mediaRecorder.current.stop();
            setRecording(false);
        }
    };

    const quickActions = [
        { icon: '📅', label: 'الجداول', question: 'أريد الاستفسار عن جداول المحاضرات' },
        { icon: '📝', label: 'الامتحانات', question: 'ما هي مواعيد وترتيبات الامتحانات؟' },
        { icon: '📞', label: 'التواصل', question: 'كيف يمكنني التواصل مع إدارة الفرع؟' },
        { icon: '🎓', label: 'التخصصات', question: 'ما هي التخصصات الأكاديمية المتاحة؟' }
    ];

    return React.createElement('div', { className: 'container' },
        React.createElement(Particles),
        React.createElement('div', { className: 'glass-card' },
            React.createElement('div', { className: 'basmala' }, 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'),
            React.createElement('div', { className: 'uni-title' }, '🕌 جامعة القرآن الكريم', React.createElement('br'), 'والعلوم الإسلامية'),
            React.createElement('div', { className: 'branch-title' }, '✦ فرع غيل باوزير - حضرموت ✦'),
            React.createElement('div', { className: 'gold-divider' }),

            React.createElement('div', { className: 'btn-row' },
                quickActions.map((action, i) =>
                    React.createElement('button', { key: i, className: 'btn', onClick: () => sendMessage(action.question) },
                        action.icon, ' ', action.label
                    )
                )
            ),

            React.createElement('div', { className: 'gold-divider' }),

            React.createElement('div', { className: 'chat-box', ref: chatRef },
                messages.map((msg, i) =>
                    React.createElement('div', { key: i, className: 'chat-msg ' + (msg.role === 'user' ? 'user-msg' : 'bot-msg') },
                        (msg.role === 'user' ? '🧑‍🎓 ' : '🤖 '),
                        msg.content,
                        msg.role === 'bot' && React.createElement('i', {
                            className: 'fas fa-volume-up voice-icon',
                            onClick: () => speakText(msg.content),
                            title: 'استمع للرد'
                        })
                    )
                ),
                loading ? React.createElement('div', { className: 'chat-msg bot-msg' }, '⏳ جاري الرد...') : null
            ),

            React.createElement('div', { className: 'input-area' },
                React.createElement('button', {
                    className: 'mic-btn ' + (recording ? 'recording' : ''),
                    onClick: recording ? stopRecording : startRecording,
                    title: recording ? 'إيقاف التسجيل' : 'تحدث الآن'
                }, React.createElement('i', { className: 'fas fa-microphone' })),
                React.createElement('input', {
                    value: input,
                    onChange: (e) => setInput(e.target.value),
                    onKeyPress: (e) => e.key === 'Enter' && sendMessage(input),
                    placeholder: recording ? '🎙️ جاري الاستماع...' : '✍️ اكتب سؤالك هنا...',
                    disabled: loading || recording
                }),
                React.createElement('button', {
                    className: 'send-btn',
                    onClick: () => sendMessage(input),
                    disabled: loading
                }, React.createElement('i', { className: 'fas fa-paper-plane' }))
            )
        ),
        React.createElement('div', { className: 'footer' }, 'المطور: سالم التريمي | © 2026 جامعة القرآن الكريم')
    );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
