import { Redis } from '@upstash/redis';

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

        // 2. معالجة أسئلة الطلاب بذكاء واحترافية (باستخدام نموذج 8B)
        if (question) {
            try {
                const universityData = await redis.get('university_data') || {};
                
                // هندسة أوامر صارمة للحصول على إجابات مختصرة ومرتبة
                const systemInstruction = `
                أنت "المساعد الأكاديمي الرقمي الذكي" لجامعة القرآن الكريم والعلوم الإسلامية - فرع غيل باوزير.
                
                [تعليمات الرد الصارمة]:
                1. الإيجاز والترتيب: قدم إجابات مختصرة جداً، مباشرة، واعرضها في نقاط أو أرقام لسهولة القراءة.
                2. الاحترافية: استخدم نبرة أكاديمية لبقة ومرحبة.
                3. التخصصات: إذا سُئلت عن التخصصات، اذكر اسم التخصص ونبذة بسطر واحد فقط عنه أو فرص العمل الأساسية. لا تذكر كل التفاصيل إلا إذا طُلبت.
                4. النطق الصوتي: تجنب الرموز البرمجية (مثل --- أو ***) لتكون الإجابة متوافقة وسلسة عند نطقها بالصوت.
                5. المصدر: أجب فقط من البيانات أدناه. إذا لم تتوفر المعلومة، اعتذر بلطف ووجه الطالب لمراجعة إدارة الفرع.

                [البيانات المعتمدة للفرع]:
                - التعريف: ${universityData.info || 'يرجى مراجعة إدارة الفرع للتفاصيل.'}
                - الجداول: ${universityData.schedules || 'تُطلب من إدارة المسجل بالفرع.'}
                - الامتحانات: ${universityData.exams || 'تُعلن رسمياً عبر لوحة الإعلانات بالفرع.'}
                - الرسوم: ${universityData.fees || 'تُراجع مع الدائرة المالية بالفرع.'}
                - التواصل: ${universityData.contacts || 'زيارة مقر الفرع بغيل باوزير خلال ساعات الدوام الرسمي.'}
                - التخصصات: ${universityData.majors || 'تضم الجامعة تخصصات نوعية، راجع المسجل لمعرفة الشروط.'}
                `;

                const apiKey = process.env.GROQ_API_KEY;
                if (!apiKey) {
                    return res.status(500).json({ reply: "⚠️ عذراً، مفتاح الربط الذكي غير معرف حالياً." });
                }

                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant', // النموذج السريع والاقتصادي
                        messages: [
                            { role: 'system', content: systemInstruction },
                            { role: 'user', content: question.trim() }
                        ],
                        temperature: 0.1,  // درجة حرارة منخفضة جداً لضمان الدقة وتجنب الإطالة
                        max_tokens: 600    // تقليل عدد الكلمات المسموح بها لإجباره على الاختصار
                    })
                });

                if (!groqResponse.ok) {
                    throw new Error(`سيرفر المعالجة الذكي أعاد رمز خطأ: ${groqResponse.status}`);
                }

                const groqData = await groqResponse.json();
                
                if (groqData.error) {
                    return res.status(200).json({ reply: `⚠️ تنبيه: ${groqData.error.message}` });
                }

                let reply = groqData.choices?.[0]?.message?.content;

                if (!reply || reply.trim() === "") {
                    return res.status(200).json({ reply: "عذراً، لم أتمكن من صياغة الرد حالياً، يرجى المحاولة مرة أخرى." });
                }

                // تنظيف نهائي للنص ليكون جاهزاً للنطق والشاشة
                reply = reply.replace(/[\-\*]{2,}/g, '').trim();

                return res.status(200).json({ reply });

            } catch (error) {
                console.error("API Error:", error);
                return res.status(200).json({ reply: `⚠️ واجه النظام مشكلة مؤقتة. (السبب: ${error.message})` });
            }
        }
        
        return res.status(400).json({ error: 'يرجى كتابة سؤالك.' });
    }

    if (req.method === 'GET') {
        try {
            const data = await redis.get('university_data');
            return res.status(200).json(data || {});
        } catch (error) {
            return res.status(500).json({ error: 'فشل جلب البيانات.' });
        }
    }
}
