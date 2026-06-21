import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');
const LOGS_FILE = path.join(process.cwd(), 'logs.json');

function loadData() {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    return { info: '', schedules: '', exams: '', fees: '', contacts: '', majors: '' };
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function loadLogs() {
    if (fs.existsSync(LOGS_FILE)) return JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
    return [];
}

function saveLog(question, category) {
    const logs = loadLogs();
    logs.push({ question, category, timestamp: new Date().toISOString() });
    if (logs.length > 1000) logs.splice(0, logs.length - 1000);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

function getStats() {
    const logs = loadLogs();
    if (!logs.length) return { total: 0, today: 0, top: [], cats: {} };
    const today = new Date().toISOString().split('T')[0];
    const todayCount = logs.filter(l => l.timestamp.startsWith(today)).length;
    const qCounts = {}, catCounts = {};
    logs.forEach(l => {
        qCounts[l.question] = (qCounts[l.question] || 0) + 1;
        catCounts[l.category] = (catCounts[l.category] || 0) + 1;
    });
    const sorted = Object.entries(qCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    return { total: logs.length, today: todayCount, top: sorted.map(([q, c]) => ({ question: q, count: c })), cats: catCounts };
}

function smartClassify(q) {
    const lower = q.toLowerCase();
    const keywords = {
        schedules: ['جدول', 'جداول', 'محاضرات', 'مواد', 'مستوى', 'دوام', 'حضور', 'غياب', 'مدرس'],
        exams: ['امتحان', 'اختبار', 'نتيجة', 'درجات', 'معدل', 'نجاح', 'رسوب'],
        fees: ['رسوم', 'تكاليف', 'مالية', 'دفع', 'قسط', 'سداد', 'منحة', 'سعر'],
        contacts: ['تواصل', 'رقم', 'اتصال', 'ايميل', 'بريد', 'عنوان', 'موقع', 'هاتف', 'جوال'],
        majors: ['تخصص', 'قسم', 'كلية', 'بكالوريوس', 'ماجستير', 'دراسة']
    };
    for (const [cat, words] of Object.entries(keywords)) {
        if (words.some(w => lower.includes(w))) return cat;
    }
    return 'info';
}

const SYSTEM_PROMPT = `أنت موظف استقبال محترف في جامعة القرآن الكريم والعلوم الإسلامية - فرع غيل باوزير بحضرموت. أنت خبير في شؤون الجامعة، تجيب بدقة ووضوح. تتحدث العربية الفصحى الميسرة بلمسة حضرمية لطيفة.

المعلومات المتاحة:
{context}

تعليمات:
- لا تستخدم الإيموجي. لا تكرر التحية. أجب مباشرة. كن موجزاً ومفيداً.
- إذا لم تجد المعلومة، قل: 'عذراً، لا تتوفر لدي بيانات حالياً.'
- لا تخترع معلومات.`;

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const data = loadData();
        const stats = getStats();
        return res.json({ ...data, stats });
    }

    if (req.method === 'POST') {
        const { question, password, info, schedules, exams, fees, contacts, majors } = req.body;

        // لوحة الإدارة
        if (password) {
            if (password !== process.env.ADMIN_PASSWORD) return res.status(403).json({ error: 'كلمة مرور غير صحيحة' });
            saveData({ info, schedules, exams, fees, contacts, majors });
            return res.json({ success: true });
        }

        // الدردشة
        if (!question) return res.json({ reply: 'يرجى كتابة سؤال.' });
        const category = smartClassify(question);
        const data = loadData();
        const context = data[category] || Object.values(data).filter(v => v).join('\n\n');
        if (!context.trim()) return res.json({ reply: 'عذراً، لا تتوفر لدي بيانات حالياً.' });
        const prompt = SYSTEM_PROMPT.replace('{context}', context.substring(0, 2000));

        try {
            const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
                body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'system', content: prompt }, { role: 'user', content: question }], temperature: 0.3, max_tokens: 400 })
            });
            const j = await r.json();
            const reply = j.choices[0].message.content;
            saveLog(question, category);
            return res.json({ reply });
        } catch (e) {
            return res.json({ reply: '⚠️ عذراً، حدث خطأ تقني.' });
        }
    }

    return res.status(405).json({ error: 'خطأ' });
}
