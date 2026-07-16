/**
 * MastaNote AI+ - Module d'intégration de licences Chariow
 * Conçu de manière isolée pour ne pas perturber les fonctions existantes de l'application.
 */

// CONFIGURATION DU PRODUIT
const CHARIOW_CONFIG = {
    // Remplacer par votre clé API secrète (sk_...) de Chariow
    API_KEY: "sk_dfuwgamt_43dbdad90595be06d27aafcc2746274a", 
    
    // CORRECTION : L'URL est désormais dynamique pour éviter l'erreur ERR_NAME_NOT_RESOLVED de api.chariow.com.
    // Si l'application tourne sur localhost, elle appelle le serveur local, sinon elle appelle votre propre serveur Render.
    API_URL: (typeof window !== 'undefined' && window.location.hostname === 'localhost')
        ? "http://localhost:5000/v1/licenses/validate"
        : "https://mastanote-ai.onrender.com/v1/licenses/validate",
    
    // Vos IDs de produits récupérés
    PRODUCTS: {
        ONE_YEAR: "prd_z2kjla30",
        THREE_YEARS: "prd_6duiuhl1",
        FIVE_YEARS: "prd_s877x4vl" // Premium (Donne accès aux fiches)
    },
    
    // Vos liens de paiement configurés
    LINKS: {
        ONE_YEAR: "https://soudoboutik-ebook.mychariow.shop/prd_z2kjla30/checkout",
        THREE_YEARS: "https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1/checkout",
        FIVE_YEARS: "https://soudoboutik-ebook.mychariow.shop/prd_s877x4vl/checkout"
    }
};

// GESTION DU STOCKAGE LOCAL (PERSISTANCE)
const LicenceManager = {
    // Sauvegarder les infos de licence dans le navigateur de l'enseignant
    saveLicence(licenseKey, productId, expiryDate) {
        localStorage.setItem("mastanote_licence_key", licenseKey);
        localStorage.setItem("mastanote_product_id", productId);
        localStorage.setItem("mastanote_expiry_date", expiryDate);
        localStorage.setItem("mastanote_is_active", "true");
    },

    // Récupérer les infos locales
    getLicence() {
        return {
            key: localStorage.getItem("mastanote_licence_key"),
            productId: localStorage.getItem("mastanote_product_id"),
            expiryDate: localStorage.getItem("mastanote_expiry_date"),
            isActive: localStorage.getItem("mastanote_is_active") === "true"
        };
    },

    // Déconnecter / Réinitialiser la licence
    clearLicence() {
        localStorage.removeItem("mastanote_licence_key");
        localStorage.removeItem("mastanote_product_id");
        localStorage.removeItem("mastanote_expiry_date");
        localStorage.removeItem("mastanote_is_active");
    },

    // Vérifier si l'utilisateur possède l'accès de base (Toutes les licences)
    hasAccess() {
        const licence = this.getLicence();
        if (!licence.isActive) return false;

        // Vérification de la date d'expiration
        if (licence.expiryDate) {
            const today = new Date();
            const expiry = new Date(licence.expiryDate);
            if (today > expiry) {
                this.clearLicence(); // Expirée
                return false;
            }
        }
        return true;
    },

    // Vérifier si l'utilisateur a accès au bouton "Télécharger vos fiches" (Uniquement formule 5 Ans)
    hasPremiumAccess() {
        if (!this.hasAccess()) return false;
        const licence = this.getLicence();
        return licence.productId === CHARIOW_CONFIG.PRODUCTS.FIVE_YEARS;
    },

    // APPEL API POUR VALIDER UNE CLÉ
    async validateKeyWithChariow(inputKey) {
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
                // Succès : Sauvegarde locale des informations
                this.saveLicence(inputKey, data.product_id, data.expires_at);
                return { success: true, message: "Licence activée avec succès !" };
            } else {
                return { success: false, message: data.message || "Clé invalide ou expirée." };
            }
        } catch (error) {
            console.error("Erreur de validation:", error);
            return { success: false, message: "Erreur réseau. Veuillez vérifier votre connexion internet." };
        }
    }
};