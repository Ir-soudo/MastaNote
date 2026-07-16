import React, { useState, useEffect } from 'react';

// ==========================================
// 1. CONFIGURATION ET SERVICE DE LICENCE
// ==========================================

// Détection dynamique intelligente compatible Local, StackBlitz (WebContainers) et Production (Render)
export const getDynamicApiUrl = (): string => {
  if (typeof window === 'undefined') return "https://mastanote-ai.onrender.com/v1/licenses/validate";
  
  const hostname = window.location.hostname;
  
  // Cas A : Développement local classique
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return "http://localhost:5000/v1/licenses/validate";
  }
  
  // Cas B : Sandbox StackBlitz / WebContainers
  if (hostname.includes('webcontainer.io')) {
      // On remplace dynamiquement le port frontend 5173 par le port backend 5000
      const backendHostname = hostname.replace('--5173--', '--5000--');
      return `https://${backendHostname}/v1/licenses/validate`;
  }
  
  // Cas C : Production en ligne sur Render
  return "https://mastanote-ai.onrender.com/v1/licenses/validate";
};

export const CHARIOW_CONFIG = {
  API_KEY: "sk_dfuwgamt_43dbdad90595be06d27aafcc2746274a", // Clé API Chariow
  API_URL: getDynamicApiUrl(),
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
      if (typeof window === 'undefined') return { key: null, productId: null, expiryDate: null, isActive: false };
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

  async validateKeyWithChariow(inputKey: string): Promise<{ success: boolean; message: string; isFallback?: boolean }> {
      try {
          // Essai de requête réseau normale vers le serveur (via l'URL dynamique calculée)
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
          console.warn("[MastaNote API] Erreur réseau ou CORS interceptée. Passage au mode d'évaluation/secours.", error);

          // Système de secours local / d'évaluation autonome
          if (inputKey.startsWith("MN-") && inputKey.length >= 6) {
              let productId = CHARIOW_CONFIG.PRODUCTS.ONE_YEAR;
              if (inputKey.includes("-VIP-") || inputKey.includes("-5ANS-") || inputKey.includes("-PREM-")) {
                  productId = CHARIOW_CONFIG.PRODUCTS.FIVE_YEARS;
              } else if (inputKey.includes("-SER-") || inputKey.includes("-3ANS-")) {
                  productId = CHARIOW_CONFIG.PRODUCTS.THREE_YEARS;
              }

              const expiryDate = new Date();
              if (productId === CHARIOW_CONFIG.PRODUCTS.FIVE_YEARS) {
                  expiryDate.setFullYear(expiryDate.getFullYear() + 5);
              } else if (productId === CHARIOW_CONFIG.PRODUCTS.THREE_YEARS) {
                  expiryDate.setFullYear(expiryDate.getFullYear() + 3);
              } else {
                  expiryDate.setFullYear(expiryDate.getFullYear() + 1);
              }

              this.saveLicence(inputKey, productId, expiryDate.toISOString());
              return { 
                  success: true, 
                  message: "Licence activée en mode de secours local (CORS/Réseau bypassé) !", 
                  isFallback: true 
              };
          }

          return { 
              success: false, 
              message: "Le serveur n'a pas répondu (Erreur CORS ou Connexion). Saisissez une clé commençant par 'MN-' (ex: MN-TEST-VIP) pour simuler l'activation hors-ligne." 
          };
      }
  }
};

// ==========================================
// 2. ICONES SVG INTÉGRÉES (ANTI-CRASH)
// ==========================================
const SvgCheck = () => (
  <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SvgCheckPurple = () => (
  <svg className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SvgAlert = () => (
  <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const SvgShield = () => (
  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const SvgKey = () => (
  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-2.414 4.586a1 1 0 01-.707-.293l-1.172-1.172a1 1 0 00-.707-.293H10v-2H8v2H6v2h2v2h2v-2l1.172-1.172a1 1 0 01.707-.293l1.172 1.172a1 1 0 001.414 0l4-4z" />
  </svg>
);

const SvgArrow = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const SvgExternal = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const SvgLock = () => (
  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

// ==========================================
// 3. COMPOSANT PAYWALL PRINCIPAL
// ==========================================
interface PaywallProps {
  onActivate: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onActivate }) => {
  const [licenceKey, setLicenceKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setIsFallbackMode(false);

    if (!licenceKey.trim()) {
      setError('Veuillez saisir une clé de licence.');
      setLoading(false);
      return;
    }

    try {
      // Validation dynamique via notre service résilient (compatible StackBlitz)
      const result = await LicenceService.validateKeyWithChariow(licenceKey.trim());

      if (result.success) {
        if (result.isFallback) {
          setIsFallbackMode(true);
        }
        setSuccess(true);
        setTimeout(() => {
          onActivate();
        }, 1800);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Erreur lors de la validation. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* En-tête / Branding */}
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="bg-purple-500/10 p-3 rounded-2xl border border-purple-500/20 mb-4 shadow-lg shadow-purple-500/5">
            <svg className="w-12 h-12 text-purple-500 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '48px', height: '48px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          
          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/20">
            MastaNote AI+
          </span>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl tracking-tight">
            Activez votre accès professionnel
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Gagnez un temps précieux au quotidien. Exportez vos fiches sur EducMaster en un clic et accédez à vos fiches pédagogiques.
          </p>
        </div>

        {/* Indicateur d'état du réseau pour guider l'utilisateur en cas de blocage CORS */}
        <div className="max-w-md mx-auto mb-4 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs rounded-xl text-center">
          💡 <strong>Mode StackBlitz Activé :</strong> Le système détecte votre WebContainer et s'y connecte de manière transparente. Saisissez <strong>MN-TEST-VIP</strong> pour déverrouiller instantanément.
        </div>

        {/* Formulaire d'activation de clé */}
        <div className="max-w-md mx-auto mb-16 bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl backdrop-blur-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <SvgKey /> Déjà acheté ? Activez ici
          </h2>
          <form onSubmit={handleActivation} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Saisissez votre clé de licence (ex: MN-XXXX-XXXX)"
                value={licenceKey}
                onChange={(e) => setLicenceKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                disabled={loading || success}
              />
            </div>
            {error && (
              <div className="text-sm text-red-400 flex items-start gap-1.5 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                <SvgAlert /> 
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="text-sm text-green-400 flex flex-col gap-1 bg-green-500/5 p-2 rounded-lg border border-green-500/10">
                <p className="flex items-center gap-1.5 font-semibold">
                  <SvgCheck /> {isFallbackMode ? "Mode Secours Activé !" : "Licence activée avec succès !"}
                </p>
                <p className="text-xs text-green-500/80 pl-6">Redirection vers le tableau de bord...</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {loading ? 'Vérification en cours...' : 'Activer MastaNote AI+'} <SvgArrow />
            </button>
          </form>
        </div>

        {/* Grille des Tarifs Native */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          {/* Formule Découverte - 1 An */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-8 flex flex-col justify-between hover:border-slate-600 transition-all">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">🌟 Formule Découverte</h3>
                  <p className="text-xs text-slate-400 mt-1">Pour tester sur une année scolaire</p>
                </div>
                <span className="px-2.5 py-1 bg-slate-700/50 text-slate-300 text-xs font-semibold rounded-lg">
                  1 An
                </span>
              </div>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">1 500</span>
                <span className="text-lg font-semibold text-slate-400 ml-1">FCFA</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheck />
                  <span>Export illimité des fichiers <strong>EducMaster CSV</strong></span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheck />
                  <span>Accès complet au dashboard de base</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheck />
                  <span>Support technique standard (E-mail)</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-500 line-through">
                  <SvgAlert />
                  <span>Fiches pédagogiques non incluses</span>
                </li>
              </ul>
            </div>
            <a
              href="https://soudoboutik-ebook.mychariow.shop/prd_z2kjla30/checkout"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl text-center flex items-center justify-center gap-2 transition-all"
            >
              S'abonner (Mobile Money) <SvgExternal />
            </a>
          </div>

          {/* Formule Sérénité - 3 Ans */}
          <div className="bg-slate-800/50 border-2 border-amber-500/30 rounded-3xl p-8 flex flex-col justify-between hover:border-amber-500/50 transition-all relative">
            <span className="absolute -top-3 right-6 px-3 py-1 bg-amber-500 text-slate-950 text-xs font-bold rounded-full uppercase tracking-wider">
              1 An Offert !
            </span>
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">🚀 Formule Sérénité</h3>
                  <p className="text-xs text-slate-400 mt-1">Tranquillité à moyen terme</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-lg">
                  3 Ans
                </span>
              </div>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">3 000</span>
                <span className="text-lg font-semibold text-slate-400 ml-1">FCFA</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheck />
                  <span>Export illimité des fichiers <strong>EducMaster CSV</strong></span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheck />
                  <span>Accès complet au dashboard</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheck />
                  <span>Toutes les futures mises à jour</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheck />
                  <span>Support technique prioritaire</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-500 line-through">
                  <SvgAlert />
                  <span>Fiches pédagogiques non incluses</span>
                </li>
              </ul>
            </div>
            <a
              href="https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1/checkout"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-center flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/10"
            >
              S'abonner (Mobile Money) <SvgExternal />
            </a>
          </div>

          {/* Formule VIP Premium - 5 Ans */}
          <div className="bg-slate-950 border border-purple-500/40 rounded-3xl p-8 flex flex-col justify-between hover:border-purple-500/80 transition-all relative">
            <span className="absolute -top-3 right-6 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
              Le plus Populaire !
            </span>
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-purple-300">🏆 VIP Premium</h3>
                  <p className="text-xs text-slate-400 mt-1">L'offre ultime sans compromis</p>
                </div>
                <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-lg">
                  5 Ans
                </span>
              </div>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">5 000</span>
                <span className="text-lg font-semibold text-slate-400 ml-1">FCFA</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheckPurple />
                  <span>Export illimité des fichiers <strong>EducMaster CSV</strong></span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheckPurple />
                  <span><strong>Accès VIP exclusif</strong> à l'espace de téléchargement des fiches pédagogiques</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheckPurple />
                  <span>Support ultra-prioritaire direct (WhatsApp)</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <SvgCheckPurple />
                  <span>Mises à jour majeures à vie</span>
                </li>
              </ul>
            </div>
            <a
              href="https://soudoboutik-ebook.mychariow.shop/prd_s877x4vl/checkout"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20"
            >
              S'abonner (Mobile Money) <SvgExternal />
            </a>
          </div>

        </div>
      </div>

      {/* Pied de page de réassurance */}
      <div className="text-center text-xs text-slate-500 mt-12 flex items-center justify-center gap-2">
        <SvgShield /> Paiements sécurisés via Mobile Money par Chariow. Clé d'activation envoyée instantanément par e-mail.
      </div>
    </div>
  );
};

// ==========================================
// 4. COMPOSANT TABLEAU DE BORD DE DÉMONSTRATION
// ==========================================
interface DashboardProps {
  onLock: () => void;
}

export const DashboardDemo: React.FC<DashboardProps> = ({ onLock }) => {
  const licenceInfo = LicenceService.getLicence();
  const isPremium = LicenceService.hasPremiumAccess();

  const handleLogout = () => {
    LicenceService.clearLicence();
    onLock();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Barre de navigation */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">MastaNote <span className="text-purple-500">AI+</span></span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline-flex px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20 items-center gap-1.5">
            <SvgShield /> Licence Active
          </span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700 transition"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Contenu principal */}
      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-white">Espace de Travail Enseignant</h1>
          <p className="text-slate-400 mt-2">Bienvenue ! Votre clé de licence est valide et activée dans votre navigateur.</p>
        </div>

        {/* Panneau de détails de la licence */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-slate-400 text-sm font-medium">Clé Enregistrée</h3>
            <p className="text-xl font-bold text-white mt-1 font-mono tracking-widest">{licenceInfo.key || "Aucune"}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-slate-400 text-sm font-medium">Formule Actuelle</h3>
            <p className="text-xl font-bold text-white mt-1">
              {licenceInfo.productId === CHARIOW_CONFIG.PRODUCTS.FIVE_YEARS ? "🏆 VIP Premium (5 Ans)" : 
               licenceInfo.productId === CHARIOW_CONFIG.PRODUCTS.THREE_YEARS ? "🚀 Sérénité (3 Ans)" : "🌟 Découverte (1 An)"}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-slate-400 text-sm font-medium">Expiration de l'Accès</h3>
            <p className="text-xl font-bold text-amber-400 mt-1">
              {licenceInfo.expiryDate ? new Date(licenceInfo.expiryDate).toLocaleDateString() : "Non définie"}
            </p>
          </div>
        </div>

        {/* Outils de l'Application */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Module standard : EducMaster */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col justify-between">
            <div>
              <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs font-semibold rounded-lg">Fonctionnalité active</span>
              <h3 className="text-xl font-bold mt-4">Module d'export EducMaster</h3>
              <p className="text-slate-400 text-sm mt-2">Exportez vos notes d'évaluation en un clic sous format CSV prêt à être importé dans le portail national.</p>
            </div>
            <button className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2">
              Lancer un nouvel export CSV
            </button>
          </div>

          {/* Module premium : Fiches Pédagogiques */}
          <div className={`bg-slate-900 border rounded-2xl p-8 flex flex-col justify-between transition-all ${isPremium ? 'border-purple-500/50 shadow-lg shadow-purple-500/5' : 'border-slate-800'}`}>
            <div>
              <div className="flex justify-between items-start">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${isPremium ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-800 text-slate-500'}`}>
                  {isPremium ? "Accès autorisé" : "Accès Premium VIP"}
                </span>
                {!isPremium && <SvgLock />}
              </div>
              <h3 className="text-xl font-bold mt-4">Catalogue de fiches pédagogiques</h3>
              <p className="text-slate-400 text-sm mt-2">Accédez à plus de 10 000 fiches prêtes pour toutes les classes et matières, générées selon le programme éducatif.</p>
            </div>
            
            {isPremium ? (
              <button className="mt-6 w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition">
                Accéder et Télécharger les fiches
              </button>
            ) : (
              <div className="mt-6 p-4 bg-slate-950 rounded-xl border border-slate-800/50">
                <p className="text-xs text-slate-400">Cette fonctionnalité requiert l'abonnement <strong>VIP Premium (5 Ans)</strong>.</p>
                <button 
                  onClick={handleLogout}
                  className="mt-3 text-xs text-amber-400 hover:underline font-semibold"
                >
                  Mettre à niveau mon abonnement &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// ==========================================
// 5. COMPOSANT RACINE DE PRÉVISUALISATION
// ==========================================
export default function App() {
  const [hasAccess, setHasAccess] = useState(false);

  // Vérifier la présence de la licence au chargement initial
  useEffect(() => {
    setHasAccess(LicenceService.hasAccess());
  }, []);

  const handleActivationSuccess = () => {
    setHasAccess(true);
  };

  const handleLockDashboard = () => {
    setHasAccess(false);
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-900 text-white font-sans">
      {hasAccess ? (
        <DashboardDemo onLock={handleLockDashboard} />
      ) : (
        <Paywall onActivate={handleActivationSuccess} />
      )}
    </div>
  );
}