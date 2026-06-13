# Vitëk Web Deployment

Этот проект теперь готов к публикации в браузере: frontend лежит в `Web/`, backend запускается из `Server/server.py`.

## Рекомендуемый простой путь

1. Backend: Render, Railway, Fly.io, VPS или Google Cloud Run.
2. Frontend: Cloudflare Pages, Vercel, Netlify или обычный статический хостинг.
3. Домен:
   - `vitek.example.com` для веб-приложения;
   - `api.vitek.example.com` для backend.

## Production-переменные backend

Backend читает настройки из переменных окружения:

```text
HOST=0.0.0.0
PORT=8081
DATA_FILE=/data/masseng-dev-db.json
CORS_ORIGINS=https://vitek.example.com
```

`CORS_ORIGINS` можно указать списком через запятую:

```text
CORS_ORIGINS=https://vitek.example.com,https://www.vitek.example.com
```

Для локальной разработки можно оставить:

```text
CORS_ORIGINS=*
```

## Frontend config

В файле `Web/config.js` указывается публичный адрес API:

```js
window.VITEK_CONFIG = {
  API_BASE: "https://api.vitek.example.com"
};
```

Перед загрузкой frontend на хостинг замените `http://localhost:8081` на production API.

## Вариант A: Cloudflare Pages + Render

Backend на Render:

1. Создать новый Web Service из репозитория.
2. Start command:

   ```sh
   python Server/server.py
   ```

3. Environment:

   ```text
   HOST=0.0.0.0
   PORT=10000
   CORS_ORIGINS=https://vitek.example.com
   DATA_FILE=/opt/render/project/src/Server/masseng-dev-db.json
   ```

4. Получить URL backend, например:

   ```text
   https://vitek-api.onrender.com
   ```

Frontend на Cloudflare Pages:

1. Project root: `Web`
2. Build command: пусто
3. Output directory: `/`
4. В `Web/config.js` указать API:

   ```js
   window.VITEK_CONFIG = {
     API_BASE: "https://vitek-api.onrender.com"
   };
   ```

## Вариант B: VPS через Docker Compose

На сервере:

```sh
docker compose up -d --build
```

По умолчанию:

```text
frontend: http://SERVER_IP:5173
backend:  http://SERVER_IP:8081
```

Для нормального домена поставьте Nginx/Caddy как reverse proxy:

```text
vitek.example.com -> localhost:5173
api.vitek.example.com -> localhost:8081
```

И обновите:

```text
CORS_ORIGINS=https://vitek.example.com
```

## Вариант C: Google Cloud Run

Собрать и запустить Docker image из корня проекта.

Cloud Run должен передать:

```text
PORT=8080
HOST=0.0.0.0
CORS_ORIGINS=https://vitek.example.com
```

Важно: файловое хранилище Cloud Run временное. Для реального продукта понадобится база данных.

## Важное ограничение текущего backend

Сейчас `Server/server.py` хранит данные в JSON-файле. Это нормально для прототипа и закрытого теста, но для публичного мессенджера нужно заменить хранение на PostgreSQL/Supabase/Firebase/Cloud SQL.

Перед большим публичным запуском нужны:

- постоянная база данных;
- серверные сессии или JWT;
- подтверждение почты;
- восстановление пароля;
- rate limiting;
- HTTPS-only cookies или другой нормальный session layer;
- отдельное файловое хранилище для изображений;
- мониторинг и бэкапы.

Текущая web-версия уже подходит для первичного публичного демо, но не для хранения важных пользовательских данных.
