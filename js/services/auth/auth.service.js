import { 
    getAuth, 
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut,
    signInAnonymously,
    setPersistence,
    browserSessionPersistence
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { firebaseService } from '../firebase.service.js';
import { authConfig } from '../../config/firebase.config.js';

export class AuthService {
    constructor(notifications = null) {
        this.notifications = notifications;
        this.auth = getAuth(firebaseService.app);
        
        // Используем настройки из конфига
        this.actionCodeSettings = authConfig.actionCodeSettings;
        
        // Устанавливаем persistence в sessionStorage
        setPersistence(this.auth, browserSessionPersistence)
            .catch(error => console.error('Error setting persistence:', error));
            
        this.listeners = new Set();
        
        // Заменяем localStorage на sessionStorage для тестового режима
        if (authConfig.testMode?.enabled) {
            const testUser = sessionStorage.getItem('testUser');
            if (testUser) {
                this.currentUser = JSON.parse(testUser);
                this.updateUI();
                this.notifyListeners(this.currentUser);
            }
        }
        
        // Слушаем изменения авторизации
        this.auth.onAuthStateChanged((user) => {
            console.log('[AuthService] Auth state changed:', user);
            
            // В тестовом режиме игнорируем null от Firebase
            if (authConfig.testMode?.enabled) {
                const testUser = sessionStorage.getItem('testUser');
                if (testUser && !user) {
                    this.currentUser = JSON.parse(testUser);
                } else {
                    this.currentUser = user;
                }
            } else {
                this.currentUser = user;
            }
            
            this.updateUI();
            this.notifyListeners(this.currentUser);
        });

        // Восстанавливаем состояние UI при загрузке
        window.addEventListener('load', () => {
            console.log('[AuthService] Window loaded, updating UI');
            this.updateUI();
        });
    }

    updateUI() {
        const authButton = document.querySelector('.auth-button');
        console.log('[AuthService] Updating UI, currentUser:', this.currentUser);
        if (!authButton) return;

        if (this.currentUser) {
            authButton.classList.add('logged-in');
            authButton.title = this.currentUser.email;
            authButton.innerHTML = `
                <img src="icons/user-logged.svg" alt="Logged in user">
                <span class="user-status"></span>
            `;
        } else {
            authButton.classList.remove('logged-in');
            authButton.title = 'Войти';
            authButton.innerHTML = `
                <img src="icons/user.svg" alt="Login">
            `;
        }
    }

    async sendLoginLink(email) {
        try {
            if (authConfig.testMode?.enabled) {
                const existingTestUser = sessionStorage.getItem('testUser_' + email);
                if (existingTestUser) {
                    this.currentUser = JSON.parse(existingTestUser);
                } else {
                    this.currentUser = {
                        email: email,
                        uid: `test_${email}_${Date.now()}`
                    };
                }
                
                sessionStorage.setItem('testUser', JSON.stringify(this.currentUser));
                sessionStorage.setItem('testUser_' + email, JSON.stringify(this.currentUser));
                
                // Сначала уведомляем о смене пользователя
                this.notifyListeners(this.currentUser);
                
                // Даем время на обновление userId в FirebaseStorageManager
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Затем обновляем UI и историю
                this.updateUI();
                window.dispatchEvent(new CustomEvent('workoutHistoryUpdate'));
                
                return true;
            }
            
            await sendSignInLinkToEmail(this.auth, email, this.actionCodeSettings);
            sessionStorage.setItem('emailForSignIn', email);
            
            // Добавляем задержку перед обновлением истории
            await new Promise(resolve => setTimeout(resolve, 100));
            window.dispatchEvent(new CustomEvent('workoutHistoryUpdate'));
            
            return true;
        } catch (error) {
            console.error('Error sending login link:', error);
            if (this.notifications) {
                this.notifications.error('Ошибка при отправке ссылки');
            }
            return false;
        }
    }

    async completeSignIn() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const oobCode = urlParams.get('oobCode');
            
            if (!oobCode) {
                return false;
            }

            let email = sessionStorage.getItem('emailForSignIn');
            if (!email) {
                email = window.prompt('Пожалуйста, введите email для подтверждения входа');
            }
            
            if (!email) return false;

            const result = await signInWithEmailLink(this.auth, email, window.location.href);
            sessionStorage.removeItem('emailForSignIn');
            
            this.currentUser = result.user;
            this.updateUI();
            this.notifyListeners(this.currentUser);
            
            if (this.notifications) {
                this.notifications.success('Вы успешно вошли в систему');
            }
            
            window.location.href = window.location.origin + '/fitness-tracker/';
            return true;
        } catch (error) {
            console.error('Error signing in:', error);
            if (this.notifications) {
                this.notifications.error('Ошибка входа');
            }
            return false;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    onAuthStateChanged(callback) {
        return this.auth.onAuthStateChanged(callback);
    }

    async signOut() {
        try {
            if (authConfig.testMode?.enabled) {
                sessionStorage.removeItem('testUser');
                this.currentUser = null;
                this.updateUI();
                this.notifyListeners(null);
                
                // Добавляем обновление истории
                await new Promise(resolve => setTimeout(resolve, 100));
                window.dispatchEvent(new CustomEvent('workoutHistoryUpdate'));
                
                return true;
            }
            
            await signOut(this.auth);
            this.currentUser = null;
            this.updateUI();
            this.notifyListeners(null);
            
            // Добавляем обновление истории
            await new Promise(resolve => setTimeout(resolve, 100));
            window.dispatchEvent(new CustomEvent('workoutHistoryUpdate'));
            
            if (this.notifications) {
                this.notifications.success('Вы вышли из системы');
            }
            return true;
        } catch (error) {
            console.error('Error signing out:', error);
            if (this.notifications) {
                this.notifications.error('Ошибка при выходе');
            }
            return false;
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    addAuthStateListener(callback) {
        this.listeners.add(callback);
    }

    removeAuthStateListener(callback) {
        this.listeners.delete(callback);
    }

    notifyListeners(user) {
        this.listeners.forEach(callback => callback(user));
    }
} 