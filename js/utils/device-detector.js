export class DeviceDetector {
    static isMobileDevice() {
        const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        );

        const isIPadOS = (
            navigator.platform === 'MacIntel' && 
            navigator.maxTouchPoints > 0 &&
            !navigator.userAgent.includes('Windows')
        );

        return isMobileUserAgent || isIPadOS;
    }

    static addDeviceClass() {
        document.body.classList.add(
            this.isMobileDevice() ? 'mobile-device' : 'desktop-device'
        );
    }
} 