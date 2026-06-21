import { Redis } from '@upstash/redis';

// إعداد الاتصال بقاعدة البيانات السحابية Upstash
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ==========================================
// 1. نظام التصنيف الذكي (Smart Classification Engine)
// ==========================================
function smartClassify(question) {
    const q = question.toLowerCase();
    
    if ((q.includes("تخصص") || q.includes("قسم") || q.includes("كلية")) && 
        (q.includes("رسوم") || q.includes("سعر") || q.includes("تكلفة") || q.includes("تكاليف"))) {
        return "majors";
    }
    if (q.includes("رسوم") || q.includes("تكاليف") || q.includes("مالية") || q.includes("دفع") || q.includes("قسط") || q.includes("سداد") || q.includes("منحة") || q.includes("سعر")) {
        return "fees";
    }
    if (q.includes("امتحان") || q.includes("اختبار") || q.includes("نتيجة") || q.includes("درجات") || q.includes("معدل") || q.includes("نجاح") || q.includes("رسوب")) {
        return "exams";
    }
    if (q.includes("جدول") || q.includes("جداول") || q.includes("جدوال") || q.includes("مواعيد") || q.includes("محاضرة") || q.includes("دوام") || q.includes("حضور") || q.includes("غياب")) {
        return "schedules";
    }
    if (q.includes("تواصل") || q.includes("رقم") || q.includes("اتصال") || q.includes("ايميل") || q.includes("عنوان") || q.includes("موقع") || q.includes("هاتف") || q.includes("أين") || q.includes("وين")) {
        return "contacts";
    }
    if (q.includes("تخصص") || q.includes("قسم") || q.includes("كلية") || q.includes("بكالوريوس") || q.includes("دراسة")) {
        return "majors";
    }
    
    return "info"; // التغيير هنا: العودة بـ "info" كقيمة افتراضية للتسجيل بدلاً من null
}

// دالة تخزين السجلات وحفظ اللوغات في الـ Redis
async function logQuestion(question, category) {
    try {
        const logEntry = {
            question: question.trim(),
            category: category,
            timestamp: new Date().toISOString()
        };
        // دفع السجل إلى قائمة ثابتة بداخل Redis باسم chat_logs
        await redis.lpush('chat_logs', JSON.stringify(logEntry));
        // تقليم القائمة للحفاظ على آخر 1000 استفسار فقط من الطلاب
        await redis.ltrim('chat_logs', 0, 999);
    } catch (e) {
        console.error("Failed to log question:", e);
    }
}

export default async function handler(req, res) {
    // تعيين الرؤوس للاحترافية والأمان
    res.setHeader('Content-Type', 'application/json');

    // ==========================================
    // معالجة طلبات الـ POST (الأسئلة وحفظ البيانات)
    // ==========================================
    if (req.method === 'POST') {
        const { password, question, ...data } = req.body;

        // ==========================================
        // 2. بوابة التحكم والإشراف (Admin Gateway)
        // ==========================================
        if (password === 'admin123') {
            if (Object.keys(data).length > 0) {
                await redis.set('university_data', data);
                return res.status(200).json({ success: true, message: '✅ تم تحديث مصفوفة البيانات بنجاح.' });
            }
            return res.status(200).json({ success: true, status: 'authenticated' });
        }

        // ==========================================
        // 3. محرك الاستجابة الذكي للطلاب (AI Core)
        // ==========================================
        if (question) {
            try {
                // تحميل بيانات الجامعة من السحابة
                const universityData = await redis.get('university_data') || {};
                
                // تحديد الفئة وتسجيل السؤال فورياً بداخل الـ Logs
                const category = smartClassify(question);
                await logQuestion(question, category);
                
                let context = "";

                if (category && universityData[category] && universityData[category].trim() !== "") {
                    context = universityData[category];
                } else {
                    // دمج الحقول المتاحة إذا كان الحقل المطلوب فارغاً
                    context = Object.entries(universityData)
                        .filter(([_, value]) => value && value.trim() !== "")
                        .map(([key, value]) => `${key}: ${value}`)
                        .join("\n\n");
                }

                // الحماية ضد البيانات الفارغة
                if (!context || context.trim() === "") {
                    return res.status(200).json({ reply: "عذراً، لا تتوفر لدي بيانات حالياً. يرجى التواصل مع إدارة الجامعة." });
                }

                // شخصية المساعد الاحترافية والصارمة المأخوذة من قالبك المُحسن
                const systemPrompt = `أنت موظف استقبال محترف في جامعة القرآن الكريم والعلوم الإسلامية - فرع غيل باوزير بحضرموت.
أنت خبير في شؤون الجامعة، تجيب بدقة ووضوح. تتحدث العربية الفصحى الميسرة بلمسة حضرمية لطيفة.

[المعلومات المتاحة للجمهور]
${context.substring(0, 2500)}

[تعليمات عامة وملزمة]
- لا تستخدم الإيموجي نهائياً.
- لا تكرر التحية بعد الرد الأول.
- أجب مباشرة دون استخدام عبارات مثل "بناءً على المعلومات المتاحة".
- كن موجزاً ومفيداً جداً. لا تذكر معلومات لا علاقة لها بالسؤال.
- إذا كانت المعلومات فارغة أو لا تحتوي على إجابة السؤال، قل بالضبط: 'عذراً، لا تتوفر لدي بيانات حالياً. يرجى التواصل مع إدارة الجامعة.'
- لا تخترع أي معلومات. لا تخمن. لا تضف شيئاً من عندك.
- لا تكرر أبداً هيكل القالب أو الرموز مثل [INFO] أو الحقول البرمجية.

[آلية الرد حسب نوع السؤال]
1. سؤال عن جميع التخصصات: قدم قائمة بأسماء التخصصات فقط، بدون تفاصيل.
2. سؤال عن تفاصيل تخصص حدد: (الرسوم: اذكر الرقم فقط | المدة: اذكر المدة فقط | الوصف: قدم وصفاً مختصراً من 2-3 جمل).
3. أسئلة عن الرسوم، الامتحانات، الجداول، أو التواصل: استخرج المعلومة المطلوبة من القسم المناسب وأجب بها فقط.
4. سؤال خارج نطاق الجامعة: قل: "أنا مختص بشؤون الجامعة فقط. كيف يمكنني مساعدتك في أمور الدراسة؟"
5. شكر أو تحية: رد باختصار: "العفو"، "وعليكم السلام"، "في خدمتكم". لا تبدأ الرد بتحية جديدة.`;

                const apiKey = process.env.GROQ_API_KEY;
                if (!apiKey) {
                    return res.status(500).json({ reply: "⚠️ النظام يعمل في وضع عدم الاتصال. تأكد من إعداد مفتاح GROQ_API_KEY." });
                }

                // استدعاء سيرفر المعالجة لـ Groq
                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: question.trim() }
                        ],
                        temperature: 0.3,
                        max_tokens: 400
                    })
                });

                if (!groqResponse.ok) {
                    throw new Error(`استجابة السيرفر غير مستقرة: ${groqResponse.status}`);
                }

                const groqData = await groqResponse.json();
                let answer = groqData.choices?.[0]?.message?.content;

                if (!answer || answer.trim() === "") {
                    return res.status(200).json({ reply: "عذراً، لا تتوفر لدي بيانات حالياً. يرجى التواصل مع إدارة الجامعة." });
                }

                // تنظيف أخير للنصوص من أي شرطات أو نجوم تقنية لضمان التوافق الصوتي
                answer = answer.replace(/[\-\*\_]{2,}/g, '').trim();

                return res.status(200).json({ reply: answer });

            } catch (error) {
                console.error("AI Server Error:", error);
                return res.status(200).json({ reply: `⚠️ عذراً، حدث خطأ تقني: ${error.message}` });
            }
        }
        
        return res.status(400).json({ error: 'طلب غير صالح، ينقصه نص الاستفسار.' });
    }

    // ==========================================
    // 4. بوابة جلب البيانات والإحصائيات (GET Method)
    // ==========================================
    if (req.method === 'GET') {
        try {
            // جلب بيانات الجامعة الأساسية
            const data = await redis.get('university_data') || {};
            
            // سحب لوغات المحادثات من Redis لمعالجتها فورياً
            const rawLogs = await redis.lrange('chat_logs', 0, -1) || [];
            const logs = rawLogs.map(l => typeof l === 'string' ? JSON.parse(l) : l);
            
            // حساب إجمالي الاستفسارات
            const totalQuestions = logs.length;
            
            // حساب استفسارات اليوم الحالي فقط
            const todayStr = new Date().toISOString().split('T')[0];
            const todayQuestions = logs.filter(l => l.timestamp && l.timestamp.startsWith(todayStr)).length;

            // حساب الإحصائيات حسب الفئات (التصنيفات)
            const categoryStats = {};
            logs.forEach(l => {
                const cat = l.category || 'info';
                categoryStats[cat] = (categoryStats[cat] || 0) + 1;
            });

            // إرجاع كائن مدمج بالبيانات الرسمية والإحصائيات الخاصة بلوحة التحكم
            return res.status(200).json({
                university_data: data,
                stats: {
                    total: totalQuestions,
                    today: todayQuestions,
                    categories: categoryStats,
                    latest_questions: logs.slice(0, 5) // مصفوفة تعرض آخر 5 أسئلة طرحها الطلاب
                }
            });
        } catch (error) {
            return res.status(500).json({ error: 'فشل جلب البيانات والتحليلات من السحابة.' });
        }
    }
}
