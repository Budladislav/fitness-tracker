import { BaseComponent } from './base-component.js';

export class AuthButton extends BaseComponent {
    constructor(authModal, authService, settingsModal) {
        super();
        this.authModal = authModal;
        this.authService = authService;
        this.settingsModal = settingsModal;
        this.createButton();
        this.initializeEvents();
        this.initializeAuthStateListener();
    }

    createButton() {
        this.button = document.createElement('button');
        this.button.className = 'auth-button';
        this.button.innerHTML = '<img src="icons/user.svg" alt="Профиль">';
        this.button.title = 'Профиль';
        document.body.appendChild(this.button);
    }

    initializeEvents() {
        this.button.addEventListener('click', () => {
            this.toggleUserMenu();
        });
    }

    initializeAuthStateListener() {
        this.authService.onAuthStateChanged(user => {
            if (user) {
                this.button.querySelector('img').src = 'icons/user-logged.svg';
                this.button.title = user.email;
            } else {
                this.button.querySelector('img').src = 'icons/user.svg';
                this.button.title = 'Профиль';
            }
        });
    }

    toggleUserMenu() {
        const existingMenu = document.querySelector('.user-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const user = this.authService.getCurrentUser();
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        
        if (user) {
            menu.innerHTML = `
                <div class="user-email">${user.email}</div>
                <button class="settings-btn">⚙️ Настройки</button>
                <button class="logout-btn">🚪 Выйти</button>
            `;

            menu.querySelector('.logout-btn').onclick = async () => {
                await this.authService.signOut();
                menu.remove();
            };
        } else {
            menu.innerHTML = `
                <div class="user-email">Гость</div>
                <button class="settings-btn">⚙️ Настройки</button>
                <button class="login-btn">🔑 Войти / Регистрация</button>
            `;

            menu.querySelector('.login-btn').onclick = () => {
                this.authModal.show();
                menu.remove();
            };
        }

        menu.querySelector('.settings-btn').onclick = () => {
            this.settingsModal.show();
            menu.remove();
        };

        document.body.appendChild(menu);

        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !this.button.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
}