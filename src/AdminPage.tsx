import React, { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { auth } from './firebase';

// ==========================================================
// PAGE PRIVÉE « ABONNÉS » — réservée à l'éditeur
//
// Adresse : https://mastanote-ai.onrender.com/?admin=1  (aucun lien dans l'application)
// Cette page n'est PAS la protection : c'est le serveur qui décide (identité Firebase vérifiée + liste ADMIN_UIDS).
// Si le serveur répond « accès réservé », rien n'est affiché. Les données reçues ne sont que des nombres.
// Elle réutilise la session Firebase déjà ouverte dans ce navigateur : connectez-vous d'abord dans l'application.
// ==========================================================

const BACKEND_URL = 'https://mastanote-backend-j9hh.onrender.com';

type ParStatut = { active: number; pending_activation: number; expired: number; revoked: number; autre: number };
type Produit = { id: string; libelle: string; total: number; parStatut: ParStatut; incomplet: boolean };
type Stats = { produits: Produit[]; total: { total: number; parStatut: ParStatut }; genereLe: string };
type Etat = 'attente' | 'chargement' | 'ok' | 'refuse' | 'erreur';

const LIGNES: { cle: keyof ParStatut; libelle: string; aide: string }[] = [
  { cle: 'active', libelle: 'Actives', aide: 'activées dans l\u2019application' },
  { cle: 'pending_activation', libelle: 'En attente', aide: 'achetées, pas encore activées' },
  { cle: 'expired', libelle: 'Expirées', aide: '' },
  { cle: 'revoked', libelle: 'Révoquées', aide: '' },
  { cle: 'autre', libelle: 'Autres', aide: 'statut inconnu' }
];

export default function AdminPage() {
  // undefined = vérification en cours, null = personne de connecté
  const [utilisateur, setUtilisateur] = useState<User | null | undefined>(undefined);
  const [stats, setStats] = useState<Stats | null>(null);
  const [etat, setEtat] = useState<Etat>('attente');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!auth) {
      setUtilisateur(null);
      return;
    }
    return onAuthStateChanged(auth, (u) => setUtilisateur(u));
  }, []);

  const charger = useCallback(async () => {
    if (!auth?.currentUser) return;
    setEtat('chargement');
    setMessage('');
    try {
      const jeton = await auth.currentUser.getIdToken();
      const reponse = await fetch(`${BACKEND_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${jeton}` } });
      if (reponse.status === 403) {
        setStats(null);
        setEtat('refuse');
        return;
      }
      const corps = await reponse.json().catch(() => ({}));
      if (!reponse.ok) throw new Error(corps?.error || `Erreur ${reponse.status}`);
      setStats(corps as Stats);
      setEtat('ok');
    } catch (err) {
      setEtat('erreur');
      setMessage(err instanceof Error ? err.message : 'Erreur inconnue.');
    }
  }, []);

  useEffect(() => {
    if (utilisateur) charger();
  }, [utilisateur, charger]);

  const carte = 'bg-slate-900 border border-slate-800 rounded-2xl p-5';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Abonnés MastaNote AI+</h1>
            <p className="text-xs text-slate-500 mt-1">Licences Chariow par formule. Nombres uniquement, aucun nom ni e-mail.</p>
          </div>
          <a href="/" className="text-xs font-bold text-indigo-300 hover:text-indigo-200 whitespace-nowrap">
            Retour à l'application
          </a>
        </div>

        {utilisateur === undefined && <p className="text-sm text-slate-400">Vérification de votre session…</p>}

        {utilisateur === null && (
          <div className={carte}>
            <p className="text-sm text-slate-300">
              Aucune session ouverte dans ce navigateur. Connectez-vous d'abord dans l'application, puis revenez à cette page.
            </p>
          </div>
        )}

        {utilisateur && etat === 'refuse' && (
          <div className={`${carte} flex items-start gap-3`}>
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-300">Accès réservé : ce compte n'est pas autorisé à voir ces chiffres.</p>
          </div>
        )}

        {utilisateur && etat === 'chargement' && (
          <p className="text-sm text-slate-400">
            Chargement… Si le serveur dormait, cela peut prendre une minute : ne rechargez pas la page.
          </p>
        )}

        {utilisateur && etat === 'erreur' && (
          <div className={carte}>
            <p className="text-sm text-rose-300">{message}</p>
            <button onClick={charger} className="mt-3 text-xs font-bold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200">
              Réessayer
            </button>
          </div>
        )}

        {utilisateur && etat === 'ok' && stats && (
          <>
            <div className={carte}>
              <p className="text-xs text-slate-500">Licences émises, toutes formules</p>
              <p className="text-4xl font-bold text-white mt-1">{stats.total.total}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {LIGNES.filter((l) => l.cle !== 'autre' || stats.total.parStatut.autre > 0).map((l) => (
                  <div key={l.cle} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <p className="text-xl font-bold text-white">{stats.total.parStatut[l.cle]}</p>
                    <p className="text-[11px] text-slate-400">{l.libelle}</p>
                  </div>
                ))}
              </div>
            </div>

            {stats.produits.map((p) => (
              <div key={p.id} className={carte}>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-bold text-white text-sm">{p.libelle}</h2>
                  <span className="text-xs text-slate-400">{p.total} licence(s)</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {LIGNES.filter((l) => l.cle !== 'autre' || p.parStatut.autre > 0).map((l) => (
                    <li key={l.cle} className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-300">
                        {l.libelle}
                        {l.aide && <span className="text-slate-500"> · {l.aide}</span>}
                      </span>
                      <span className="font-bold text-white">{p.parStatut[l.cle]}</span>
                    </li>
                  ))}
                </ul>
                {p.incomplet && (
                  <p className="text-[11px] text-amber-300 mt-3">
                    Liste très longue : le comptage s'est arrêté avant la fin, le total est un minimum.
                  </p>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                Ce sont des licences, pas des personnes : quelqu'un qui en a acheté deux compte deux fois. Calculé le{' '}
                {new Date(stats.genereLe).toLocaleString('fr-FR')} (le serveur garde le résultat cinq minutes).
              </p>
              <button
                onClick={charger}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualiser
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}