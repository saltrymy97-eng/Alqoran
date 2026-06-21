import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { password, question, ...data } = req.body;

        if (password === 'admin123') {
            if (Object.keys(data).length > 0) {
                await redis.set('university_data', data);
                return res.json({ success: true, message: '✅ تم الحفظ في السحابة بنجاح' });
            }
            return res.json({ success: true, status: 'authenticated' });
        }

        if (question) {
            let step = "البدء";
            try {
                // 1. جلب البيانات من Upstash
                step = "قراءة بيانات السحابة (Upstash)";
                const universityData = await redis.get('university_data') || {};
                
                const systemPrompt = `
                أنت المساعد الأكاديمي الرقمي لجامعة القرآن الكريم - فرع غيل باوزير. أجب باختصار من البيانات المتاحة فقط:
                التعريف: ${universityData.info || 'غير متوفر'}
                الجداول: ${universityData.schedules || 'غير متوفر'}
                الامتحانات: ${universityData.exams || 'غير متوفر'}
                الرسوم: ${universityData.fees || 'غير متوفر'}
                التواصل: ${universityData.contacts || 'غير متوفر'}
                التخصصات: ${universityData.majors || 'غير متوفر'}
                `;

                // 2. الاتصال بـ Groq
                step = "الاتصال بسيرفر Groq API";
                const apiKey = process.env.GROQ_API_KEY;
                if (!apiKey) {
                    return res.json({ reply: "⚠️ خطأ: مفتاح GROQ_API_KEY غير مضاف في Vercel." });
                }

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
                            { role: 'user', content: question }
                        ],
                        temperature: 0.3,
                        max_tokens: 800
                    })
                });

                step = "تحليل رد سيرفر Groq";
                // التحقق من الحجب الجغرافي أو الرفض
                if (groqResponse.status === 403 || groqResponse.status === 401) {
                    return res.json({ reply: `⚠️ تم رفض الطلب من Groq (Status: ${groqResponse.status}). على الأرجح بسبب الحظر الجغرافي للمنطقة.` });
                }

                const groqData = await groqResponse.json();
                
                if (groqData.error) {
                    return res.json({ reply: `⚠️ خطأ من Groq: ${groqData.error.message}` });
                }

                let reply = groqData.choices?.[0]?.message?.content;
                if (!reply) {
                    return res.json({ reply: "عذراً، لم أتمكن من استخلاص الإجابة." });
                }

                return res.json({ reply: reply.trim() });

            } catch (error) {
                // هنا سيوضح لك النظام في أي خطوة انهار الكود بالضبط وما هو السبب
                return res.json({ reply: `⚠️ فشل النظام عند خطوة [${step}]. السبب: ${error.message}` });
            }
        }
        
        return res.status(400).json({ error: 'طلب غير صالح' });
    }

    if (req.method === 'GET') {
        const data = await redis.get('university_data');
        return res.json(data || {});
    }
}
