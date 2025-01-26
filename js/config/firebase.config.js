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
    // URL для перенаправления после авторизации
    redirectUrl: window.location.origin + window.location.pathname,
    // Дополнительные настройки для email авторизации
    actionCodeSettings: {
        handleCodeInApp: true,
        // iOS
        iOS: {
            bundleId: 'com.yourapp.ios'
        },
        // Android
        android: {
            packageName: 'com.yourapp.android',
            installApp: true,
            minimumVersion: '12'
        },
        // URL динамических ссылок
        dynamicLinkDomain: 'yourapp.page.link'
    }
};