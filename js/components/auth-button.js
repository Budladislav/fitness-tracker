import { BaseComponent } from './base-component.js';

export class AuthButton extends BaseComponent {
    constructor(authModal, authService) {
        super();
        this.authModal = authModal;
        this.authService = authService;
        this.createButton();
        this.initializeEvents();
        this.initializeAuthStateListener();
    }

    createButton() {
        this.button = document.createElement('button');
        this.button.className = 'auth-button';
        this.button.innerHTML = '<img src="icons/user.svg" alt="Профиль">';
        document.body.appendChild(this.button);
    }

    initializeEvents() {
        this.button.addEventListener('click', () => {
            const user = this.authService.getCurrentUser();
            if (user) {
                this.showUserMenu();
            } else {
                this.authModal.show();
            }
        });
    }

    initializeAuthStateListener() {
        this.authService.onAuthStateChanged(user => {
            if (user) {
                this.button.querySelector('img').src = 'icons/user-logged.svg';
                this.button.title = user.email;
            } else {
                this.button.querySelector('img').src = 'icons/user.svg';
                this.button.title = 'Войти';
            }
        });
    }

    showUserMenu() {
        // Простое меню с выходом
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-email">${this.authService.getCurrentUser().email}</div>
            <button class="logout-btn">Выйти</button>
        `;

        menu.querySelector('.logout-btn').onclick = async () => {
            await this.authService.signOut();
            menu.remove();
        };

        document.body.appendChild(menu);

        // Закрываем меню при клике вне его
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && !this.button.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
} 