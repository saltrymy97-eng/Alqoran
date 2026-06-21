import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    // 1. معالجة طلبات الإدارة (تسجيل الدخول أو الحفظ)
    if (req.method === 'POST') {
        const { password, question, ...data } = req.body;

        // التحقق من كلمة المرور
        if (password === 'admin123') {
            // إذا كان هناك بيانات للحفظ
            if (Object.keys(data).length > 0) {
                await redis.set('university_data', data);
                return res.json({ success: true, message: '✅ تم الحفظ في السحابة بنجاح' });
            }
            // إذا كان مجرد تسجيل دخول (للتحقق من كلمة السر)
            return res.json({ success: true, status: 'authenticated' });
        }

        // 2. معالجة أسئلة الطلاب
        if (question) {
            const data = await redis.get('university_data') || {};
            
            // بحث بسيط داخل البيانات المخزنة
            let reply = "عذراً، لا توجد معلومة محددة حول هذا الاستفسار حالياً.";
            if (question.includes('جدول')) reply = data.schedules || "لا تتوفر جداول دراسية حالياً.";
            else if (question.includes('امتحان')) reply = data.exams || "لا تتوفر مواعيد امتحانات حالياً.";
            else if (question.includes('رسوم')) reply = data.fees || "يرجى مراجعة إدارة الفرع بشأن الرسوم.";
            else if (question.includes('تخصص')) reply = data.majors || "تتوفر لدينا عدة تخصصات، راجع إدارة الموقع.";
            else if (question.includes('تواصل')) reply = data.contacts || "يمكنك التواصل عبر أرقام الفرع الرسمية.";
            else if (question.includes('تعريف')) reply = data.info || "جامعة القرآن الكريم - فرع غيل باوزير.";

            return res.json({ reply });
        }
        
        return res.status(400).json({ error: 'طلب غير صالح' });
    }

    // 3. جلب البيانات (للطلاب أو الإدارة)
    if (req.method === 'GET') {
        const data = await redis.get('university_data');
        return res.json(data || {});
    }
}
