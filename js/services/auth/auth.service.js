import { 
    getAuth, 
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { firebaseService } from '../firebase.service.js';
import { authConfig } from '../../config/firebase.config.js';

export class AuthService {
    constructor(notifications = null) {
        this.notifications = notifications;
        this.auth = getAuth(firebaseService.app);
        this.currentUser = null;
        this.actionCodeSettings = {
            ...authConfig.actionCodeSettings,
            url: authConfig.redirectUrl
        };
        
        // Инициализируем слушатель состояния
        this.auth.onAuthStateChanged((user) => {
            this.currentUser = user;
            this.updateUI();
        });
    }

    updateUI() {
        const authButton = document.querySelector('.auth-button');
        if (!authButton) return;

        if (this.currentUser) {
            authButton.classList.add('logged-in');
            authButton.title = this.currentUser.email;
            authButton.querySelector('img').src = 'icons/user-logged.svg';
        } else {
            authButton.classList.remove('logged-in');
            authButton.title = 'Войти';
            authButton.querySelector('img').src = 'icons/user.svg';
        }
    }

    async sendLoginLink(email) {
        try {
            await sendSignInLinkToEmail(this.auth, email, this.actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
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
            await this.auth.signOut();
            if (this.notifications) {
                this.notifications.success('Вы вышли из системы');
            }
            return true;
        } catch (error) {
            console.error('Error signing out:', error);
            if (this.notifications) {
                this.notifications.error('Ошибка выхода из системы');
            }
            return false;
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }
} 