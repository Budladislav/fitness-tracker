/**
 * Сервис управления цветовыми темами приложения
 */
export class ThemeService {
    static STORAGE_KEY = 'app_theme';

    static THEMES = [
        { id: 'blue',   label: 'Синяя',   color: '#2196f3' },
        { id: 'green',  label: 'Зелёная', color: '#4caf50' },
        { id: 'orange', label: 'Оранжевая', color: '#ff9800' },
        { id: 'dark',   label: 'Тёмная',  color: '#1e1e2e' }
    ];

    static apply(themeId) {
        document.body.setAttribute('data-theme', themeId);
        localStorage.setItem(this.STORAGE_KEY, themeId);
    }

    static loadSaved() {
        const saved = localStorage.getItem(this.STORAGE_KEY) || 'blue';
        document.body.setAttribute('data-theme', saved);
        return saved;
    }

    static getCurrent() {
        return localStorage.getItem(this.STORAGE_KEY) || 'blue';
    }
}
