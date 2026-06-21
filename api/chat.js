import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    // 1. معالجة طلبات الإدارة (تسجيل الدخول أو الحفظ)
    if (req.method === 'POST') {
        const { password, question, ...data } = req.body;

        if (password === 'admin123') {
            if (Object.keys(data).length > 0) {
                await redis.set('university_data', data);
                return res.json({ success: true, message: '✅ تم الحفظ في السحابة بنجاح' });
            }
            return res.json({ success: true, status: 'authenticated' });
        }

        // 2. معالجة أسئلة الطلاب عبر Groq (Llama 3 8B)
        if (question) {
            try {
                // جلب بيانات الجامعة من سحابة Upstash
                const universityData = await redis.get('university_data') || {};
                
                // صياغة النظام والبيانات المرجعية (System Prompt)
                const systemPrompt = `
                أنت المساعد الأكاديمي الرقمي الذكي لجامعة القرآن الكريم والعلوم الإسلامية - فرع غيل باوزير بحضرموت.
                مهمتك هي الإجابة على استفسارات الطلاب بدقة ولطافة وبأسلوب حواري منظم بناءً على البيانات الرسمية المتاحة لديك فقط.
                إذا لم تكن المعلومة متوفرة في البيانات أدناه، أخبر الطالب بلطف بزيارة إدارة الفرع بغيل باوزير.
                تجنب تماماً طباعة الرموز البرمجية مثل "---" أو الحقول الجافة في ردك، واجعل النص منسقاً ومريحاً للقراءة والنطق الصوتي.

                بيانات الجامعة الحالية المعتمدة:
                - التعريف بالفرع: ${universityData.info || 'غير متوفر حالياً'}
                - الجداول الدراسية والمحاضرات: ${universityData.schedules || 'غير متوفر حالياً'}
                - مواعيد الامتحانات والاختبارات: ${universityData.exams || 'غير متوفر حالياً'}
                - الرسوم المالية والتقسيط: ${universityData.fees || 'غير متوفر حالياً'}
                - قنوات التواصل والاتصال: ${universityData.contacts || 'غير متوفر حالياً'}
                - التخصصات الأكاديمية والبرامج: ${universityData.majors || 'غير متوفر حالياً'}
                `;

                const apiKey = process.env.GROQ_API_KEY;
                if (!apiKey) {
                    return res.json({ reply: "⚠️ عذراً، محرك الذكاء الاصطناعي (Groq) غير مفعل حالياً في الإعدادات." });
                }

                // الاتصال بـ Groq API وتشغيل نموذج Llama 3 8B
                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama3-8b-8192', // يمكنك كتابة 'llama3-70b-8192' إذا كنت تفضل النسخة الأكبر
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: question }
                        ],
                        temperature: 0.3, // درجة حرارة منخفضة لضمان الالتزام بالبيانات وعدم التأليف
                        max_tokens: 800
                    })
                });

                const groqData = await groqResponse.json();
                let reply = groqData.choices?.[0]?.message?.content;

                if (!reply) {
                    reply = "عذراً، واجه النظام صعوبة في معالجة الإجابة حالياً. يرجى المحاولة مجدداً.";
                }

                return res.json({ reply: reply.trim() });

            } catch (error) {
                console.error(error);
                return res.json({ reply: "⚠️ عذراً، واجه السيرفر مشكلة أثناء الاتصال بمحرك الذكاء الاصطناعي." });
            }
        }
        
        return res.status(400).json({ error: 'طلب غير صالح' });
    }

    if (req.method === 'GET') {
        const data = await redis.get('university_data');
        return res.json(data || {});
    }
}
