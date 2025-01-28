import { getAuth, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { firebaseService } from '../firebase.service.js';

export class AuthManager {
    constructor(notifications) {
        this.notifications = notifications;
        this.auth = getAuth(firebaseService.app);
        this.currentUser = null;
    }

    async initialize() {
        try {
            // Слушаем изменения состояния авторизации
            this.auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.updateUI();
            });
        } catch (error) {
            console.error('Error initializing auth:', error);
            this.notifications.error('Ошибка инициализации авторизации');
        }
    }

    updateUI() {
        const authButton = document.querySelector('.auth-button');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');

        if (this.currentUser) {
            if (authButton) authButton.classList.add('logged-in');
            if (userInfo) userInfo.style.display = 'flex';
            if (userName) userName.textContent = this.currentUser.email;
            if (userAvatar) {
                userAvatar.style.display = 'block';
                userAvatar.src = this.currentUser.photoURL || 'assets/images/user-logged.svg';
            }
        } else {
            if (authButton) authButton.classList.remove('logged-in');
            if (userInfo) userInfo.style.display = 'none';
            if (userName) userName.textContent = '';
            if (userAvatar) userAvatar.style.display = 'none';
        }
    }

    async signIn(email, password) {
        try {
            await signInWithEmailAndPassword(this.auth, email, password);
            this.notifications.success('Вы успешно вошли в систему');
            return true;
        } catch (error) {
            console.error('Sign in error:', error);
            this.notifications.error('Ошибка входа: ' + error.message);
            return false;
        }
    }

    async signOut() {
        try {
            await signOut(this.auth);
            this.notifications.success('Вы вышли из системы');
            return true;
        } catch (error) {
            console.error('Sign out error:', error);
            this.notifications.error('Ошибка выхода из системы');
            return false;
        }
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }
} 