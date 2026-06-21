const { useState, useRef, useEffect } = React;

function App() {
    const [messages, setMessages] = useState([
        { role: 'bot', content: 'السلام عليكم ورحمة الله وبركاتة. مرحباً بك في المساعد الذكي لجامعة القرآن الكريم والعلوم الإسلامية - فرع غيل باوزير. تفضل بطرح استفسارك.' }
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

        if (q === ADMIN_SECRET) { setAdminMode(true); setInput(''); return; }

        setMessages(prev => [...prev, { role: 'user', content: q }]);
        setInput('');
        setLoading(true);
        try {
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'bot', content: data.reply || 'عذراً، حدث خطأ.' }]);
            speakText(data.reply);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'bot', content: '⚠️ خطأ في الاتصال بالخادم.' }]);
        }
        setLoading(false);
    };

    const speakText = (text) => {
        if (!window.speechSynthesis || !text) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text); u.lang = 'ar-SA'; u.rate = 0.95; window.speechSynthesis.speak(u);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream); audioChunks.current = [];
            mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
            mediaRecorder.current.onstop = async () => {
                const blob = new Blob(audioChunks.current, { type: 'audio/wav' });
                const fd = new FormData(); fd.append('audio', blob, 'recording.wav');
                try { const r = await fetch('/api/speech-to-text', { method: 'POST', body: fd }); const d = await r.json(); if (d.text) sendMessage(d.text); } catch (e) {}
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorder.current.start(); setRecording(true);
        } catch (e) {}
    };

    const stopRecording = () => { if (mediaRecorder.current) { mediaRecorder.current.stop(); setRecording(false); } };

    const loginAdmin = async () => {
        const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPass }) });
        if (res.ok) { setAdminLogged(true); loadAdminData(); } else setAdminMsg('❌ كلمة مرور غير صحيحة');
    };

    const loadAdminData = async () => {
        const res = await fetch('/api/chat'); const data = await res.json();
        setAdminData({ info: data.info || '', schedules: data.schedules || '', exams: data.exams || '', fees: data.fees || '', contacts: data.contacts || '', majors: data.majors || '' });
        if (data.stats) setStats(data.stats);
    };

    const saveAdminData = async () => {
        const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPass, ...adminData }) });
        setAdminMsg(res.ok ? '✅ تم الحفظ بنجاح' : '❌ خطأ في الحفظ');
    };

    const quickActions = [
        { label: '📅 الجداول الدراسية', question: 'أريد الاستفسار عن جداول المحاضرات' },
        { label: '📝 الامتحانات', question: 'ما هي مواعيد وترتيبات الامتحانات؟' },
        { label: '📞 جهات الاتصال', question: 'كيف يمكنني التواصل مع إدارة الفرع؟' },
        { label: '🎓 التخصصات', question: 'ما هي التخصصات الأكاديمية المتاحة؟' }
    ];

    return React.createElement('div', { className: 'container' },
        React.createElement('div', { className: 'glass-panel' },
            React.createElement('div', { className: 'basmala' }, 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'),
            React.createElement('div', { className: 'uni-title' }, '🕌 جامعة القرآن الكريم', React.createElement('br'), 'والعلوم الإسلامية'),
            React.createElement('div', { className: 'branch-title' }, '✦ فرع غيل باوزير - حضرموت ✦'),

            !adminMode ? React.createElement('div', null,
                React.createElement('div', { className: 'gold-divider' }),
                React.createElement('div', { className: 'btn-row' }, quickActions.map((a, i) => React.createElement('button', { key: i, className: 'btn', onClick: () => sendMessage(a.question) }, a.label))),
                React.createElement('div', { className: 'gold-divider' }),
                React.createElement('div', { className: 'chat-box', ref: chatRef },
                    messages.map((msg, i) => React.createElement('div', { key: i, className: 'chat-msg ' + (msg.role === 'user' ? 'user-msg' : 'bot-msg') }, msg.content, msg.role === 'bot' && React.createElement('span', { className: 'voice-icon', onClick: () => speakText(msg.content), title: 'استمع للرد' }, ' 🔊'))),
                    loading && React.createElement('div', { className: 'chat-msg bot-msg' }, '⏳ جاري الرد...')
                ),
                React.createElement('div', { className: 'input-row' },
                    React.createElement('button', { className: 'mic-btn ' + (recording ? 'recording' : ''), onClick: recording ? stopRecording : startRecording }, '🎤'),
                    React.createElement('input', { value: input, onChange: e => setInput(e.target.value), onKeyPress: e => e.key === 'Enter' && sendMessage(input), placeholder: recording ? '🎙️ جاري الاستماع...' : '✍️ اكتب سؤالك هنا...', disabled: loading || recording }),
                    React.createElement('button', { className: 'send-btn', onClick: () => sendMessage(input), disabled: loading }, '↗')
                )
            ) :
            React.createElement('div', null,
                React.createElement('div', { className: 'gold-divider' }),
                React.createElement('h3', { style: { color: '#d4af37', textAlign: 'center' } }, '🔐 لوحة الإدارة'),
                !adminLogged ?
                    React.createElement('div', null,
                        React.createElement('input', { type: 'password', placeholder: '🔑 كلمة مرور المشرف', value: adminPass, onChange: e => setAdminPass(e.target.value), style: { width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', color: '#fff', fontSize: '1em', marginBottom: '10px' } }),
                        React.createElement('button', { className: 'btn', onClick: loginAdmin, style: { width: '100%' } }, 'دخول'),
                        adminMsg && React.createElement('p', { style: { color: '#e74c3c', textAlign: 'center' } }, adminMsg)
                    )
                :
                    React.createElement('div', null,
                        ['info', 'schedules', 'exams', 'fees', 'contacts', 'majors'].map(f => React.createElement('div', { key: f, style: { marginBottom: '15px' } },
                            React.createElement('label', { style: { color: '#d4af37', display: 'block', marginBottom: '5px' } }, f === 'info' ? '📋 معلومات عامة' : f === 'schedules' ? '📚 الجداول الدراسية' : f === 'exams' ? '📝 الامتحانات' : f === 'fees' ? '💰 الرسوم الدراسية' : f === 'contacts' ? '📞 جهات الاتصال' : '🎓 التخصصات'),
                            React.createElement('textarea', { value: adminData[f], onChange: e => setAdminData({ ...adminData, [f]: e.target.value }), style: { width: '100%', height: '80px', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '12px', color: '#fff', fontSize: '0.95em', resize: 'vertical' } })
                        )),
                        React.createElement('button', { className: 'btn', onClick: saveAdminData, style: { width: '100%', marginTop: '10px' } }, '💾 حفظ البيانات'),
                        adminMsg && React.createElement('p', { style: { color: adminMsg.includes('✅') ? '#10B981' : '#e74c3c', textAlign: 'center', marginTop: '10px' } }, adminMsg),
                        stats && React.createElement('div', { style: { marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' } },
                            React.createElement('h4', { style: { color: '#d4af37' } }, '📊 إحصائيات'),
                            React.createElement('p', { style: { color: '#e8e8e8' } }, `إجمالي الأسئلة: ${stats.total} | اليوم: ${stats.today}`)
                        ),
                        React.createElement('button', { className: 'btn', onClick: () => { setAdminMode(false); setAdminLogged(false); setAdminPass(''); }, style: { width: '100%', marginTop: '15px', background: 'rgba(200,40,40,0.3)' } }, '🔙 خروج من لوحة الإدارة')
                    )
            )
        ),
        React.createElement('div', { className: 'footer' }, 'المطور: سالم التريمي | © 2026 جامعة القرآن الكريم والعلوم الإسلامية')
    );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
