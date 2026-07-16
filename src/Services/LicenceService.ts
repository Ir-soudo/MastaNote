// src/services/licenceService.ts

/**
 * Détermine dynamiquement l'URL de l'API de licence.
 * S'adapte automatiquement à l'environnement StackBlitz (WebContainers), Localhost ou Production (Render).
 */
export const getDynamicApiUrl = (): string => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
  
      // 1. Détection de l'environnement StackBlitz / WebContainer
      if (hostname.includes('webcontainer.io') || hostname.includes('stackblitz')) {
        // Extrait le sous-domaine unique de StackBlitz (ex: mastanote-4ob5--5173--87cf54cd)
        const parts = hostname.split('.');
        const subDomain = parts[0];
        
        // Remplace le port de preview (souvent 5173) par le port du serveur backend (5000)
        const backendSubDomain = subDomain.replace('--5173--', '--5000--');
        
        return `https://${backendSubDomain}.${parts.slice(1).join('.')}`;
      }
    }
  
    // 2. Détection de l'environnement Localhost classique
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:5000';
    }
  
    // 3. URL de production par défaut (Render)
    return 'https://mastanote-ai.onrender.com';
  };
  
  export interface ActivationResponse {
    success: boolean;
    message: string;
    isBypass?: boolean;
  }
  
  /**
   * Service de gestion des licences
   */
  export const licenceService = {
    /**
     * Valide une clé de licence auprès du serveur (avec secours local intelligent)
     */
    async validerLicence(cle: string): Promise<ActivationResponse> {
      const API_URL = getDynamicApiUrl();
  
      try {
        // Tentative de validation en ligne auprès du serveur configuré
        const response = await fetch(`${API_URL}/api/licence/valider`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cle }),
        });
  
        if (!response.ok) {
          throw new Error(`Erreur serveur: ${response.status}`);
        }
  
        const data = await response.json();
        return {
          success: data.success,
          message: data.message || 'Licence validée avec succès.',
        };
  
      } catch (error) {
        console.warn("Connexion réseau impossible avec l'API. Tentative de validation en mode secours...", error);
  
        // Système de secours hors-ligne (Bypass) :
        // Si le serveur est inaccessible et que la clé commence par "MN-", on valide localement.
        if (cle && cle.trim().toUpperCase().startsWith('MN-')) {
          return {
            success: true,
            message: 'Validation hors-ligne réussie (Mode Secours Activé).',
            isBypass: true,
          };
        }
  
        // Si la clé ne respecte pas le format de secours, on signale l'erreur réseau standard
        return {
          success: false,
          message: "Impossible de joindre le serveur d'activation. Veuillez vérifier votre connexion ou utiliser une clé de secours (MN-...).",
        };
      }
    },
  
    /**
     * Sauvegarde localement le statut de la licence dans le navigateur
     */
    sauvegarderStatutLocal(cle: string, active: boolean): void {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mastanote_licence_active', active ? 'true' : 'false');
        localStorage.setItem('mastanote_licence_cle', cle);
      }
    },
  
    /**
     * Récupère le statut de la licence sauvegardé localement
     */
    getStatutLocal(): { active: boolean; cle: string } {
      if (typeof window !== 'undefined') {
        const active = localStorage.getItem('mastanote_licence_active') === 'true';
        const cle = localStorage.getItem('mastanote_licence_cle') || '';
        return { active, cle };
      }
      return { active: false, cle: '' };
    },
  
    /**
     * Supprime la licence stockée localement (Déconnexion)
     */
    reinitialiserLicence(): void {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mastanote_licence_active');
        localStorage.removeItem('mastanote_licence_cle');
      }
    }
  };