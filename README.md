# Workout Tracker

Веб-приложение для отслеживания тренировок и прогресса в упражнениях.

## Особенности
- Запись тренировок и упражнений
- История тренировок
- Отслеживание прогресса
- Локальное хранение данных
- Поддержка Firebase для облачного хранения
- Создание бэкапов

## Firebase Setup

### Настройка Firebase
1. Создайте новый проект в [Firebase Console](https://console.firebase.google.com/)
2. Добавьте веб-приложение в ваш проект
3. Скопируйте `js/config/firebase.config.example.js` в `firebase.config.js`
4. Замените placeholder значения на вашу Firebase конфигурацию
5. Установите `useFirebase = true` для включения Firebase хранилища

Ваш `firebase.config.js` должен выглядеть так:
javascript
export const firebaseConfig = {
apiKey: "ваш-api-key",
authDomain: "ваш-проект.firebaseapp.com",
projectId: "ваш-проект-id",
storageBucket: "ваш-проект.firebasestorage.app",
messagingSenderId: "ваш-sender-id",
appId: "ваш-app-id"
};
export const useFirebase = true;

## Установка и запуск
1. Клонируйте репозиторий
2. Настройте Firebase (опционально)
3. Откройте index.html в браузере

## Технологии
- JavaScript (ES6+)
- HTML5
- CSS3
- Firebase (опционально)