// Adobe CEP CSInterface Library (simplified version)
// This provides communication between the panel and Premiere Pro

function CSInterface() {
    this.hostEnvironment = null;
}

CSInterface.prototype.getHostEnvironment = function() {
    if (!this.hostEnvironment) {
        this.hostEnvironment = {
            appName: "PPRO",
            appVersion: "15.0.0",
            appLocale: "en_US"
        };
    }
    return this.hostEnvironment;
};

CSInterface.prototype.evalScript = function(script, callback) {
    try {
        if (typeof window.__adobe_cep__ !== 'undefined') {
            return window.__adobe_cep__.evalScript(script, callback);
        } else {
            // Fallback for development/testing
            console.log("CEP evalScript:", script);
            if (callback) {
                callback("Development mode - script executed");
            }
        }
    } catch (e) {
        console.error("Error in evalScript:", e);
        if (callback) {
            callback("Error: " + e.toString());
        }
    }
};

CSInterface.prototype.addEventListener = function(type, listener, obj) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        return window.__adobe_cep__.addEventListener(type, listener, obj);
    } else {
        // Fallback for development
        document.addEventListener(type, listener);
    }
};

CSInterface.prototype.removeEventListener = function(type, listener, obj) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        return window.__adobe_cep__.removeEventListener(type, listener, obj);
    } else {
        // Fallback for development
        document.removeEventListener(type, listener);
    }
};

CSInterface.prototype.requestOpenExtension = function(extensionId, params) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        return window.__adobe_cep__.requestOpenExtension(extensionId, params);
    }
};

CSInterface.prototype.getExtensions = function(extensionIds) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        return window.__adobe_cep__.getExtensions(extensionIds);
    }
    return [];
};

CSInterface.prototype.closeExtension = function() {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        return window.__adobe_cep__.closeExtension();
    }
};

CSInterface.prototype.getSystemPath = function(pathType) {
    if (typeof window.__adobe_cep__ !== 'undefined') {
        return window.__adobe_cep__.getSystemPath(pathType);
    }
    return "";
};

// System path constants
CSInterface.SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
};

// Theme constants
CSInterface.Theme = {
    DARKEST: "darkest",
    DARK: "dark",
    MEDIUM: "medium",
    LIGHT: "light",
    LIGHTEST: "lightest"
};

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSInterface;
} else {
    window.CSInterface = CSInterface;
}