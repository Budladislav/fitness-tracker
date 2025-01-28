import { 
    getAuth, 
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut,
    signInAnonymously
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { firebaseService } from '../firebase.service.js';
import { authConfig } from '../../config/firebase.config.js';

export class AuthService {
    constructor(notifications = null) {
        this.notifications = notifications;
        this.auth = getAuth(firebaseService.app);
        this.listeners = new Set();
        
        // Сначала проверяем тестовый режим
        if (authConfig.testMode?.enabled) {
            const testUser = localStorage.getItem('testUser');
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
                const testUser = localStorage.getItem('testUser');
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
                // Проверяем, был ли уже такой пользователь
                const existingTestUser = localStorage.getItem('testUser_' + email);
                if (existingTestUser) {
                    this.currentUser = JSON.parse(existingTestUser);
                } else {
                    this.currentUser = {
                        email: email,
                        uid: `test_${email}_${Date.now()}`
                    };
                }
                
                localStorage.setItem('testUser', JSON.stringify(this.currentUser));
                localStorage.setItem('testUser_' + email, JSON.stringify(this.currentUser));
                
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
            window.localStorage.setItem('emailForSignIn', email);
            
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
        if (!isSignInWithEmailLink(this.auth, window.location.href)) {
            return false;
        }

        const email = window.localStorage.getItem('emailForSignIn');
        if (!email) return false;

        try {
            await signInWithEmailLink(this.auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            if (this.notifications) {
                this.notifications.success('Вы успешно вошли в систему');
            }
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
                localStorage.removeItem('testUser');
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