const { useState, useRef, useEffect } = React;

function App() {
    const [messages, setMessages] = useState([
        { role: 'bot', content: 'مرحباً بك في المساعد الأكاديمي الرقمي لجامعة القرآن الكريم والعلوم الإسلامية - فرع غيل باوزير. تفضل بطرح استفسارك أو اختر من الخدمات السريعة المتاحة.' }
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
            const reply = data.reply || 'عذراً، حدث خطأ في معالجة الطلب.';
            setMessages(prev => [...prev, { role: 'bot', content: reply }]);
            speakText(reply);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'bot', content: '⚠️ خطأ في الاتصال بالخادم الرقمي.' }]);
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

    /* ===== [تعديل واصلاح دالة تسجيل الدخول لتتوافق مع الخادم الخلفي] ===== */
    const loginAdmin = async () => {
        const cleanedPass = adminPass.trim(); // تنظيف كلمة المرور من المسافات فوراً
        if (!cleanedPass) return;
        
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ password: cleanedPass })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setAdminLogged(true);
                setAdminMsg('');
                loadAdminData();
            } else {
                setAdminMsg(data.error || '❌ كلمة مرور غير صحيحة');
            }
        } catch (error) {
            setAdminMsg('⚠️ خطأ برمي في الاتصال بقاعدة البيانات الخلفية');
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
            body: JSON.stringify({ password: adminPass.trim(), ...adminData })
        });
        setAdminMsg(res.ok ? '✅ تم حفظ وتحديث البيانات بنجاح' : '❌ خطأ في الحفظ');
    };

    const quickActions = [
        { icon: '📅', label: 'الجداول الدراسية', question: 'أريد الاستفسار عن جداول المحاضرات' },
        { icon: '📝', label: 'جداول الامتحانات', question: 'ما هي مواعيد وترتيبات الامتحانات؟' },
        { icon: '📞', label: 'قنوات التواصل', question: 'كيف يمكنني التواصل مع إدارة الفرع؟' },
        { icon: '🎓', label: 'التخصصات والرسوم', question: 'ما هي التخصصات الأكاديمية المتاحة ورسومها؟' }
    ];

    const fieldLabels = {
        info: '📋 التعريف العام بالفرع',
        schedules: '📚 إدارة الجداول الدراسية',
        exams: '📝 إدارة المواعيد والامتحانات',
        fees: '💰 شؤون الرسوم المالية',
        contacts: '📞 قنوات الاتصال والتواصل',
        majors: '🎓 التخصصات الأكاديمية والبرامج'
    };

    // ========== عرض الطالب المطور والفاخر ==========
    if (!adminMode) {
        return React.createElement('div', { className: 'app-container' },
            React.createElement('header', { className: 'main-header' },
                React.createElement('div', { className: 'basmala-text' }, 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'),
                React.createElement('h1', { className: 'university-name' }, 'جامعة القرآن الكريم والعلوم الإسلامية'),
                React.createElement('div', { className: 'branch-badge' }, 'فرع غيل باوزير - حضرموت')
            ),

            React.createElement('div', { className: 'verse-wrapper' },
                React.createElement('div', { className: 'quranic-verse' }, '﴿وَقُل رَّبِّ زِدْنِي عِلْمًا﴾')
            ),

            React.createElement('div', { className: 'section-title-divider' }, 'الخدمات الأكاديمية السريعة'),
            
            React.createElement('div', { className: 'quick-actions-grid' },
                quickActions.map((action, index) =>
                    React.createElement('button', { key: index, className: 'action-premium-card', onClick: () => sendMessage(action.question) },
                        React.createElement('span', { className: 'card-icon' }, action.icon),
                        React.createElement('span', { className: 'card-label' }, action.label)
                    )
                )
            ),

            React.createElement('div', { className: 'chat-dashboard' },
                React.createElement('div', { className: 'chat-dashboard-header' }, 
                    React.createElement('span', { className: 'pulse-live-indicator' }),
                    React.createElement('span', null, 'المساعد الذكي التفاعلي')
                ),
                
                React.createElement('div', { className: 'chat-viewport', ref: chatRef },
                    messages.map((msg, i) =>
                        React.createElement('div', { key: i, className: `msg-bubble-wrapper ${msg.role === 'user' ? 'user-align' : 'bot-align'}` },
                            React.createElement('div', { className: `msg-bubble ${msg.role === 'user' ? 'premium-user-bubble' : 'premium-bot-bubble'}` },
                                React.createElement('p', { className: 'msg-text' }, msg.content),
                                msg.role === 'bot' && React.createElement('button', { className: 'audio-trigger', onClick: () => speakText(msg.content), title: 'استمع للنطق الصوتي' }, '🔊 استمع')
                            )
                        )
                    ),
                    loading && React.createElement('div', { className: 'msg-bubble-wrapper bot-align' },
                        React.createElement('div', { className: 'premium-bot-bubble loading-state' }, 
                            React.createElement('span', { className: 'loading-dots' }), 'جاري تحليل طلبك أستاذنا...'
                        )
                    )
                ),

                React.createElement('div', { className: 'chat-control-panel' },
                    React.createElement('button', { className: `mic-control-btn ${recording ? 'is-recording-active' : ''}`, onClick: recording ? stopRecording : startRecording, title: recording ? 'إيقاف التسجيل' : 'تحدث بالصوت' }, '🎤'),
                    React.createElement('input', {
                        className: 'chat-main-input',
                        value: input,
                        onChange: e => setInput(e.target.value),
                        onKeyPress: e => e.key === 'Enter' && sendMessage(input),
                        placeholder: recording ? '🎙️ النظام يستمع لصوتك الآن...' : '✍️ اكتب استفسارك الأكاديمي هنا...',
                        disabled: loading || recording
                    }),
                    React.createElement('button', { className: 'send-control-btn', onClick: () => sendMessage(input), disabled: loading || !input.trim() }, '◀')
                )
            ),

            React.createElement('footer', { className: 'premium-footer' }, 
                React.createElement('div', { className: 'footer-line' }),
                React.createElement('p', { className: 'copyrights' }, 'جميع الحقوق محفوظة لجامعة القرآن الكريم والعلوم الإسلامية'),
                React.createElement('p', { className: 'developer-tag' }, 'تطوير النظم الرقمية: ', React.createElement('strong', null, 'سالم التريمي'))
            )
        );
    }

    // ========== عرض لوحة الإدارة الفاخرة ==========
    return React.createElement('div', { className: 'app-container admin-theme' },
        React.createElement('header', { className: 'main-header' },
            React.createElement('div', { className: 'basmala-text' }, 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'),
            React.createElement('h1', { className: 'university-name' }, 'بوابة التحكم الرقمية والإشراف'),
            React.createElement('div', { className: 'branch-badge admin' }, 'لوحة الإدارة والحوكمة')
        ),

        React.createElement('div', { className: 'admin-main-card' },
            !adminLogged ?
                React.createElement('div', { className: 'login-secure-box' },
                    React.createElement('h2', { className: 'admin-section-title' }, '🔐 تسجيل دخول آمن للأنظمة'),
                    React.createElement('input', {
                        type: 'password',
                        className: 'admin-password-input',
                        placeholder: 'أدخل كلمة مرور النظام المشفرة',
                        value: adminPass,
                        onChange: e => setAdminPass(e.target.value),
                        onKeyPress: e => e.key === 'Enter' && loginAdmin()
                    }),
                    React.createElement('button', { className: 'admin-submit-btn', onClick: loginAdmin }, 'التحقق والصلاحية'),
                    adminMsg && React.createElement('p', { className: 'admin-status-msg error-color' }, adminMsg)
                )
            :
                React.createElement('div', { className: 'admin-dashboard-layout' },
                    React.createElement('h2', { className: 'admin-section-title' }, '⚙️ تحديث قواعد البيانات الفورية للمساعد الذكي'),
                    React.createElement('div', { className: 'admin-inputs-grid' },
                        Object.keys(fieldLabels).map(field =>
                            React.createElement('div', { key: field, className: 'input-group-wrapper' },
                                React.createElement('label', { className: 'admin-field-label' }, fieldLabels[field]),
                                React.createElement('textarea', {
                                    className: 'admin-styled-textarea',
                                    value: adminData[field],
                                    onChange: e => setAdminData({ ...adminData, [field]: e.target.value }),
                                    style: { height: field === 'majors' ? '150px' : '90px' }
                                })
                            )
                        )
                    ),
                    
                    React.createElement('div', { className: 'admin-action-bar' },
                        React.createElement('button', { className: 'admin-save-btn', onClick: saveAdminData }, '💾 حفظ كافة التعديلات وتحديث النظام الفوري'),
                        adminMsg && React.createElement('p', { className: `admin-status-msg ${adminMsg.includes('✅') ? 'success-color' : 'error-color'}` }, adminMsg)
                    ),

                    stats && React.createElement('div', { className: 'analytics-panel' },
                        React.createElement('h3', { className: 'analytics-title' }, '📊 لوحة القياس والإحصائيات الفورية'),
                        React.createElement('div', { className: 'analytics-grid' },
                            React.createElement('div', { className: 'analytic-box' }, 
                                React.createElement('span', { className: 'analytic-number' }, stats.total),
                                React.createElement('span', { className: 'analytic-label' }, 'إجمالي الاستفسارات المستلمة')
                            ),
                            React.createElement('div', { className: 'analytic-box' }, 
                                React.createElement('span', { className: 'analytic-number' }, stats.today),
                                React.createElement('span', { className: 'analytic-label' }, 'استفسارات اليوم الحالية')
                            )
                        )
                    ),

                    React.createElement('button', {
                        className: 'admin-exit-btn',
                        onClick: () => { setAdminMode(false); setAdminLogged(false); setAdminPass(''); }
                    }, '🔙 تسجيل الخروج والعودة لشاشة الطلاب')
                )
        ),

        React.createElement('footer', { className: 'premium-footer' }, 
            React.createElement('p', { className: 'developer-tag' }, 'تطوير النظم الرقمية: ', React.createElement('strong', null, 'سالم التريمي'))
        )
    );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
