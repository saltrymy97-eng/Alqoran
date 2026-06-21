const { useState, useRef, useEffect } = React;

function App() {
    const [messages, setMessages] = useState([
        { role: 'bot', content: 'مرحباً بك في المساعد الذكي لجامعة القرآن الكريم - فرع غيل باوزير. تفضل بطرح استفسارك أو اختر من الخدمات المتاحة أعلاه.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [adminMode, setAdminMode] = useState(false);
    const [adminPass, setAdminPass] = useState('');
    const [adminLogged, setAdminLogged] = useState(false);
    const [adminData, setAdminData] = useState({ info: '', schedules: '', exams: '', fees: '', contacts: '', majors: '' });
    const [adminMsg, setAdminMsg] = useState('');
    const [stats, setStats] = useState(null);
    const chatRef = useRef(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    const ADMIN_SECRET = 'ادارة جامعة القران الكريم وعلومه';

    useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

    const sendMessage = async (text) => {
        if (!text || !text.trim() || loading) return;
        const q = text.trim();

        if (q === ADMIN_SECRET) {
            setAdminMode(true);
            setInput('');
            return;
        }

        setMessages(prev => [...prev, { role: 'user', content: q }]);
        setInput('');
        setLoading(true);
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q })
            });
            const data = await res.json();
            const reply = data.reply || 'عذراً، حدث خطأ.';
            setMessages(prev => [...prev, { role: 'bot', content: reply }]);
            speakText(reply);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'bot', content: '⚠️ خطأ في الاتصال بالخادم.' }]);
        }
        setLoading(false);
    };

    const speakText = (text) => {
        if (!window.speechSynthesis || !text) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ar-SA';
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            audioChunks.current = [];
            mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            mediaRecorder.current.onstop = async () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
                const fd = new FormData();
                fd.append('audio', blob, 'recording.wav');
                try {
                    const r = await fetch('/api/speech-to-text', { method: 'POST', body: fd });
                    const d = await r.json();
                    if (d.text) sendMessage(d.text);
                } catch (e) {}
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.current.start();
            setRecording(true);
        } catch (e) {}
    };

    const stopRecording = () => {
        if (mediaRecorder.current) {
            mediaRecorder.current.stop();
            setRecording(false);
        }
    };

    const loginAdmin = async () => {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPass })
        });
        if (res.ok) {
            setAdminLogged(true);
            loadAdminData();
        } else {
            setAdminMsg('❌ كلمة مرور غير صحيحة');
        }
    };

    const loadAdminData = async () => {
        const res = await fetch('/api/chat');
        const data = await res.json();
        setAdminData({
            info: data.info || '',
            schedules: data.schedules || '',
            exams: data.exams || '',
            fees: data.fees || '',
            contacts: data.contacts || '',
            majors: data.majors || ''
        });
        if (data.stats) setStats(data.stats);
    };

    const saveAdminData = async () => {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: adminPass, ...adminData })
        });
        setAdminMsg(res.ok ? '✅ تم الحفظ بنجاح' : '❌ خطأ في الحفظ');
    };

    const quickActions = [
        { icon: '📅', label: 'الجداول', question: 'أريد الاستفسار عن جداول المحاضرات' },
        { icon: '📝', label: 'الامتحانات', question: 'ما هي مواعيد وترتيبات الامتحانات؟' },
        { icon: '📞', label: 'التواصل', question: 'كيف يمكنني التواصل مع إدارة الفرع؟' },
        { icon: '🎓', label: 'التخصصات', question: 'ما هي التخصصات الأكاديمية المتاحة ورسومها؟' }
    ];

    const fieldLabels = {
        info: '📋 معلومات عامة',
        schedules: '📚 الجداول الدراسية',
        exams: '📝 الامتحانات',
        fees: '💰 الرسوم الدراسية',
        contacts: '📞 جهات الاتصال',
        majors: '🎓 التخصصات'
    };

    // ========== عرض الطالب ==========
    if (!adminMode) {
        return React.createElement('div', { className: 'container' },
            React.createElement('div', { className: 'basmala' }, 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'),
            React.createElement('div', { className: 'uni-title' }, '🕌 جامعة القرآن الكريم', React.createElement('br'), 'والعلوم الإسلامية'),
            React.createElement('div', { className: 'branch-title' }, '✦ فرع غيل باوزير - حضرموت ✦'),

            React.createElement('div', { className: 'btn-row' },
                quickActions.map((a, i) =>
                    React.createElement('button', { key: i, className: 'btn', onClick: () => sendMessage(a.question) },
                        a.icon, ' ', a.label
                    )
                )
            ),

            React.createElement('hr'),
            React.createElement('div', { className: 'quran-verse' }, '﴿وَقُل رَّبِّ زِدْنِي عِلْمًا﴾'),

            React.createElement('div', { className: 'chat-box', ref: chatRef },
                messages.map((msg, i) =>
                    React.createElement('div', { key: i, className: 'chat-msg ' + (msg.role === 'user' ? 'user-msg' : 'bot-msg') },
                        msg.content,
                        msg.role === 'bot' && React.createElement('span', { className: 'voice-icon', onClick: () => speakText(msg.content), title: 'استمع للرد' }, ' 🔊')
                    )
                ),
                loading && React.createElement('div', { className: 'chat-msg bot-msg' }, '⏳ جاري الرد...')
            ),

            React.createElement('div', { className: 'input-row' },
                React.createElement('button', { className: 'mic-btn ' + (recording ? 'recording' : ''), onClick: recording ? stopRecording : startRecording, title: recording ? 'إيقاف التسجيل' : 'تحدث الآن' }, '🎤'),
                React.createElement('input', {
                    value: input,
                    onChange: e => setInput(e.target.value),
                    onKeyPress: e => e.key === 'Enter' && sendMessage(input),
                    placeholder: recording ? '🎙️ جاري الاستماع...' : '✍️ اكتب سؤالك هنا...',
                    disabled: loading || recording
                }),
                React.createElement('button', { className: 'send-btn', onClick: () => sendMessage(input), disabled: loading }, '➤')
            ),

            React.createElement('div', { className: 'footer' }, 'المطور: سالم التريمي')
        );
    }

    // ========== عرض الإدارة ==========
    return React.createElement('div', { className: 'container' },
        React.createElement('div', { className: 'basmala' }, 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'),
        React.createElement('div', { className: 'uni-title' }, '🕌 جامعة القرآن الكريم', React.createElement('br'), 'والعلوم الإسلامية'),
        React.createElement('div', { className: 'branch-title' }, '✦ فرع غيل باوزير - حضرموت ✦'),

        React.createElement('hr'),
        React.createElement('h2', { style: { color: '#0f5132', textAlign: 'center', fontFamily: 'Tajawal, sans-serif', fontWeight: 800, fontSize: '2rem' } }, '🔐 لوحة الإدارة'),

        !adminLogged ?
            React.createElement('div', { style: { maxWidth: '400px', margin: '0 auto' } },
                React.createElement('input', {
                    type: 'password',
                    dir: 'ltr',
                    placeholder: '🔑 كلمة مرور المشرف',
                    value: adminPass,
                    onChange: e => setAdminPass(e.target.value),
                    style: {
                        width: '100%', padding: '14px', background: '#ffffff',
                        border: '1px solid #cbd5e1', borderRadius: '8px',
                        color: '#1e293b', fontSize: '1em', marginBottom: '10px',
                        fontFamily: 'Tajawal, sans-serif'
                    }
                }),
                React.createElement('button', {
                    className: 'btn',
                    onClick: loginAdmin,
                    style: { width: '100%' }
                }, 'دخول'),
                adminMsg && React.createElement('p', { style: { color: '#e74c3c', textAlign: 'center', marginTop: '10px' } }, adminMsg)
            )
        :
            React.createElement('div', null,
                Object.keys(fieldLabels).map(f =>
                    React.createElement('div', { key: f, style: { marginBottom: '15px' } },
                        React.createElement('label', { style: { color: '#0f5132', display: 'block', marginBottom: '5px', fontWeight: 600, fontFamily: 'Tajawal, sans-serif' } }, fieldLabels[f]),
                        React.createElement('textarea', {
                            value: adminData[f],
                            onChange: e => setAdminData({ ...adminData, [f]: e.target.value }),
                            style: {
                                width: '100%', height: f === 'majors' ? '200px' : '100px',
                                padding: '12px', background: '#ffffff',
                                border: '1px solid #cbd5e1', borderRadius: '8px',
                                color: '#1e293b', fontSize: '0.95em', resize: 'vertical',
                                fontFamily: 'Tajawal, sans-serif'
                            }
                        })
                    )
                ),
                React.createElement('button', { className: 'btn', onClick: saveAdminData, style: { width: '100%', marginTop: '10px' } }, '💾 حفظ البيانات'),
                adminMsg && React.createElement('p', { style: { color: adminMsg.includes('✅') ? '#10B981' : '#e74c3c', textAlign: 'center', marginTop: '10px' } }, adminMsg),

                stats && React.createElement('div', { style: { marginTop: '20px', padding: '15px', background: '#f4f6f4', borderRadius: '12px' } },
                    React.createElement('h4', { style: { color: '#0f5132', fontFamily: 'Tajawal, sans-serif' } }, '📊 إحصائيات'),
                    React.createElement('p', { style: { color: '#2b3a30', fontFamily: 'Tajawal, sans-serif' } }, `إجمالي الأسئلة: ${stats.total} | اليوم: ${stats.today}`)
                ),

                React.createElement('button', {
                    className: 'btn',
                    onClick: () => { setAdminMode(false); setAdminLogged(false); setAdminPass(''); },
                    style: { width: '100%', marginTop: '15px' }
                }, '🔙 خروج من لوحة الإدارة والعودة للمساعد الذكي')
            ),

        React.createElement('div', { className: 'footer' }, 'المطور: سالم التريمي')
    );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
