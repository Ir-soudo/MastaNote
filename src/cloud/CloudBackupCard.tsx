import React, { useCallback, useEffect, useState } from 'react';
import { Cloud, Download, Trash2, Upload } from 'lucide-react';
import { resumer } from './sauvegarde.js';
import {
  ecrireModulesLocaux,
  infoSauvegarde,
  lireModulesLocaux,
  lireSauvegarde,
  messageErreurCloud,
  sauvegarder,
  supprimerSauvegarde
} from './cloud';

// ==========================================================
// CADRE « SAUVEGARDE DANS LE CLOUD » (onglet Paramètres)
// Manuel : l'utilisateur sauvegarde ou restaure quand il le décide, avec une confirmation avant tout écrasement.
// Le consentement est demandé une fois par compte. Le profil et la licence ne sont jamais envoyés.
//
// ⚠️ TEXTE DE CONSENTEMENT = BROUILLON : à faire relire par une personne compétente (données d'élèves mineurs)
// avant l'ouverture à tous les utilisateurs.
// ==========================================================

type Info = { existe: boolean; date: Date | null; classes: number; eleves: number };

export default function CloudBackupCard({
  authUser,
  getEtat,
  onRestore,
  notify
}: {
  authUser: any;
  getEtat: () => { classes: any[]; notes: any; ventilationStrategy: string };
  onRestore: (etat: any) => void;
  notify: (message: string, type?: 'success' | 'error') => void;
}) {
  const uid: string | undefined = authUser?.uid;
  const cleConsentement = `mastanote-cloud-consent-v1:${uid}`;
  const emailVerifie = Boolean(authUser?.emailVerified);

  const [consentement, setConsentement] = useState<boolean>(() => {
    try {
      return localStorage.getItem(cleConsentement) === 'oui';
    } catch (err) {
      return false;
    }
  });
  const [coche, setCoche] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [occupe, setOccupe] = useState('');
  const [erreur, setErreur] = useState('');

  const rafraichir = useCallback(async () => {
    try {
      setInfo(await infoSauvegarde());
    } catch (err) {
      setInfo(null);
      setErreur(messageErreurCloud(err));
    }
  }, []);

  useEffect(() => {
    if (consentement && emailVerifie) rafraichir();
  }, [consentement, emailVerifie, rafraichir]);

  const executer = async (nom: string, action: () => Promise<void>) => {
    setErreur('');
    setOccupe(nom);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setErreur(messageErreurCloud(err));
    } finally {
      setOccupe('');
    }
  };

  const activer = () => {
    try {
      localStorage.setItem(cleConsentement, 'oui');
    } catch (err) {
      console.error(err);
    }
    setConsentement(true);
  };

  const sauvegarderMaintenant = () =>
    executer('sauvegarde', async () => {
      const etat = getEtat();
      const r = resumer(etat);
      if (
        !confirm(
          `Sauvegarder ${r.classes} classe(s), ${r.eleves} élève(s) et ${r.notes} note(s) dans le cloud ?\n\nCette sauvegarde REMPLACE la précédente.`
        )
      ) {
        return;
      }
      await sauvegarder(etat);
      notify('Sauvegarde terminée.', 'success');
      await rafraichir();
    });

  const restaurer = () =>
    executer('restauration', async () => {
      const etat = await lireSauvegarde();
      if (!etat) {
        notify('Aucune sauvegarde trouvée dans le cloud.', 'error');
        return;
      }
      const r = resumer(etat);
      if (
        !confirm(
          `Restaurer ${r.classes} classe(s), ${r.eleves} élève(s) et ${r.notes} note(s) depuis le cloud ?\n\nCela REMPLACE les classes et les notes de cet appareil. Si vous n'êtes pas sûr, annulez et sauvegardez d'abord.`
        )
      ) {
        return;
      }
      ecrireModulesLocaux(etat.modules);
      onRestore(etat);
    });

  const supprimer = () =>
    executer('suppression', async () => {
      if (
        !confirm(
          'Supprimer définitivement VOS données du cloud ?\n\nLes données enregistrées sur cet appareil ne sont pas touchées. Vous devrez accepter à nouveau pour réactiver la sauvegarde.'
        )
      ) {
        return;
      }
      await supprimerSauvegarde();
      try {
        localStorage.removeItem(cleConsentement);
      } catch (err) {
        console.error(err);
      }
      setConsentement(false);
      setCoche(false);
      setInfo(null);
      notify('Vos données ont été supprimées du cloud.', 'success');
    });

  const bouton =
    'text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50';

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
      <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
        <Cloud className="w-4 h-4 text-indigo-400" />
        Sauvegarde dans le cloud
      </h4>

      {!emailVerifie && (
        <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/50 rounded-xl px-3 py-2">
          Vérifiez d'abord votre adresse e-mail (bandeau en haut de l'écran) pour pouvoir sauvegarder.
        </p>
      )}

      {!consentement ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Protégez votre travail contre la perte ou le changement de téléphone : vos classes et vos notes sont copiées dans le cloud et
            peuvent être restaurées sur un autre appareil.
          </p>
          <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4">
            <li>
              <strong className="text-slate-300">Ce qui est enregistré :</strong> vos classes, la liste de vos élèves (noms, prénoms,
              matricules), leurs notes et les données des rapports d'étape. Ni votre mot de passe, ni votre licence.
            </li>
            <li>
              <strong className="text-slate-300">Où :</strong> sur Firebase (Google Cloud), dans un espace réservé à votre compte :
              les règles de sécurité interdisent à tout autre utilisateur d'y accéder. L'éditeur de MastaNote, qui administre la base,
              peut techniquement y accéder pour la maintenance.
            </li>
            <li>
              <strong className="text-slate-300">Vos choix :</strong> la sauvegarde est manuelle. Vous pouvez restaurer ou supprimer vos
              données du cloud à tout moment depuis cette page.
            </li>
          </ul>
          <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={coche}
              onChange={(e) => setCoche(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-indigo-500 shrink-0"
            />
            <span>J'ai lu ces informations et j'accepte que les données de mes élèves soient enregistrées dans le cloud.</span>
          </label>
          <button
            onClick={activer}
            disabled={!coche || !emailVerifie}
            className={`${bouton} bg-indigo-600 hover:bg-indigo-700 text-white`}
          >
            Activer la sauvegarde
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300">
            {info === null ? (
              <span className="text-slate-500">Lecture de l'état de la sauvegarde…</span>
            ) : info.existe ? (
              <>
                Dernière sauvegarde : <strong className="text-white">{info.date ? info.date.toLocaleString('fr-FR') : 'date inconnue'}</strong>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {info.classes} classe(s), {info.eleves} élève(s)
                </span>
              </>
            ) : (
              <span className="text-slate-400">Aucune sauvegarde pour l'instant.</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={sauvegarderMaintenant}
              disabled={occupe !== '' || !emailVerifie}
              className={`${bouton} bg-emerald-600 hover:bg-emerald-700 text-white`}
            >
              {occupe === 'sauvegarde' ? (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Sauvegarder maintenant
            </button>
            <button
              onClick={restaurer}
              disabled={occupe !== '' || !emailVerifie}
              className={`${bouton} bg-slate-800 hover:bg-slate-700 text-slate-200`}
            >
              {occupe === 'restauration' ? (
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Restaurer depuis le cloud
            </button>
          </div>

          <button
            onClick={supprimer}
            disabled={occupe !== ''}
            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer mes données du cloud
          </button>
        </div>
      )}

      {erreur && <p className="text-xs text-rose-300">{erreur}</p>}
    </div>
  );
}