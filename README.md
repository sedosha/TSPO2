# Проект: Тренажёр макросов LibreOffice

**Автор:** Седова Мария Александровна  
**ВУЗ:** РТУ МИРЭА  
**Дисциплина:** Технологии создания программного обеспечения  
**Год:** 2026

---

## Описание программы (по ГОСТ 19.402-78)

### 1. Общие сведения

1.1. **Обозначение и наименование программы**  
   `Macro-Trainer v1.0` — «Тренажёр макросов LibreOffice».

1.2. **Необходимое программное обеспечение**  
   - Операционная система: Windows / macOS / Linux  
   - Браузер: Google Chrome, Mozilla Firefox, Яндекс.Браузер (с поддержкой JavaScript)  
   - Для серверной части: Node.js (версия 18 и выше), PostgreSQL (версия 14 и выше), Docker 

1.3. **Языки программирования**  
   - JavaScript (React, Node.js, Express)  
   - HTML5, CSS3  
   - SQL (PostgreSQL)

### 2. Функциональное назначение

2.1. **Класс решаемых задач**  
   Программа относится к классу образовательных систем — интерактивных тренажёров для обучения программированию (макросы в офисном пакете).

2.2. **Назначение программы**  
   Автоматизация процесса обучения написанию макросов на языке LibreOffice Basic.  
   Программа предоставляет:  
   - теоретические блоки с примерами кода;  
   - практические задания с автоматической проверкой кода «точь-в-точь»;  
   - интеллектуальную генерацию макросов по текстовому описанию (GigaChat API);  
   - персонализированные подсказки при ошибках (ИИ-анализ кода);  
   - отслеживание прогресса и статистику ошибок.

2.3. **Функциональные ограничения**  
   Для работы требуется активное подключение к сети Интернет (для доступа к серверу и API GigaChat).

### 3. Описание логической структуры

3.1. **Алгоритм работы**  
   Приложение построено по трёхуровневой архитектуре «клиент-сервер-база данных».  
   - Пользователь взаимодействует с веб-интерфейсом (React).  
   - Запросы отправляются на сервер (Node.js + Express).  
   - Сервер обрабатывает логику, взаимодействует с PostgreSQL и (при необходимости) с GigaChat API.  
   - Результат возвращается пользователю.

3.2. **Структура программы**  
   - **Frontend** (React): отвечает за отображение теории, редактор кода, панель прогресса, страницу генератора макросов.  
   - **Backend** (Node.js + Express): реализует REST API (регистрация, авторизация, проверка кода, получение контента, генерация подсказок).  
   - **Database** (PostgreSQL): хранит пользователей, категории, теоретические блоки, упражнения, попытки решений.

3.3. **Связь с другими программами**  
   - GigaChat API (HTTPS) – для генерации макросов и интеллектуальных комментариев.

### 4. Используемые технические средства

- Минимальные требования к серверу: 2‑ядерный ЦП, 2 ГБ ОЗУ.  
- Для разработки и развёртывания используется **Docker**, что обеспечивает воспроизводимость среды.

### 5. Вызов и загрузка

5.1. **Способ вызова**  
   После запуска серверной и клиентской частей программа открывается в браузере по адресу `http://localhost:3000`.

5.2. **Входные точки**  
   Стартовая страница – форма аутентификации (вход/регистрация). Доступ к учебным материалам возможен только после успешной авторизации.

### 6. Входные данные

- **Регистрация / Вход** – строки (имя пользователя, пароль).  
- **Выполнение задания** – исходный код макроса на языке LibreOffice Basic.  
- **Генерация макроса** – текстовое описание задачи на русском языке.

### 7. Выходные данные

- **Результат проверки** – сообщение («✅ Правильно!» / «❌ Неправильно») и ИИ‑подсказка.  
- **Сгенерированный макрос** – готовый код в текстовом виде.  
- **Прогресс** – процент выполненных упражнений.

---

## Техническое задание (по ГОСТ 19.201-78)

### 1. Введение

1.1. **Наименование программы**  
   «Тренажёр макросов LibreOffice» (Macro Trainer).

1.2. **Область применения**  
   Образовательный процесс (вузы, курсы) и индивидуальное обучение навыкам автоматизации в LibreOffice.

### 2. Основания для разработки

2.1. **Документ-основание**  
   Задание по дисциплине «Технологии создания программного обеспечения» РТУ МИРЭА.

2.2. **Организация**  
   РТУ МИРЭА, кафедра Индустриального программирования.

### 3. Назначение разработки

3.1. **Функциональное назначение**  
   Интерактивное обучение написанию макросов для LibreOffice Basic с автоматической проверкой, генерацией кода через ИИ и отслеживанием прогресса.

3.2. **Эксплуатационное назначение**  
   Круглосуточный доступ через веб-браузер, возможность использования в учебных аудиториях и удалённо.

### 4. Требования к программе

4.1. **Требования к функциональным характеристикам**  
   - Регистрация / аутентификация (с хешированием паролей bcrypt).  
   - Просмотр структурированного теоретического материала (HTML, примеры кода).  
   - Выполнение упражнений с проверкой кода «точь-в-точь».  
   - Генерация макросов по текстовому описанию (GigaChat API).  
   - Интеллектуальные подсказки при ошибках.  
   - Отслеживание прогресса (процент выполнения, количество попыток).  
   - Адаптивный интерфейс (вкладки категорий, переключение между курсом и генератором).  
   - Кнопка выхода из аккаунта.

4.2. **Требования к надёжности**  
   - Корректная обработка ошибок ввода.  
   - Сохранение данных пользователя в БД.  
   - Повторные попытки выполнения заданий без потери кода.

4.3. **Условия эксплуатации**  
   Комнатная температура, стандартные офисные условия, наличие доступа в интернет.

4.4. **Требования к техническим средствам**  
   - Сервер: CPU 2+ ядра, 4 ГБ ОЗУ, PostgreSQL, Node.js 18+  
   - Клиент: любой современный браузер, разрешение экрана не менее 1280×720.

4.5. **Требования к информационной и программной совместимости**  
   - Frontend: React 18, HTML5/CSS3, JavaScript ES6+.  
   - Backend: Node.js 18+, Express, bcrypt, axios.  
   - База данных: PostgreSQL 15+.  
   - Контейнеризация: Docker (поддерживается, но не обязателен).  
   - Протокол связи: HTTP/REST, HTTPS для внешнего API.

4.6. **Специальные требования**  
   - Программа должна быть кроссплатформенной (Windows, Linux, macOS).  
   - Легко развёртываться через `docker-compose up` (опционально).  
   - Код должен быть задокументирован и доступен на GitHub.

### 5. Требования к программной документации

Документация включает:  
- `README.md` с инструкцией по установке и запуску.  
- Описание программы по ГОСТ 19.402-78.  
- Техническое задание по ГОСТ 19.201-78.

### 6. Технико-экономические показатели

Разработка выполняется в рамках учебного проекта. При внедрении в учебный процесс позволяет автоматизировать проверку практических заданий, снизить нагрузку на преподавателя и повысить эффективность обучения.

### 7. Стадии и этапы разработки

| Стадия | Этап |
|--------|------|
| Техническое проектирование | Составление ТЗ, выбор архитектуры (React + Node.js + PostgreSQL), проектирование БД |
| Рабочее проектирование | Разработка бэкенда (API, проверка кода, подключение GigaChat), разработка фронтенда (компоненты, стили, страницы), наполнение контента (теория, упражнения) |
| Тестирование | Модульное тестирование API, интеграционное тестирование, отладка ИИ-подсказок |
| Внедрение | Подготовка документации, размещение на GitHub, демонстрация преподавателю |

### 8. Порядок контроля и приёмки

- Контроль осуществляется научным руководителем в ходе выполнения этапов.  
- Приёмка работы – защита проекта перед преподавателем с демонстрацией работоспособности приложения.

---

## Запуск проекта

```bash
# Клонировать репозиторий
git clone https://github.com/sedosha/TSPO2.git
cd macro-trainer

# Настроить бэкенд
cd backend
npm install
# Создать .env с параметрами базы данных и ключом GigaChat
npm run dev

# Настроить фронтенд (в другом терминале)
cd frontend
npm install
npm start

# Открыть http://localhost:3000
```

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
