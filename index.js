import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import 'dotenv/config';
import axios from 'axios';
import https from 'https';
import bcrypt from 'bcrypt';

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());


const httpsAgent = new https.Agent({ rejectUnauthorized: false });


const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'trainer_user',
    password: process.env.DB_PASSWORD || 'trainer123',
    database: process.env.DB_NAME || 'macro_trainer',
});

pool.connect((err) => {
    if (err) console.error('Ошибка подключения к БД', err);
    else console.log('✅ Подключено к PostgreSQL');
});


function unescapeDbString(str) {
    if (!str) return '';
    return str.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }
    try {
        const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
        }
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
            [username, passwordHash]
        );
        res.json({ userId: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
    }
    try {
        const user = await pool.query('SELECT id, password_hash FROM users WHERE username = $1', [username]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }
        const valid = await bcrypt.compare(password, user.rows[0].password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }
        res.json({ userId: user.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


app.get('/api/categories', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId обязателен' });
    try {
        const categories = await pool.query(`
            SELECT c.*,
                COUNT(e.id) as total_exercises,
                COUNT(CASE WHEN ua.is_correct THEN 1 END) as completed_exercises
            FROM categories c
            LEFT JOIN exercises e ON e.category_id = c.id
            LEFT JOIN user_attempts ua ON ua.exercise_id = e.id AND ua.user_id = $1 AND ua.is_correct = true
            GROUP BY c.id
            ORDER BY c.order_index
        `, [userId]);
        res.json(categories.rows);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки категорий' });
    }
});


app.get('/api/category-theory/:categoryId', async (req, res) => {
    const { categoryId } = req.params;
    try {
        const result = await pool.query('SELECT * FROM theory_blocks WHERE category_id = $1 ORDER BY order_index LIMIT 1', [categoryId]);
        if (result.rows.length === 0) return res.json({ content: '<p>Теория в разработке</p>', title: 'Теория' });
        const theory = result.rows[0];
        if (theory) theory.content = unescapeDbString(theory.content);
        res.json(theory);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки теории' });
    }
});


app.get('/api/exercises', async (req, res) => {
    const { categoryId, userId } = req.query;
    if (!categoryId) return res.status(400).json({ error: 'categoryId обязателен' });
    try {
        const exercises = await pool.query(`
            SELECT e.*,
                EXISTS(SELECT 1 FROM user_attempts ua WHERE ua.exercise_id = e.id AND ua.user_id = $2 AND ua.is_correct = true) as is_completed,
                COUNT(ua.id) as attempts_count
            FROM exercises e
            LEFT JOIN user_attempts ua ON ua.exercise_id = e.id AND ua.user_id = $2
            WHERE e.category_id = $1
            GROUP BY e.id
            ORDER BY e.order_index
        `, [categoryId, userId]);
        const exercisesWithNewlines = exercises.rows.map(ex => ({
            ...ex,
            starter_code: unescapeDbString(ex.starter_code),
            solution_code: unescapeDbString(ex.solution_code),
            description: unescapeDbString(ex.description),
            hint: unescapeDbString(ex.hint)
        }));
        res.json(exercisesWithNewlines);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки упражнений' });
    }
});


app.post('/api/check-macro', async (req, res) => {
    const { userId, exerciseId, userCode } = req.body;
    if (!userId || !exerciseId || !userCode) {
        return res.status(400).json({ error: 'Не хватает данных' });
    }
    try {
        const exerciseRes = await pool.query('SELECT solution_code, hint FROM exercises WHERE id = $1', [exerciseId]);
        if (exerciseRes.rows.length === 0) {
            return res.status(404).json({ error: 'Упражнение не найдено' });
        }
        const { solution_code, hint } = exerciseRes.rows[0];
        const normalize = (code) => {
            return code.replace(/'.*$/gm, '').replace(/\s+/g, ' ').trim();
        };
        const isCorrect = normalize(userCode) === normalize(solution_code);
        const attemptsRes = await pool.query('SELECT COUNT(*) as cnt FROM user_attempts WHERE user_id = $1 AND exercise_id = $2', [userId, exerciseId]);
        const attemptNumber = parseInt(attemptsRes.rows[0].cnt) + 1;
        await pool.query(
            `INSERT INTO user_attempts (user_id, exercise_id, user_code, is_correct, attempt_number)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, exerciseId, userCode, isCorrect, attemptNumber]
        );
        res.json({
            correct: isCorrect,
            hint: isCorrect ? null : hint,
            message: isCorrect ? '✅ Правильно!' : '❌ Неправильно. Попробуйте ещё раз.'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка проверки' });
    }
});


app.get('/api/user/progress', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId обязателен' });
    try {
        const total = await pool.query('SELECT COUNT(*) as total FROM exercises');
        const completed = await pool.query(
            `SELECT COUNT(DISTINCT exercise_id) as completed
             FROM user_attempts
             WHERE user_id = $1 AND is_correct = true`,
            [userId]
        );
        const percent = total.rows[0].total === 0 ? 0 : Math.round((completed.rows[0].completed / total.rows[0].total) * 100);
        res.json({ progressPercent: percent, completed: completed.rows[0].completed, total: total.rows[0].total });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка прогресса' });
    }
});


app.get('/api/theory-blocks/:categoryId', async (req, res) => {
    const { categoryId } = req.params;
    try {
        const result = await pool.query(
            'SELECT id, title, content FROM theory_blocks WHERE category_id = $1 ORDER BY order_index',
            [categoryId]
        );
        const blocks = result.rows.map(block => ({
            ...block,
            content: unescapeDbString(block.content)
        }));
        res.json(blocks);
    } catch (err) {
        res.status(500).json({ error: 'Ошибка загрузки блоков теории' });
    }
});


app.get('/api/category-themes/:categoryId', async (req, res) => {
    const { categoryId } = req.params;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId обязателен' });

    try {
        const theories = await pool.query(
            'SELECT id, title, content, order_index FROM theory_blocks WHERE category_id = $1 ORDER BY order_index',
            [categoryId]
        );

        const themes = [];
        for (const theory of theories.rows) {
            const exerciseRes = await pool.query(
                `SELECT e.*, 
                    EXISTS(SELECT 1 FROM user_attempts ua WHERE ua.exercise_id = e.id AND ua.user_id = $2 AND ua.is_correct = true) as is_completed,
                    COUNT(ua.id) as attempts_count
                 FROM exercises e
                 LEFT JOIN user_attempts ua ON ua.exercise_id = e.id AND ua.user_id = $2
                 WHERE e.theory_block_id = $1
                 GROUP BY e.id
                 ORDER BY e.order_index LIMIT 1`,
                [theory.id, userId]
            );
            const exercise = exerciseRes.rows[0] || null;
            themes.push({
                theory: {
                    id: theory.id,
                    title: theory.title,
                    content: unescapeDbString(theory.content),
                },
                exercise: exercise ? {
                    id: exercise.id,
                    title: exercise.title,
                    description: unescapeDbString(exercise.description),
                    starter_code: unescapeDbString(exercise.starter_code),
                    solution_code: unescapeDbString(exercise.solution_code),
                    hint: unescapeDbString(exercise.hint),
                    is_completed: exercise.is_completed,
                    attempts_count: exercise.attempts_count,
                } : null,
            });
        }
        res.json(themes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка загрузки тем категории' });
    }
});


async function getGigaChatToken(authKey) {
    const url = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
    const data = 'scope=GIGACHAT_API_PERS';
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': '11111111-1111-1111-1111-111111111111',
        'Authorization': `Basic ${authKey}`,
    };
    const response = await axios.post(url, data, { headers, httpsAgent });
    return response.data.access_token;
}

async function generateMacroViaGigaChat(authKey, description) {
    const token = await getGigaChatToken(authKey);
    const url = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
    
    const systemPrompt = `Ты — эксперт по написанию макросов на LibreOffice Basic. Твоя задача — сгенерировать полностью рабочий, чистый и безопасный макрос для LibreOffice (Writer, Calc или Base — укажи нужное), который выполняет следующую задачу.

**Требования к макросу:**
- Используй только стандартные библиотеки LibreOffice (не подключай внешние).
- Код должен быть совместим с последними версиями LibreOffice.
- Все переменные должны иметь понятные имена и быть объявлены (Option Explicit).
- Макрос не должен вызывать ошибок при запуске, даже если документ пуст или нет нужных данных.
- Использовать только синтаксис и методы LibreOffice Basic. Не использовать конструкции из VBA или других диалектов.
- Не используй MsgBox и обработчики ошибок On Error Goto.

**Формат ответа:**
- Только код макроса, без пояснений и текста.
- Код должен быть сразу готов к копированию в LibreOffice Basic IDE.`;

    const payload = {
        model: 'GigaChat-Pro',
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: description }   // описание задачи от пользователя
        ],
        temperature: 0.4,
        max_tokens: 500,
    };
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
    const response = await axios.post(url, payload, { headers, httpsAgent });
    return response.data.choices[0].message.content;
}

app.post('/api/generate-macro', async (req, res) => {
    const { description } = req.body;
    if (!description) {
        return res.status(400).json({ error: 'Описание макроса не может быть пустым.' });
    }
    const authKey = process.env.GIGACHAT_AUTH_KEY;
    if (!authKey) {
        console.error('❌ GIGACHAT_AUTH_KEY не задан в .env');
        return res.status(500).json({ error: 'Сервер не настроен для работы с GigaChat' });
    }
    try {
        const generatedCode = await generateMacroViaGigaChat(authKey, description);
        res.json({ generatedCode });
    } catch (error) {
        console.error('Ошибка GigaChat:', error.response?.data || error.message);
        res.status(500).json({ error: 'Ошибка генерации макроса. Попробуйте позже.' });
    }
});


app.post('/api/get-ai-hint', async (req, res) => {
    const { userCode, solutionCode, description } = req.body;
    if (!userCode || !solutionCode || !description) {
        return res.status(400).json({ error: 'Не хватает данных для подсказки' });
    }

    const prompt = `
Пользователь пытался написать макрос для LibreOffice Basic с таким заданием:
"${description}"

Его код:
\`\`\`
${userCode}
\`\`\`

Правильный (эталонный) код:
\`\`\`
${solutionCode}
\`\`\`

Проанализируй, в чём ошибка пользователя, и дай краткую, конструктивную подсказку (2-3 предложения), без готового кода, только объяснение, что исправить. Если код пользователя уже правильный – скажи об этом. 
Подсказка:
`;

    try {
       
        const authKey = process.env.GIGACHAT_AUTH_KEY;
        let hintText = '';

        if (authKey) {
            try {
               
                const generatedHint = await generateMacroViaGigaChat(authKey, prompt);
                hintText = generatedHint;
            } catch (err) {
                console.error('Ошибка получения подсказки от GigaChat:', err);
                hintText = 'Не удалось получить подсказку от ИИ. Попробуйте позже.';
            }
        } else {
        
            if (!userCode.includes('Sub') || !userCode.includes('End Sub')) {
                hintText = '❌ Вы забыли ключевые слова Sub или End Sub. Макрос должен начинаться с Sub и заканчиваться End Sub.';
            } else if (!userCode.includes('MsgBox') && description.toLowerCase().includes('msgbox')) {
                hintText = '💡 Задание просит вывести сообщение. Используйте MsgBox "Ваш текст".';
            } else if (userCode.trim() === solutionCode.trim()) {
                hintText = '✅ Ваш код уже правильный! Возможно, проблема в лишних пробелах или регистре.';
            } else {
                hintText = '🤔 Сравните ваш код с эталоном. Обратите внимание на синтаксис и правильное использование команд.';
            }
        }

        res.json({ hint: hintText });
    } catch (error) {
        console.error('Ошибка при генерации подсказки:', error);
        res.status(500).json({ error: 'Не удалось получить подсказку' });
    }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Backend запущен на http://localhost:${PORT}`);
});
