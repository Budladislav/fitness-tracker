import { BaseComponent } from './base-component.js';

export class AuthButton extends BaseComponent {
    constructor(authModal, authService, settingsModal) {
        super();
        this.settingsModal = settingsModal;
        // сохраняем для обратной совместимости аргументов, 
        // но основное управление авторизацией перенесли в SettingsModal
        this.createButton();
        this.initializeEvents();
    }

    createButton() {
        this.button = document.createElement('button');
        this.button.className = 'auth-button';
        this.button.type = 'button';
        this.button.setAttribute('aria-label', 'Настройки');
        this.button.title = 'Настройки';
        this.button.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
  <circle cx="12" cy="12" r="3" stroke="#ffffff"/>
  <path stroke="#ffffff" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>`;
        document.body.appendChild(this.button);
    }

    initializeEvents() {
        this.button.addEventListener('click', () => {
            this.settingsModal.show();
        });
    }
}