// backend/index.js
//import GigaChat from 'gigachat';

import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import 'dotenv/config';
//import GigaChat from 'gigachat';
//import { Agent } from 'node:https';

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'trainer_user',
    password: process.env.DB_PASSWORD || 'trainer123',
    database: process.env.DB_NAME || 'macro_trainer',
});

pool.connect((err) => {
    if (err) console.error('Ошибка подключения к БД', err);
    else console.log('Подключено к PostgreSQL');
});

function unescapeDbString(str) {
    if (!str) return '';
    return str.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

// const httpsAgent = new Agent({
//     rejectUnauthorized: false, // Рекомендуется для разработки
// });
// const gigachatClient = new GigaChat({
//     credentials: process.env.GIGACHAT_CREDENTIALS,
//     httpsAgent: httpsAgent,
//     model: 'GigaChat-Pro',
//     timeout: 600,
// });

app.post('/api/register', async (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Имя пользователя обязательно' });
    try {
        let user = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
        if (user.rows.length === 0) {
            const result = await pool.query('INSERT INTO users (username) VALUES ($1) RETURNING id', [username]);
            return res.json({ userId: result.rows[0].id, isNew: true });
        } else {
            return res.json({ userId: user.rows[0].id, isNew: false });
        }
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

// ЗАГЛУШКА 
app.post('/api/generate-macro', (req, res) => {
    const { description } = req.body;
    if (!description) {
        return res.status(400).json({ error: 'Описание макроса не может быть пустым.' });
    }

    const lowerDesc = description.toLowerCase();
    let generatedCode = '';

    // Генерация на основе ключевых слов
    if (lowerDesc.includes('calc') || lowerDesc.includes('таблиц') || lowerDesc.includes('ячейк') || lowerDesc.includes('лист')) {
        generatedCode = `Sub MacroForCalc()
    ' 🔹 Сгенерировано по описанию: "${description.substring(0, 80)}"
    Dim oSheet As Object
    oSheet = ThisComponent.getSheets().getByIndex(0)
    
    ' Пример: работа с ячейками
    oSheet.getCellByPosition(0,0).setValue(100)   ' A1 = 100
    oSheet.getCellByPosition(1,0).setString("Привет")
    
    MsgBox "Макрос для Calc выполнен"
End Sub`;
    } 
    else if (lowerDesc.includes('writer') || lowerDesc.includes('текст') || lowerDesc.includes('документ')) {
        generatedCode = `Sub MacroForWriter()
    ' 🔹 Сгенерировано по описанию: "${description.substring(0, 80)}"
    Dim oText As Object
    oText = ThisComponent.Text
    oText.insertString(oText.End, "Текст, добавленный макросом", False)
    
    MsgBox "Текст добавлен в конец документа"
End Sub`;
    }
    else if (lowerDesc.includes('msgbox') || lowerDesc.includes('сообщение')) {
        generatedCode = `Sub ShowMessage()
    ' 🔹 Сгенерировано по описанию: "${description.substring(0, 80)}"
    MsgBox "Ваше сообщение"
End Sub`;
    }
    else {
        generatedCode = `Sub DemoMacro()
    ' 🔹 Сгенерировано по описанию: "${description.substring(0, 80)}"
    MsgBox "Макрос создан по вашему запросу: ${description.substring(0, 50)}"
End Sub`;
    }

    setTimeout(() => {
        res.json({ generatedCode });
    }, 500);
});

// app.post('/api/generate-macro', async (req, res) => {
//     const { description } = req.body;
//     if (!description) {
//         return res.status(400).json({ error: 'Описание макроса не может быть пустым.' });
//     }

//     try {
//         const giga = new GigaChat({
//             credentials: process.env.GIGACHAT_CREDENTIALS, // из .env
//         });

//         const response = await giga.chat({
//             messages: [
//                 {
//                     role: 'system',
//                     content: 'Ты — эксперт по написанию макросов для LibreOffice на языке Basic. Твоя задача — по описанию пользователя создать готовый код макроса. Код должен начинаться с Sub и заканчиваться End Sub. Не добавляй пояснений, только код.'
//                 },
//                 {
//                     role: 'user',
//                     content: description
//                 }
//             ],
//             model: 'GigaChat-Pro',
//         });

//         const generatedCode = response.choices?.[0]?.message?.content || 'Не удалось сгенерировать код.';
//         res.json({ generatedCode });
//     } catch (error) {
//         console.error('Ошибка GigaChat:', error);
//         res.status(500).json({ error: 'Ошибка генерации макроса: ' + error.message });
//     }
// });

// // Новый маршрут для генерации макроса
// app.post('/api/generate-macro', async (req, res) => {
//     // 1. Получаем описание макроса от пользователя
//     const { description } = req.body;
//     if (!description) {
//         return res.status(400).json({ error: 'Описание макроса не может быть пустым.' });
//     }

//     try {
//         // 2. Инициализируем клиент GigaChat с вашим API-ключом
//         const client = new GigaChat({
//             apiKey: process.env.GIGACHAT_API_KEY,
//         });

//         // 3. Формируем "промпт" (инструкцию) для нейросети
//         //    Это самое важное место. Хороший промпт = хороший результат.
//         const systemPrompt = `
//             Ты — эксперт по написанию макросов для LibreOffice на языке Basic. 
//             Твоя задача — по описанию пользователя создать готовый, рабочий код макроса. 
//             Код должен быть идеально отформатирован и начинаться с 'Sub' и заканчиваться 'End Sub'. 
//             Не добавляй никаких пояснений к коду, только сам код. 
//             Если описание невозможно реализовать, напиши 'Невозможно создать макрос по данному описанию.'.
//         `;

//         // 4. Отправляем запрос модели
//         const chatCompletion = await client.chat.completions.create({
//             messages: [
//                 { role: "system", content: systemPrompt },
//                 { role: "user", content: description }
//             ],
//             model: 'GigaChat-Pro', // Можно использовать и другие модели
//             temperature: 0.7,      // Контролирует "креативность" ответа (0.0 - 1.0)
//             max_tokens: 1000       // Максимальная длина ответа
//         });

//         // 5. Извлекаем сгенерированный код из ответа
//         const generatedCode = chatCompletion.choices[0]?.message?.content;
        
//         if (!generatedCode) {
//             throw new Error('Не удалось получить ответ от GigaChat.');
//         }

//         // 6. Отправляем готовый код обратно на фронтенд
//         res.json({ generatedCode });
//     } catch (error) {
//         console.error('Ошибка при запросе к GigaChat API:', error);
//         res.status(500).json({ error: 'Не удалось сгенерировать макрос. Попробуйте ещё раз.' });
//     }
// });

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend запущен на http://localhost:${PORT}`);
});