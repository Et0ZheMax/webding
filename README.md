# Wedding Invitation · a la rus

Минималистичный свадебный одностраничник с RSVP, пасхалками и закрытой секцией после свадьбы для загрузки фото/видео.

## Стек
- Frontend: HTML + CSS + Vanilla JS
- Backend: Node.js + Express
- Storage: SQLite + локальная файловая система (`/uploads`)

## Запуск
```bash
npm i
cp .env.example .env
npm run dev
```
Откройте: `http://localhost:3000`

## Build
```bash
npm run build
```
(для этого проекта сборка не требуется, команда выполняет проверочный шаг)

## ENV настройки
См. `.env.example`:
- `PORT` — порт сервера
- `CORS_ORIGIN` — разрешённый origin
- `UPLOAD_ACCESS_CODE` — секретный код для секции «После свадьбы»
- `SESSION_SECRET` — резерв под дальнейшее расширение
- `MAX_FILE_SIZE_MB` — лимит размера файла
- `MAX_FILES_PER_UPLOAD` — лимит количества файлов за отправку

## Структура проекта
- `src/server.js` — запуск Express, security middleware, static, error handler
- `src/db.js` — инициализация SQLite таблиц
- `src/routes/api.js` — API: RSVP, доступ по коду, upload, gallery, zip
- `src/middleware/authUpload.js` — cookie-сессия для закрытой секции
- `public/index.html` — разметка лендинга
- `public/styles.css` — дизайн (минимализм + фольклорные микро-паттерны)
- `public/app.js` — интерактив, пасхалки, локальное состояние, загрузки
- `uploads/YYYY-MM/` — оригиналы и превью после загрузки
- `data/wedding.db` — база SQLite

## Что реализовано
- Hero + детали + RSVP + карта + FAQ
- RSVP сохраняется в SQLite
- 6 интерактивных фишек:
  1. Тройной тап по hero открывает секретный блок
  2. Клавишное комбо `ф-о-л-к` открывает секрет
  3. Подсказка/легенда на дате
  4. Мини-игра «собери 3 символа»
  5. Toggle звука колокольчика
  6. Персонализация имени + сохранение FAQ state в localStorage
- Закрытая секция после свадьбы по коду доступа (через сервер + cookie)
- Drag&drop загрузка файлов с прогрессом
- Серверная валидация mime/type + size + max files
- Honeypot anti-spam + rate limit
- Превью изображений через sharp
- Галерея с фильтрами по месяцу/дню
- Скачивание архива через `/api/upload/download.zip`

## Как поменять основные данные
- Имена/дату/город: `public/index.html` (секция `#hero`)
- Детали/адрес/контакты: `public/index.html` (блок `#details`)
- Цвета/типографику: `public/styles.css` (`:root` переменные)
- Секретный код: `.env` → `UPLOAD_ACCESS_CODE`
- Путь хранения файлов: `uploads/YYYY-MM/` (создаётся автоматически)

## Безопасность
- `helmet` с CSP
- `cors` с явным origin
- Санитизация RSVP и upload полей
- Ограничение размеров body/upload
- Централизованный обработчик ошибок

