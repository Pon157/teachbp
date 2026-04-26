# Гайд по развертыванию BotSupport.Edu

Этот проект представляет собой Full-stack приложение на стеке **Vite (React) + Express + Drizzle ORM**.

## 1. Системные требования
- **Node.js**: v18.0.0 или выше.
- **База данных**: PostgreSQL (рекомендуется для продакшена) или SQLite (для тестов).
- **Менеджер процессов**: PM2 (рекомендуется).
- **Веб-сервер**: Nginx (как Reverse Proxy).

## 2. Подготовка окружения
Создайте файл `.env` в корне проекта на сервере:

```env
DATABASE_URL=postgres://user:password@localhost:5432/botsupport
JWT_SECRET=ваш_очень_секретный_ключ
NODE_ENV=production
PORT=3000
```

## 3. Установка и сборка
Выполните следующие команды на сервере:

```bash
# Установка зависимостей
npm install

# Генерация и применение миграций БД
npm run db:push

# Сборка фронтенда (создает папку dist)
npm run build
```

## 4. Запуск через PM2
Для обеспечения бесперебойной работы используйте PM2:

```bash
# Установка PM2 глобально
npm install -g pm2

# Запуск сервера
# В режиме продакшена сервер раздает статику из dist/
pm2 start server.ts --interpreter tsx --name botsupport-app
```

## 5. Настройка Nginx (Reverse Proxy)
Создайте конфиг для сайта `/etc/nginx/sites-available/botsupport`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Активируйте конфиг и перезапустите Nginx: `sudo ln -s /etc/nginx/sites-available/botsupport /etc/nginx/sites-enabled/ && sudo systemctl restart nginx`.

## 6. Рекомендации
- **SSL**: Обязательно настройте HTTPS через `certbot` (Let's Encrypt).
- **Бэкапы**: Настройте ежедневный бэкап базы данных.
- **CI/CD**: Рекомендуется настроить GitHub Actions для автоматической сборки и перезапуска при пуше в main.
