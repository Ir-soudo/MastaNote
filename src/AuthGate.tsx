import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User
} from 'firebase/auth';
import { AlertTriangle, BookOpen, CheckCircle, Eye, EyeOff, X } from 'lucide-react';
import { auth, firebaseConfigOk, missingFirebaseConfig } from './firebase';

// ==========================================================
// CONFIGURATION
// ==========================================================
const MIN_PASSWORD_LENGTH = 8;
const RESEND_COOLDOWN_SECONDS = 60;
const SLOW_LOADING_MS = 10000;

// ⚠️ TEXTE À FAIRE RELIRE ET COMPLÉTER AVANT MISE EN LIGNE ⚠️
// Ce brouillon décrit ce que fait l'application aujourd'hui. Il n'a PAS été validé juridiquement.
// Les coordonnées de l'éditeur ont été renseignées le 21/10/2026. Faites relire l'ensemble par une personne compétente
// (obligations de protection des données applicables au Bénin, données d'élèves mineurs).
const TERMS_SECTIONS: { title: string; body: string }[] = [
  {
    title: "1. Qui sommes-nous ?",
    body:
      "MastaNote AI+ est un outil d'aide à la gestion des notes pour les enseignants du Primaire au Bénin. " +
      "Il est compatible avec les fichiers d'EducMaster mais ne remplace pas la plateforme officielle : " +
      "les données qui font foi sont celles saisies et validées dans EducMaster. " +
      "Éditeur : Irénée Soudo."
  },
  {
    title: "2. Les données que nous traitons",
    body:
      "Votre compte : adresse e-mail et mot de passe (géré par le service d'identification de Google Firebase). " +
      "Vos données de travail (classes, élèves, notes) sont enregistrées sur votre appareil. " +
      "Lorsque vous utilisez le scanner ou l'assistant, les photos ou captures d'écran que vous choisissez d'envoyer " +
      "sont transmises à notre serveur puis à un service d'intelligence artificielle de Google pour être analysées. " +
      "MastaNote ne conserve pas ces images ; le prestataire les traite selon ses propres conditions."
  },
  {
    title: "3. Données d'élèves",
    body:
      "Vous restez responsable des données d'élèves (mineurs) que vous saisissez ou photographiez. " +
      "N'envoyez au scanner ou à l'assistant que ce qui est nécessaire, et masquez les informations inutiles " +
      "(noms, matricules, mots de passe) sur les captures d'écran."
  },
  {
    title: "4. Prestataires",
    body:
      "Google Firebase (comptes), Google (analyse d'images et assistant), Chariow (paiement et licences). " +
      "Chacun applique ses propres conditions."
  },
  {
    title: "5. Vos droits",
    body:
      "Pour consulter, corriger ou supprimer votre compte, écrivez à contact.soudo@gmail.com."
  },
  {
    title: "6. Fiabilité des résultats",
    body:
      "L'intelligence artificielle peut se tromper (lecture d'écriture manuscrite, rapprochement des noms, ventilation des notes). " +
      "Vérifiez toujours les notes avant de les enregistrer et avant d'exporter vers EducMaster."
  },
  {
    title: "7. Évolutions",
    body:
      "Ces conditions peuvent évoluer. La version en vigueur est celle affichée dans l'application. " +
      "Dernière mise à jour : 21/10/2026."
  }
];

// ==========================================================
// MESSAGES D'ERREUR EN FRANÇAIS
// ==========================================================
const frenchAuthError = (err: unknown): string => {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return "Adresse e-mail invalide.";
    case 'auth/email-already-in-use':
      return "Cette adresse est déjà utilisée. Connectez-vous, ou réinitialisez votre mot de passe.";
    case 'auth/weak-password':
      return `Mot de passe trop faible (${MIN_PASSWORD_LENGTH} caractères minimum).`;
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return "E-mail ou mot de passe incorrect.";
    case 'auth/user-disabled':
      return "Ce compte a été désactivé. Contactez le support.";
    case 'auth/too-many-requests':
      return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
    case 'auth/network-request-failed':
      return "Connexion internet indisponible. Vérifiez votre réseau, puis réessayez.";
    case 'auth/popup-blocked':
      return "Le navigateur a bloqué la fenêtre Google. Autorisez les fenêtres surgissantes, ou utilisez votre e-mail.";
    case 'auth/unauthorized-domain':
      return "Ce site n'est pas encore autorisé pour la connexion Google. Utilisez votre e-mail, ou contactez le support.";
    case 'auth/operation-not-allowed':
      return "Ce mode de connexion n'est pas activé. Contactez le support.";
    default:
      return "Une erreur est survenue. Réessayez dans un instant.";
  }
};

// ==========================================================
// CONTEXTE : donne l'utilisateur connecté au reste de l'application
// ==========================================================
type AuthContextValue = {
  authUser: User | null;
  emailVerified: boolean;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  authUser: null,
  emailVerified: false,
  signOutUser: async () => {}
});

export const useAuth = () => useContext(AuthContext);

// ==========================================================
// FOURNISSEUR D'IDENTITÉ : suit l'état de connexion et le partage avec l'application (useAuth).
// Un visiteur non connecté voit la page d'accueil ; l'écran de connexion s'ouvre depuis celle-ci (AuthScreen).
// ==========================================================
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'out' | 'in'>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [slow, setSlow] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!firebaseConfigOk) return undefined;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setStatus(u ? 'in' : 'out');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (status !== 'loading') return undefined;
    const t = setTimeout(() => setSlow(true), SLOW_LOADING_MS);
    return () => clearTimeout(t);
  }, [status]);

  const signOutUser = async () => {
    await signOut(auth);
  };

  // Recharge le profil (après vérification de l'e-mail) et renouvelle le jeton d'identité
  const refreshUser = async () => {
    if (!auth.currentUser) return;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    setTick((t) => t + 1);
  };

  if (!firebaseConfigOk) {
    return <ConfigError />;
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center gap-4 p-6 font-sans">
        <span className="w-8 h-8 border-4 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Chargement...</p>
        {slow && (
          <div className="max-w-xs text-center space-y-3">
            <p className="text-xs text-amber-300">
              La connexion au service d'identification est lente ou impossible. Vérifiez votre connexion internet.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    );
  }

  // Visiteur non connecté : l'application affiche sa page d'accueil (voir App.tsx)

  return (
    <AuthContext.Provider value={{ authUser: user, emailVerified: Boolean(user?.emailVerified), signOutUser }}>
      {user && !user.emailVerified && <VerificationBanner user={user} onRefresh={refreshUser} />}
      {/* La clé force un rechargement complet de l'application quand on change de compte */}
      <React.Fragment key={user ? user.uid : 'anonymous'}>{children}</React.Fragment>
    </AuthContext.Provider>
  );
}

// ==========================================================
// BANDEAU : e-mail pas encore vérifié (n'empêche pas d'utiliser l'application)
// ==========================================================
function ConfigError() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-950 border border-amber-500/40 rounded-3xl p-6 space-y-3 shadow-2xl">
        <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
          <AlertTriangle className="w-5 h-5" />
          Configuration manquante
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Le service d'identification n'est pas configuré sur ce site. Les variables suivantes sont absentes :
        </p>
        <ul className="text-[11px] font-mono text-amber-200 bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-0.5">
          {missingFirebaseConfig.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-500">
          Ajoutez-les (fichier .env en local, variables d'environnement sur Render), puis redémarrez le serveur.
        </p>
      </div>
    </div>
  );
}

function VerificationBanner({ user, onRefresh }: { user: User; onRefresh: () => Promise<void> }) {
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setBusy(true);
    setMsg('');
    try {
      await sendEmailVerification(user);
      setMsg("E-mail envoyé. Pensez à vérifier vos courriers indésirables.");
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setMsg(frenchAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setBusy(true);
    setMsg('');
    try {
      await onRefresh();
      if (!auth.currentUser?.emailVerified) {
        setMsg("Votre adresse n'est pas encore vérifiée. Ouvrez le lien reçu par e-mail, puis réessayez.");
      }
    } catch (err) {
      setMsg(frenchAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-amber-950/60 border-b border-amber-500/30 px-4 py-2.5 text-amber-200">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <p className="text-xs flex-1">
          <strong>Vérifiez votre adresse e-mail</strong> ({user.email}) : cette vérification sera bientôt nécessaire pour utiliser le scanner et l'assistant.
          {msg && <span className="block text-amber-300 mt-0.5">{msg}</span>}
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={resend}
            disabled={busy || cooldown > 0}
            className="bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-50 border border-amber-500/40 text-amber-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            {cooldown > 0 ? `Renvoyer (${cooldown}s)` : "Renvoyer l'e-mail"}
          </button>
          <button
            onClick={check}
            disabled={busy}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-black px-3 py-1.5 rounded-lg transition-colors"
          >
            J'ai vérifié
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================================
// ÉCRAN DE CONNEXION / INSCRIPTION / MOT DE PASSE OUBLIÉ
// ==========================================================
type Mode = 'login' | 'signup' | 'reset';

export function AuthScreen({ initialMode = 'login', onBack }: { initialMode?: Mode; onBack?: () => void }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [showTerms, setShowTerms] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setInfo('');
    setPassword('');
    setPassword2('');
  };

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError(frenchAuthError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const mail = email.trim();
    if (!mail) {
      setError('Saisissez votre adresse e-mail.');
      return;
    }

    if (mode === 'reset') {
      setBusy(true);
      try {
        await sendPasswordResetEmail(auth, mail);
        setInfo(
          "Si cette adresse correspond à un compte, un e-mail de réinitialisation vient d'être envoyé. Pensez à vérifier vos courriers indésirables."
        );
      } catch (err) {
        setError(frenchAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
      return;
    }

    if (mode === 'signup') {
      if (password !== password2) {
        setError('Les deux mots de passe ne sont pas identiques.');
        return;
      }
      if (!acceptTerms) {
        setError("Vous devez accepter les conditions d'utilisation et la politique de confidentialité.");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, mail, password);
        try {
          await sendEmailVerification(cred.user);
        } catch (verifyErr) {
          // Non bloquant : le bandeau de l'application permet de renvoyer l'e-mail
          console.error(verifyErr);
        }
      } else {
        await signInWithEmailAndPassword(auth, mail, password);
      }
      // Succès : AuthGate détecte la connexion et affiche l'application
    } catch (err) {
      setError(frenchAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    'w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-60';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            ← Retour à l'accueil
          </button>
        )}

        <div className="text-center space-y-2">
          <div className="inline-flex bg-gradient-to-tr from-indigo-600 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-900/30">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-black text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
            MastaNote AI+
          </h1>
          <p className="text-xs text-slate-400">Spécial enseignants du Primaire — Bénin</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          {mode !== 'reset' ? (
            <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  mode === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  mode === 'signup' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Créer un compte
              </button>
            </div>
          ) : (
            <div>
              <h2 className="font-bold text-white text-sm">Mot de passe oublié</h2>
              <p className="text-xs text-slate-400 mt-1">
                Saisissez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.
              </p>
            </div>
          )}

          {mode !== 'reset' && (
            <>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="w-full bg-white hover:bg-slate-100 disabled:opacity-60 text-slate-900 font-bold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2.5 transition-colors"
              >
                <span className="font-black text-base leading-none" style={{ color: '#4285F4' }}>G</span>
                Continuer avec Google
              </button>
              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <span className="flex-1 h-px bg-slate-800" />
                ou avec votre e-mail
                <span className="flex-1 h-px bg-slate-800" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Adresse e-mail</label>
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                placeholder="vous@exemple.com"
                className={inputClass}
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={busy}
                    placeholder={`${MIN_PASSWORD_LENGTH} caractères minimum`}
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    title={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Confirmer le mot de passe</label>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    disabled={busy}
                    className={inputClass}
                  />
                </div>

                <label className="flex items-start gap-2 text-[11px] text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    disabled={busy}
                    className="mt-0.5 w-4 h-4 accent-indigo-500 shrink-0"
                  />
                  <span>
                    J'accepte les{' '}
                    <button
                      type="button"
                      onClick={() => setShowTerms(true)}
                      className="underline text-indigo-300 hover:text-indigo-200"
                    >
                      conditions d'utilisation et la politique de confidentialité
                    </button>
                    .
                  </span>
                </label>
              </>
            )}

            {error && (
              <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 mt-px" />
                <span>{info}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 transition-all"
            >
              {busy && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {mode === 'login' && 'Se connecter'}
              {mode === 'signup' && 'Créer mon compte'}
              {mode === 'reset' && 'Envoyer le lien'}
            </button>
          </form>

          {mode === 'login' && (
            <>
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="block mx-auto text-xs text-slate-400 hover:text-white underline"
              >
                Mot de passe oublié ?
              </button>
              <p className="text-[10px] text-slate-500 text-center">
                En continuant avec Google, vous acceptez les{' '}
                <button type="button" onClick={() => setShowTerms(true)} className="underline hover:text-slate-300">
                  conditions d'utilisation
                </button>
                .
              </p>
            </>
          )}
          {mode === 'reset' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="block mx-auto text-xs text-slate-400 hover:text-white underline"
            >
              Retour à la connexion
            </button>
          )}
        </div>

        <p className="text-center text-[10px] text-slate-600">© 2026 MastaNote AI+ — Primaire Bénin (CI à CM2)</p>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  );
}

// ==========================================================
// FENÊTRE : conditions d'utilisation et confidentialité
// ==========================================================
function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <h3 className="font-bold text-white text-sm">Conditions d'utilisation et confidentialité</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {TERMS_SECTIONS.map((s) => (
            <div key={s.title}>
              <h4 className="text-xs font-bold text-indigo-300 mb-1">{s.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}