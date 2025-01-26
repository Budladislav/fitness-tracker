import { firebaseService } from './firebase.service.js';
import { 
    getAuth, 
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { authConfig } from '../config/firebase.config.js';

export class AuthService {
    constructor() {
        this.auth = getAuth(firebaseService.app);
        this.actionCodeSettings = {
            ...authConfig.actionCodeSettings,
            url: authConfig.redirectUrl
        };
    }

    async sendLoginLink(email) {
        try {
            await sendSignInLinkToEmail(this.auth, email, this.actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            return true;
        } catch (error) {
            console.error('Error sending login link:', error);
            return false;
        }
    }

    async completeSignIn() {
        if (!isSignInWithEmailLink(this.auth, window.location.href)) {
            return false;
        }

        const email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            return false;
        }

        try {
            await signInWithEmailLink(this.auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            return true;
        } catch (error) {
            console.error('Error signing in:', error);
            return false;
        }
    }

    getCurrentUser() {
        return this.auth.currentUser;
    }

    onAuthStateChanged(callback) {
        return this.auth.onAuthStateChanged(callback);
    }

    async signOut() {
        try {
            await this.auth.signOut();
            return true;
        } catch (error) {
            console.error('Error signing out:', error);
            return false;
        }
    }
} 