export interface LicenceDetails {
  key: string;
  productId: string;
  expiryDate: string | null;
  active: boolean;
}

export class LicenceService {
  private static STORAGE_KEY = 'mastanote_licence_data';

  /**
   * Enregistre les détails de la licence validée par Chariow dans le localStorage
   */
  static saveLicence(details: LicenceDetails): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(details));
  }

  /**
   * Récupère les informations de la licence stockée
   */
  static getLicence(): LicenceDetails {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (!data) {
      return { key: '', productId: '', expiryDate: null, active: false };
    }
    try {
      return JSON.parse(data);
    } catch {
      return { key: '', productId: '', expiryDate: null, active: false };
    }
  }

  /**
   * Vérifie si l'utilisateur possède un accès actif (Licence valide et non expirée)
   */
  static hasAccess(): boolean {
    const licence = this.getLicence();
    if (!licence.active) return false;
    
    // Si une date d'expiration existe, on vérifie si elle est dépassée
    if (licence.expiryDate) {
      const expiry = new Date(licence.expiryDate);
      return expiry > new Date();
    }
    
    return true;
  }

  /**
   * Vérifie spécifiquement si l'utilisateur a la formule VIP Premium 5 Ans (produit spécifique)
   */
  static hasPremiumAccess(): boolean {
    const licence = this.getLicence();
    if (!this.hasAccess()) return false;
    
    // ID Produit Chariow correspondant à la formule 5 Ans
    return licence.productId === 'prd_s877x4vl';
  }

  /**
   * Supprime la licence active (Déconnexion / Révocation)
   */
  static clearLicence(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}