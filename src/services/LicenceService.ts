// src/services/licenceService.ts

export const CHARIOW_CONFIG = {
    API_KEY: "sk_dfuwgamt_43dbdad90595be06d27aafcc2746274a", // Remplacez par votre clé sk_... de Chariow
    API_URL: "https://api.chariow.com/v1/licenses/validate",
    PRODUCTS: {
        ONE_YEAR: "prd_z2kjla30",
        THREE_YEARS: "prd_6duiuhl1",
        FIVE_YEARS: "prd_s877x4vl" // Premium
    },
    LINKS: {
        ONE_YEAR: "https://soudoboutik-ebook.mychariow.shop/prd_z2kjla30/checkout",
        THREE_YEARS: "https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1/checkout",
        FIVE_YEARS: "https://soudoboutik-ebook.mychariow.shop/prd_s877x4vl/checkout"
    }
};

export const LicenceService = {
    saveLicence(licenseKey: string, productId: string, expiryDate: string): void {
        localStorage.setItem("mastanote_licence_key", licenseKey);
        localStorage.setItem("mastanote_product_id", productId);
        localStorage.setItem("mastanote_expiry_date", expiryDate);
        localStorage.setItem("mastanote_is_active", "true");
    },

    getLicence() {
        return {
            key: localStorage.getItem("mastanote_licence_key"),
            productId: localStorage.getItem("mastanote_product_id"),
            expiryDate: localStorage.getItem("mastanote_expiry_date"),
            isActive: localStorage.getItem("mastanote_is_active") === "true"
        };
    },

    clearLicence(): void {
        localStorage.removeItem("mastanote_licence_key");
        localStorage.removeItem("mastanote_product_id");
        localStorage.removeItem("mastanote_expiry_date");
        localStorage.removeItem("mastanote_is_active");
    },

    hasAccess(): boolean {
        const licence = this.getLicence();
        if (!licence.isActive) return false;

        if (licence.expiryDate) {
            const today = new Date();
            const expiry = new Date(licence.expiryDate);
            if (today > expiry) {
                this.clearLicence();
                return false;
            }
        }
        return true;
    },

    hasPremiumAccess(): boolean {
        if (!this.hasAccess()) return false;
        const licence = this.getLicence();
        return licence.productId === CHARIOW_CONFIG.PRODUCTS.FIVE_YEARS;
    },

    async validateKeyWithChariow(inputKey: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(CHARIOW_CONFIG.API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${CHARIOW_CONFIG.API_KEY}`
                },
                body: JSON.stringify({
                    license_key: inputKey
                })
            });

            const data = await response.json();

            if (response.ok && data.is_active) {
                this.saveLicence(inputKey, data.product_id, data.expires_at);
                return { success: true, message: "Licence activée avec succès !" };
            } else {
                return { success: false, message: data.message || "Clé invalide ou expirée." };
            }
        } catch (error) {
            console.error("Erreur de validation Chariow:", error);
            return { success: false, message: "Erreur réseau. Veuillez vérifier votre connexion." };
        }
    }
};