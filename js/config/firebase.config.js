export const firebaseConfig = {
    // Здесь будут реальные данные из Firebase Console
    apiKey: "AIzaSyDDzIvvwIpXeZZk2kiYAcZGGWCIRVbxg8E",
    authDomain: "workout-tracker-500df.firebaseapp.com",
    projectId: "workout-tracker-500df",
    storageBucket: "workout-tracker-500df.firebasestorage.app",
    messagingSenderId: "292466308281",
    appId: "1:292466308281:web:d667c6dd6a91b3fe7a1768"
};

// Флаг для переключения между локальным и Firebase хранилищем
export const useFirebase = true;

// Добавляем конфигурацию для авторизации
export const authConfig = {
    testMode: {
        enabled: false
    },
    actionCodeSettings: {
        //url: window.location.origin + window.location.pathname,
        url: 'https://budladislav.github.io/fitness-tracker/',
        handleCodeInApp: true
    }
};