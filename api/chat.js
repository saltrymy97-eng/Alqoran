import { Redis } from '@upstash/redis';

// إعداد الاتصال بقاعدة البيانات السحابية Upstash
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    // تعيين رؤوس الاستجابة لضمان التوافق والأمان
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST') {
        const { password, question, ...data } = req.body;

        // ==========================================
        // 1. بوابة الإشراف والتحكم (Admin Panel Gateway)
        // ==========================================
        if (password === 'admin123') {
            if (Object.keys(data).length > 0) {
                await redis.set('university_data', data);
                return res.status(200).json({ success: true, message: '✅ تم تحديث الهيكل البياني السحابي بنجاح.' });
            }
            return res.status(200).json({ success: true, status: 'authenticated' });
        }

        // ==========================================
        // 2. محرك معالجة الحوار الذكي للطلاب (RAG Engine)
        // ==========================================
        if (question) {
            try {
                // جلب البيانات الخام من السحابة
                const universityData = await redis.get('university_data') || {};
                
                // هندسة الأوامر (Prompt Engineering) لبناء شخصية المساعد الأكاديمي وتزويده بالحقائق
                const systemInstruction = `
                أنت "المساعد الأكاديمي الرقمي الذكي" المعتمد لجامعة القرآن الكريم والعلوم الإسلامية - فرع غيل باوزير بمحافظة حضرموت.
                
                [المهام والمسؤوليات]:
                1. أجب على استفسارات الطلاب بناءً على "المصفوفة المعرفية للجامعة" المرفقة أدناه فقط.
                2. صغ الإجابات بأسلوب أكاديمي، لبق، واضح، ومنظم في نقاط مرقمة أو فقرات قصيرة لسهولة القراءة.
                3. تجنب تماماً استخدام الرموز البرمجية مثل (---) أو النجوم الكثيفة (**) أو أسماء الحقول الجافة في ردك النهائي.
                4. يجب أن تكون الإجابة متوافقة بنسبة 100% مع النطق الصوتي المسموع (لا تضع رموزاً تعيق محرك القراءة الصوتي).
                5. إذا كان الاستفسار خارج نطاق البيانات المتاحة، اعتذر للطالب بلطف شديد ووجهه لمراجعة "المسجل أو شؤون الطلاب بفرع الغيل".

                [المصفوفة المعرفية الرسمية للجامعة]:
                - نبذة وتأسيس الفرع: ${universityData.info || 'يرجى مراجعة إدارة الفرع للتفاصيل.'}
                - الجداول الدراسية والمحاضرات: ${universityData.schedules || 'الجداول الدراسية وتوقيت المحاضرات تُطلب من إدارة المسجل بالفرع.'}
                - الامتحانات والتقييم الأكاديمي: ${universityData.exams || 'مواعيد وخطط الاختبارات تُعلن رسمياً عبر لوحة الإعلانات بفرع الغيل.'}
                - الرسوم الدراسية وآلية التقسيط: ${universityData.fees || 'الرسوم المالية وإجراءات التقسيط والمنح تُراجع مع الدائرة المالية بالفرع.'}
                - قنوات الاتصال والتواصل الرسمية: ${universityData.contacts || 'يمكنك زيارة مقر الفرع بغيل باوزير خلال ساعات الدوام الرسمي من الأحد إلى الخميس.'}
                - البرامج الأكاديمية والتخصصات المتاحة: ${universityData.majors || 'تضم الجامعة تخصصات نوعية في العلوم الشرعية والإنسانية والإدارية، راجع المسجل لمعرفة الشروط.'}
                `;

                const apiKey = process.env.GROQ_API_KEY;
                if (!apiKey) {
                    return res.status(500).json({ reply: "⚠️ خطأ نظام: مفتاح الربط الذكي GROQ_API_KEY غير معرف حالياً." });
                }

                // الاتصال بـ Groq API عبر تقنية الاستدعاء المباشر والآمن لضمان تجاوز الحظر الجغرافي
                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.1-8b-instant', // استخدام أحدث نموذج مستقر عالي الذكاء وسريع الاستجابة
                        messages: [
                            { role: 'system', content: systemInstruction },
                            { role: 'user', content: question.trim() }
                        ],
                        temperature: 0.2,  // درجة حرارة منخفضة جداً لضمان الالتزام الصارم بالحقائق المكتوبة وعدم التأليف الارتجالي
                        max_tokens: 1200,   // مساحة كافية لتوليد ردود شاملة ومنسقة
                        top_p: 0.9
                    })
                });

                // التحقق من سلامة استجابة السيرفر قبل معالجة البيانات
                if (!groqResponse.ok) {
                    throw new Error(`سيرفر المعالجة الذكي أعاد رمز خطأ: ${groqResponse.status}`);
                }

                const groqData = await groqResponse.json();
                
                if (groqData.error) {
                    return res.status(200).json({ reply: `⚠️ تنبيه من المحرك: ${groqData.error.message}` });
                }

                let reply = groqData.choices?.[0]?.message?.content;

                if (!reply || reply.trim() === "") {
                    return res.status(200).json({ reply: "عذراً، لم أتمكن من صياغة الرد بالشكل المطلوب حالياً، يرجى المحاولة مرة أخرى." });
                }

                // تنظيف نهائي للمخرجات لضمان مظهر احترافي ومثالي للنطق الصوتي
                reply = reply
                    .replace(/[\-\*\#]{2,}/g, '') // إزالة تكرار الرموز مثل --- أو ***
                    .trim();

                return res.status(200).json({ reply });

            } catch (error) {
                console.error("Chat API Error:", error);
                return res.status(200).json({ reply: `⚠️ عذراً، واجه النظام صعوبة برمجية أثناء معالجة الطلب الذكي. (السبب: ${error.message})` });
            }
        }
        
        return res.status(400).json({ error: 'طلب غير صالح، ينقصه نص السؤال.' });
    }

    // ==========================================
    // 3. بوابة جلب البيانات (Data Retrieval)
    // ==========================================
    if (req.method === 'GET') {
        try {
            const data = await redis.get('university_data');
            return res.status(200).json(data || {});
        } catch (error) {
            return res.status(500).json({ error: 'فشل جلب البيانات من السحابة.' });
        }
    }
}
