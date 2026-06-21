import { Redis } from '@upstash/redis';

// إعداد الاتصال بقاعدة البيانات السحابية
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST') {
        const { password, question, ...data } = req.body;

        // 1. بوابة الإدارة لحفظ البيانات
        if (password === 'admin123') {
            if (Object.keys(data).length > 0) {
                await redis.set('university_data', data);
                return res.status(200).json({ success: true, message: '✅ تم تحديث البيانات بنجاح.' });
            }
            return res.status(200).json({ success: true, status: 'authenticated' });
        }

        // 2. محرك المحادثة الاحترافي (نظام ذكاء اصطناعي تفاعلي)
        if (question) {
            try {
                // جلب البيانات من Redis
                const universityData = await redis.get('university_data') || {};
                
                // البرومبت الاحترافي (هندسة التفكير)
                const systemInstruction = `
                أنت المساعد الذكي "سالم" لجامعة القرآن الكريم - فرع غيل باوزير. دورك تقديم استشارات أكاديمية دقيقة وموثوقة.

                [استراتيجية العمل - Chain of Thought]:
                1. التحليل: افهم القصد من سؤال الطالب بدقة.
                2. البحث: ابحث في البيانات المتاحة أدناه حصراً عن المطابقة.
                3. التنفيذ: 
                   - ابدأ بفقرة ترحيبية مهنية مختصرة.
                   - اعرض المعلومات في نقاط مركزة (Bullet points) بحد أقصى 3 نقاط للإجابة.
                   - اختم بجملة توجيهية (Call to Action) لتشجيع الطالب على الاستفسار عن تفاصيل أخرى.
                4. التصفية: احذف أي رموز تقنية، شرطات، أو تكرار. اجعل اللغة العربية فصيحة ومناسبة للنطق الصوتي.

                [قاعدة البيانات الرسمية]:
                ${JSON.stringify(universityData, null, 2)}

                [تنبيه هام]: 
                - إذا لم تتوفر المعلومة في البيانات، اعتذر بكياسة ووجه الطالب لمراجعة إدارة الفرع.
                - حافظ على "شخصية المؤسسة" (وقار، علم، احترافية).
                `;

                const apiKey = process.env.GROQ_API_KEY;
                if (!apiKey) {
                    return res.status(500).json({ reply: "⚠️ خطأ في النظام: مفتاح API غير مفعل." });
                }

                // الاتصال بـ Groq API باستخدام نموذج llama-3.1-8b-instant السريع
                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant',
                        messages: [
                            { role: 'system', content: systemInstruction },
                            { role: 'user', content: question.trim() }
                        ],
                        temperature: 0.2, // دقة عالية ومنطقية
                        max_tokens: 500
                    })
                });

                const groqData = await groqResponse.json();
                
                if (groqData.error) {
                    return res.status(200).json({ reply: `⚠️ تنبيه النظام: ${groqData.error.message}` });
                }

                let reply = groqData.choices?.[0]?.message?.content || "عذراً، لم أستطع فهم استفسارك، يرجى صياغته بشكل أوضح.";

                // تنظيف نهائي للنص ليصبح جاهزاً للنطق والشاشة
                reply = reply.replace(/[\-\*\#]{2,}/g, '').trim();

                return res.status(200).json({ reply });

            } catch (error) {
                return res.status(200).json({ reply: "⚠️ حدث خطأ تقني، نعتذر منك." });
            }
        }
        
        return res.status(400).json({ error: 'طلب غير صالح.' });
    }

    // 3. بوابة جلب البيانات
    if (req.method === 'GET') {
        const data = await redis.get('university_data');
        return res.status(200).json(data || {});
    }
}
