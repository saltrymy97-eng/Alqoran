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
    
    // المرجع الخاص بميزة التعرف على الصوت
    const recognitionRef = useRef(null);

    const ADMIN_SECRET = 'ادارة جامعة القران الكريم وعلومه';

    useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

    // دالة إرسال الرسائل إلى السحابة - معدلة لدعم منطق النطق الذكي والمنفصل
    const sendMessage = async (text, shouldSpeak = false) => {
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
            const reply = data.reply || 'عذراً، لا توجد معلومة محددة حول هذا الاستفسار حالياً.';
            setMessages(prev => [...prev, { role: 'bot', content: reply }]);
            
            // 🎙️ ينطق أوتوماتيكياً فقط إذا جاء الطلب من الميكروفون (shouldSpeak === true)
            if (shouldSpeak) {
                speakText(reply);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'bot', content: '⚠️ خطأ في الاتصال بالخادم الرقمي السحابي.' }]);
        }
        setLoading(false);
    };

    // دالة نطق النص - مُحدثة لتعزيز اختيار طبقة صوت رجل فصيح وتعديل الحدة
    const speakText = (text) => {
        if (!window.speechSynthesis || !text) return;
        
        // إيقاف أي قراءة صوتية جارية فوراً لمنع التداخل
        window.speechSynthesis.cancel();
        
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ar-SA';
        u.rate = 0.95; // سرعة متزنة ووقورة
        u.pitch = 0.85; // تضخيم نبرة الصوت لتبدو أكثر رجولية كإجراء أمان مدمج
        
        // جلب قائمة الأصوات المتاحة في المتصفح والبحث الموسع عن اسم صوت رجل
        const voices = window.speechSynthesis.getVoices();
        let maleVoice = voices.find(v => 
            v.lang.startsWith('ar') && 
            (v.name.toLowerCase().includes('male') || 
             v.name.includes('Naeem') || 
             v.name.includes('Riyadh') || 
             v.name.includes('Zayd') || 
             v.name.includes('Hamed') || 
             v.name.includes('Maged'))
        );
        
        // إذا لم يعثر على اسم محدد صراحة للرجل، يفضل سحب محركات قوقل الفصيحة المدمجة
        if (!maleVoice) {
            maleVoice = voices.find(v => v.lang.startsWith('ar') && (v.name.includes('Natural') || v.name.includes('Google')));
        }
        
        if (maleVoice) {
            u.voice = maleVoice;
        } else {
            const defaultAr = voices.find(v => v.lang.startsWith('ar'));
            if (defaultAr) u.voice = defaultAr;
        }

        window.speechSynthesis.speak(u);
    };

    // البدء بالتسجيل الصوتي الفوري والمجاني
    const startRecording = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("⚠️ متصفحك الحالي لا يدعم ميزة التعرف على الصوت الافتراضية. جرب متصفح جوجل كروم.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-SA'; // ضبط اللغة للعربية
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setRecording(true);
        };

        recognition.onerror = (e) => {
            console.error(e);
            setRecording(false);
        };

        recognition.onend = () => {
            setRecording(false);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (transcript && transcript.trim() !== "") {
                // 🚀 تمرير القيمة true هنا ليقوم السيرفر بالنطق الصوتي التلقائي عند استخدام الميكروفون
                sendMessage(transcript, true); 
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    };

    // إيقاف التسجيل
    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setRecording(false);
        }
    };

    const loginAdmin = async () => {
        const cleanedPass = adminPass.trim();
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
            
            if (res.ok && data.success) {
                setAdminLogged(true);
                setAdminMsg('');
                loadAdminData();
            } else {
                setAdminMsg(data.error || '❌ كلمة مرور غير صحيحة');
            }
        } catch (error) {
            setAdminMsg('⚠️ خطأ برمجى في الاتصال بقاعدة البيانات السحابية');
        }
    };

    const loadAdminData = async () => {
        try {
            const res = await fetch('/api/chat');
            const data = await res.json();
            
            // فك كائن البيانات وجلب البيانات الأساسية من الحقل الجامعي المخزن في السيرفر الجديد
            const uData = data.university_data || data || {};
            setAdminData({
                info: uData.info || '',
                schedules: uData.schedules || '',
                exams: uData.exams || '',
                fees: uData.fees || '',
                contacts: uData.contacts || '',
                majors: uData.majors || ''
            });
            
            // تعيين الإحصائيات الفورية القادمة من محرك السيرفر
            if (data.stats) setStats(data.stats);
        } catch(e) {
            setAdminMsg('⚠️ فشل في جلب البيانات من السحابة');
        }
    };

    const saveAdminData = async () => {
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: adminPass.trim(), ...adminData })
            });
            const result = await res.json();
            setAdminMsg(res.ok ? (result.message || '✅ تم حفظ وتحديث البيانات بنجاح') : '❌ خطأ في الحفظ');
        } catch(e) {
            setAdminMsg('❌ فشل الاتصال بالسيرفر أثناء الحفظ');
        }
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

    // ========== أولاً: عرض واجهة الطلاب التفاعلية ==========
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
                    // عند الضغط على الأزرار السريعة يكتفي بالكتابة فقط وصمت تلقائي للأمان المكتبي والإداري
                    React.createElement('button', { key: index, className: 'action-premium-card', onClick: () => sendMessage(action.question, false) },
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
                                msg.role === 'bot' && React.createElement('button', { className: 'audio-trigger', onClick: () => speakText(msg.content), title: 'استمع للنطق الصوتي للرد' }, '🔊 استمع')
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
                        // عند الضغط على الـ Enter يكتفي بالكتابة فقط وصمت تلقائي للأمان المكتبي والإداري
                        onKeyPress: e => e.key === 'Enter' && sendMessage(input, false),
                        placeholder: recording ? '🎙️ النظام يستمع لصوتك الآن...' : '✍️ اكتب استفسارك الأكاديمي هنا...',
                        disabled: loading || recording
                    }),
                    React.createElement('button', { className: 'send-control-btn', onClick: () => sendMessage(input, false), disabled: loading || !input.trim() }, '◀')
                )
            ),

            React.createElement('footer', { className: 'premium-footer' }, 
                React.createElement('div', { className: 'footer-line' }),
                React.createElement('p', { className: 'copyrights' }, 'جميع الحقوق محفوظة لجامعة القرآن الكريم والعلوم الإسلامية'),
                React.createElement('p', { className: 'developer-tag' }, 'تطوير النظم الرقمية: ', React.createElement('strong', null, 'سالم التريمي'))
            )
        );
    }

    // ========== ثانياً: لوحة التحكم الرقمية للادارة ==========
    return React.createElement('div', { className: 'app-container admin-theme' },
        React.createElement('header', { className: 'main-header' },
            React.createElement('div', { className: 'basmala-text' }, 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'),
            React.createElement('h1', { className: 'university-name' }, 'بوابة التحكم الرقمية والإشراف'),
            React.createElement('div', { className: 'branch-badge admin' }, 'لوحة الإدارة والحوكمة الإحصائية')
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
                        onKeyPress: e => e.key === 'Enter' && loginAdmin(),
                        style: { direction: 'ltr', textAlign: 'left' }
                    }),
                    React.createElement('button', { className: 'admin-submit-btn', onClick: loginAdmin }, 'التحقق والصلاحية'),
                    adminMsg && React.createElement('p', { className: 'admin-status-msg error-color' }, adminMsg)
                )
            :
                React.createElement('div', { className: 'admin-dashboard-layout' },
                    
                    stats ? React.createElement('div', { className: 'analytics-panel' },
                        React.createElement('h3', { className: 'analytics-title' }, '📊 رصد الأداء الإحصائي وتحليل البيانات الفوري'),
                        
                        React.createElement('div', { className: 'analytics-grid' },
                            React.createElement('div', { className: 'analytic-box' }, 
                                React.createElement('span', { className: 'analytic-big-icon' }, '💬'),
                                React.createElement('span', { className: 'analytic-number' }, stats.total || 0),
                                React.createElement('span', { className: 'analytic-label' }, 'إجمالي الأسئلة المستلمة')
                            ),
                            React.createElement('div', { className: 'analytic-box' }, 
                                React.createElement('span', { className: 'analytic-big-icon' }, '⚡'),
                                React.createElement('span', { className: 'analytic-number' }, stats.today || 0),
                                React.createElement('span', { className: 'analytic-label' }, 'استفسارات اليوم الحالية')
                            )
                        ),
                        
                        React.createElement('div', { className: 'categories-panel' },
                            React.createElement('h4', { className: 'categories-title' }, '🗂️ توزيع الاستفسارات حسب الفئات الأكاديمية:'),
                            React.createElement('div', { className: 'categories-list' },
                                [
                                    { name: 'الجداول الدراسية والمحاضرات', icon: '📚', key: 'schedules' },
                                    { name: 'الامتحانات والاختبارات', icon: '📝', key: 'exams' },
                                    { name: 'الشؤون المالية والرسوم', icon: '💰', key: 'fees' },
                                    { name: 'التخصصات والقبول والتسجيل', icon: '🎓', key: 'majors' },
                                    { name: 'معلومات عامة وتعريفية', icon: '📋', key: 'info' }
                                ].map((cat, idx) => 
                                    React.createElement('div', { key: idx, className: 'category-row' },
                                        React.createElement('div', { className: 'category-info' },
                                            React.createElement('span', null, cat.icon),
                                            React.createElement('span', null, cat.name)
                                        ),
                                        React.createElement('span', { className: 'category-badge' }, `${stats.categories?.[cat.key] || 0} استفسار`)
                                    )
                                )
                            )
                        ),

                        stats.latest_questions && stats.latest_questions.length > 0 ? React.createElement('div', { className: 'top-queries-container' },
                            React.createElement('h4', { className: 'top-queries-title' }, '🔝 آخر 5 أسئلة تم طرحها من قبل الطلاب حالياً:'),
                            
                            React.createElement('div', { className: 'chart-container', style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
                                stats.latest_questions.map((item, index) => {
                                    return React.createElement('div', { key: index, className: 'chart-row', style: { background: '#ffffff', padding: '10px', borderRadius: '6px', borderRight: '4px solid #1a3a5f', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } },
                                        React.createElement('div', { className: 'chart-label-group', style: { display: 'flex', justifyContent: 'between', width: '100%' } },
                                            React.createElement('span', { className: 'chart-question-text', style: { fontWeight: 'bold', color: '#2d3748' } }, `📌 ${item.question}`),
                                            React.createElement('span', { className: 'chart-count-badge', style: { fontSize: '11px', color: '#718096', background: '#edf2f7', padding: '2px 8px', borderRadius: '10px' } }, `فئة: ${item.category || 'عامة'}`)
                                        )
                                    );
                                })
                            )
                        ) : null
                    ) : null,

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
