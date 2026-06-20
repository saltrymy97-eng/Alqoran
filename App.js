const { useState, useRef, useEffect } = React;

function App() {
    const [messages, setMessages] = useState([
        { role: 'bot', content: 'مرحباً بك في المساعد الذكي لجامعة القرآن الكريم - فرع غيل باوزير. تفضل بطرح استفسارك.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatRef = useRef(null);

    useEffect(() => {
        if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }, [messages]);

    const sendMessage = async (text) => {
        if (!text || !text.trim() || loading) return;
        const q = text.trim();
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
            setMessages(prev => [...prev, { role: 'bot', content: data.reply || 'عذراً، حدث خطأ.' }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'bot', content: '⚠️ خطأ في الاتصال بالخادم.' }]);
        }
        setLoading(false);
    };

    const quickActions = [
        { icon: '📅', label: 'الجداول', question: 'أريد الاستفسار عن جداول المحاضرات' },
        { icon: '📝', label: 'الامتحانات', question: 'ما هي مواعيد وترتيبات الامتحانات؟' },
        { icon: '📞', label: 'التواصل', question: 'كيف يمكنني التواصل مع إدارة الفرع؟' },
        { icon: '🎓', label: 'التخصصات', question: 'ما هي التخصصات الأكاديمية المتاحة؟' }
    ];

    return React.createElement('div', { className: 'container' },
        React.createElement('div', { className: 'basmala' }, 'بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ'),
        React.createElement('div', { className: 'uni-title' }, '🕌 جامعة القرآن الكريم', React.createElement('br'), 'والعلوم الإسلامية'),
        React.createElement('div', { className: 'branch-title' }, '✦ فرع غيل باوزير - حضرموت ✦'),
        React.createElement('div', { className: 'btn-row' },
            quickActions.map((action, i) =>
                React.createElement('button', { key: i, className: 'btn', onClick: () => sendMessage(action.question) }, action.icon, ' ', action.label)
            )
        ),
        React.createElement('div', { className: 'quran-verse' }, '﴿وَقُل رَّبِّ زِدْنِي عِلْمًا﴾'),
        React.createElement('div', { className: 'chat-box', ref: chatRef },
            messages.map((msg, i) =>
                React.createElement('div', { key: i, className: 'chat-msg ' + (msg.role === 'user' ? 'user-msg' : 'bot-msg') },
                    (msg.role === 'user' ? '🧑‍🎓 ' : '🤖 '), msg.content
                )
            ),
            loading ? React.createElement('div', { className: 'chat-msg bot-msg' }, '⏳ جاري الرد...') : null
        ),
        React.createElement('div', { className: 'input-row' },
            React.createElement('input', { value: input, onChange: (e) => setInput(e.target.value), onKeyPress: (e) => e.key === 'Enter' && sendMessage(input), placeholder: '✍️ اكتب سؤالك هنا...', disabled: loading }),
            React.createElement('button', { className: 'send-btn', onClick: () => sendMessage(input), disabled: loading }, '➤')
        ),
        React.createElement('div', { className: 'footer' }, 'المطور: سالم التريمي')
    );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
