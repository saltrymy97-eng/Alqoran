import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    if (req.method === 'GET') {
        const data = await redis.get('university_data') || { info: '', schedules: '', exams: '', fees: '', contacts: '', majors: '' };
        return res.json(data);
    }

    if (req.method === 'POST') {
        const { password, ...data } = req.body;
        if (password !== 'admin123') return res.status(403).json({ error: 'كلمة مرور غير صحيحة' });
        
        await redis.set('university_data', data);
        return res.json({ success: true, message: '✅ تم الحفظ في السحابة بنجاح' });
    }
}
