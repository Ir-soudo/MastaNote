import React, { useEffect, useState } from 'react';
import { Copy, ExternalLink, Facebook, MessageCircle, Share2, Trash2 } from 'lucide-react';
import {
  ESPACE_AFFILIE,
  FORMULES,
  TAUX_COMMISSION,
  commission,
  construireLien,
  extraireCode,
  formaterMontant,
  messagePartage
} from './affiliation.js';

// ==========================================================
// ÉCRAN « GAGNER 30 % » — parrainage via l'affiliation de Chariow
//
// Rien ne quitte l'appareil : le code d'affilié (identifiant de promotion public) est gardé sur le téléphone, par compte.
// Aucun serveur, aucune clé Chariow. L'argent est géré par Chariow, jamais par MastaNote.
//
// INTERRUPTEUR : l'écran n'existe que si VITE_AFFILIATION vaut « on » au moment de la construction du site.
// Le menu doit tester AFFILIATION_ACTIVE avant d'afficher son entrée.
// ==========================================================
export const AFFILIATION_ACTIVE = import.meta.env.VITE_AFFILIATION === 'on';

// Textes du « bon à savoir » : n'y figurent que des faits observés chez Chariow. À ajuster quand le support aura répondu
// (minimum de retrait, frais, pièces acceptées, commissions avant vérification).
const INFOS = [
  'Vous êtes payé par Chariow, pas par MastaNote : la commission est versée dans votre portefeuille Chariow sous environ 72 heures après la vente, puis vous demandez le paiement depuis ce portefeuille.',
  'Chariow demande une vérification d\u2019identité avant votre premier paiement. MastaNote ne voit et ne conserve aucune pièce d\u2019identité.',
  'Le montant minimum, les frais éventuels et les pièces acceptées sont fixés par Chariow : renseignez-vous dans votre espace affilié.',
  'Les gains ne sont pas garantis : ils dépendent des ventes validées par Chariow.'
];

const REGLES = ['Présentez l\u2019application honnêtement, avec le prix affiché.', 'Aucune promesse de gain, aucun message envoyé en masse.', 'Acheter avec votre propre lien pour toucher la commission n\u2019est pas autorisé.'];

const ERREURS: Record<string, string> = {
  vide: 'Collez votre lien ou votre code d\u2019affilié.',
  'lien-court':
    'Ce lien court ne contient pas votre code. Ouvrez-le dans votre navigateur, puis copiez l\u2019adresse complète de la page qui s\u2019affiche : elle contient « chw_affiliate= » suivi de votre code.',
  'sans-code': 'Ce lien ne contient pas de code d\u2019affilié (« chw_affiliate= »). Générez-le depuis le Catalogue de votre espace affilié.',
  invalide: 'Cette saisie n\u2019est pas reconnue. Collez uniquement votre code ou le lien complet, sans autre texte.'
};

type Props = { uid?: string; notify: (message: string, type?: 'success' | 'error') => void };

function AffiliationPanelInterne({ uid, notify }: Props) {
  const cle = `mastanote-affiliation-v1:${uid}`;

  const [code, setCode] = useState<string>(() => {
    try {
      const brut = localStorage.getItem(cle);
      return brut ? String(JSON.parse(brut).code || '') : '';
    } catch (err) {
      return '';
    }
  });
  const [saisie, setSaisie] = useState('');
  const [erreur, setErreur] = useState('');
  const [formuleId, setFormuleId] = useState(FORMULES[0].id);
  const [message, setMessage] = useState('');

  const formule = FORMULES.find((f) => f.id === formuleId) || FORMULES[0];
  const lien = code ? construireLien(code, formule.id) : '';

  // Le message est recréé quand on change de formule ou de code ; il reste modifiable à la main entre-temps
  useEffect(() => {
    if (lien) setMessage(messagePartage(formule, lien));
  }, [lien, formule.id]);

  const enregistrer = () => {
    const r = extraireCode(saisie);
    if (!r.code) {
      setErreur(ERREURS[r.raison || 'vide']);
      return;
    }
    try {
      localStorage.setItem(cle, JSON.stringify({ code: r.code }));
    } catch (err) {
      console.error(err);
    }
    setCode(r.code);
    setSaisie('');
    setErreur('');
    notify('Votre code est enregistré sur cet appareil.', 'success');
  };

  const oublier = () => {
    try {
      localStorage.removeItem(cle);
    } catch (err) {
      console.error(err);
    }
    setCode('');
    setMessage('');
    notify('Votre code a été retiré de cet appareil.', 'success');
  };

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(message);
      notify('Message copié.', 'success');
    } catch (err) {
      notify('Copie impossible : sélectionnez le texte et copiez-le.', 'error');
    }
  };

  const partager = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ text: message });
      } catch (err) {
        /* partage annulé par l'utilisateur */
      }
    } else {
      await copier();
    }
  };

  const ouvrir = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

  const carte = 'bg-slate-950 border border-slate-800 rounded-2xl p-5';
  const boutonSecondaire =
    'text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors';

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      <div>
        <h3 className="font-bold text-xl text-white">Gagner {TAUX_COMMISSION} % en parrainant des collègues</h3>
        <p className="text-sm text-slate-400 mt-1 leading-relaxed">
          Partagez MastaNote AI+. Quand un collègue prend la {FORMULES[0].libelle.toLowerCase()} ou la {FORMULES[1].libelle.toLowerCase()} avec votre lien,
          vous touchez {TAUX_COMMISSION} % du prix :{' '}
          {FORMULES.map((f, i) => (
            <span key={f.id}>
              {i > 0 ? ' · ' : ''}
              <strong className="text-white">{formaterMontant(commission(f.prix))} FCFA</strong> pour {f.libelle.toLowerCase()}
            </span>
          ))}
          .
        </p>
      </div>

      <div className={carte}>
        <h4 className="font-bold text-slate-200 text-sm mb-3">Bon à savoir</h4>
        <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
          {INFOS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      {!code ? (
        <div className={`${carte} space-y-4`}>
          <h4 className="font-bold text-slate-200 text-sm">Pour commencer</h4>
          <ol className="text-xs text-slate-300 space-y-3 list-decimal pl-4 leading-relaxed">
            <li>
              Créez votre espace affilié gratuit chez Chariow (cliquez sur « Créer un compte »).
              <button onClick={() => ouvrir(ESPACE_AFFILIE)} className={`${boutonSecondaire} mt-2`}>
                <ExternalLink className="w-3.5 h-3.5" />
                Ouvrir l'espace affilié
              </button>
            </li>
            <li>Dans l&apos;espace affilié : Catalogue, puis MastaNote, puis « Générer un lien d&apos;affiliation ».</li>
            <li>
              Ouvrez le lien obtenu, copiez l&apos;adresse complète de la page qui s&apos;affiche (elle contient « chw_affiliate= » suivi de votre code),
              puis collez-la ci-dessous. Vous ne le faites qu&apos;une fois.
            </li>
          </ol>
          <div className="space-y-2">
            <input
              value={saisie}
              onChange={(e) => {
                setSaisie(e.target.value);
                setErreur('');
              }}
              placeholder="Collez votre lien ou votre code d'affilié"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {erreur && <p className="text-xs text-rose-300 leading-relaxed">{erreur}</p>}
            <button
              onClick={enregistrer}
              disabled={!saisie.trim()}
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors"
            >
              Enregistrer mon code
            </button>
          </div>
        </div>
      ) : (
        <div className={`${carte} space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Votre code d&apos;affilié : <strong className="text-white">{code}</strong>
            </p>
            <button onClick={oublier} className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
              Changer de code
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {FORMULES.map((f) => (
              <button
                key={f.id}
                onClick={() => setFormuleId(f.id)}
                className={`rounded-xl px-3 py-2.5 text-left border transition-colors ${
                  f.id === formule.id ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <span className="block text-xs font-bold">{f.libelle}</span>
                <span className="block text-[11px] text-slate-400">
                  {formaterMontant(f.prix)} FCFA · vous touchez {formaterMontant(commission(f.prix))} FCFA
                </span>
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={partager}
              className="col-span-2 text-xs font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Partager
            </button>
            <button onClick={() => ouvrir(`https://wa.me/?text=${encodeURIComponent(message)}`)} className={boutonSecondaire}>
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
            <button
              onClick={() => ouvrir(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(lien)}`)}
              className={boutonSecondaire}
            >
              <Facebook className="w-3.5 h-3.5" />
              Facebook
            </button>
            <button onClick={copier} className={`${boutonSecondaire} col-span-2`}>
              <Copy className="w-3.5 h-3.5" />
              Copier le message
            </button>
          </div>
          <p className="text-[11px] text-slate-500">Facebook ne partage que le lien : il ignore le texte.</p>
        </div>
      )}

      <div className={carte}>
        <h4 className="font-bold text-slate-200 text-sm mb-3">Règles du programme</h4>
        <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
          {REGLES.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AffiliationPanel(props: Props) {
  if (!AFFILIATION_ACTIVE) return null;
  return <AffiliationPanelInterne {...props} />;
}