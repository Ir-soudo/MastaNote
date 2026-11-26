import React, { useMemo, useState } from 'react';
import { Camera, Download, FileSpreadsheet, ImagePlus, Share2 } from 'lucide-react';
import { associerFichiers, cadrageDepuisVisage, cadrageInitial, creerZip, genererCsv, lignesRapport, messageAlerte, nomFichier, preparerExport } from './noyau.js';
import { chargerImage, detecterVisage, libererImage, partagerFichiers, produirePhoto, telechargerBlob } from './navigateur.js';

// ==========================================================
// SUIVI, ASSOCIATION DES PHOTOS EXISTANTES, EXPORT
// Tout se passe sur l'appareil : rien n'est envoyé nulle part.
// ==========================================================

type Props = {
  eleves: any[];
  photos: Map<string, any>; // eleveId → { donnees, poidsOctets, largeur, hauteur, alertes }
  reglages: any;
  onRefaire: (eleveId: string) => void;
  onEnregistrerPhoto: (photo: any) => Promise<void>;
  notify: (message: string, type?: 'success' | 'error') => void;
};

const RAPPEL_EDUCMASTER =
  "Avant d'envoyer à EducMaster : vérifiez ses règles exactes (dimensions, poids, nom des fichiers) sur son écran d'import lors du premier essai réel, et corrigez-les dans Normes & Profil si besoin.";

const formaterKo = (octets: number) => `${(octets / 1024).toFixed(1).replace('.', ',')} Ko`;
const nomComplet = (e: any) => [e.nom, e.prenoms].filter(Boolean).join(' ') || e.matricule || 'Élève sans nom';
const LIBELLES_METHODE: Record<string, string> = { matricule: 'matricule', nom: 'nom', ordre: 'ordre de la liste' };
const LIBELLES_STATUT: Record<string, string> = { 'non-associe': 'à choisir', ambigu: 'plusieurs possibilités', doublon: 'déjà pris par un autre fichier' };

export default function RapportView({ eleves, photos, reglages, onRefaire, onEnregistrerPhoto, notify }: Props) {
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [association, setAssociation] = useState<any[]>([]);
  const [choix, setChoix] = useState<Record<number, string>>({});
  const [parOrdre, setParOrdre] = useState(false);
  const [remplacer, setRemplacer] = useState(false);
  const [progression, setProgression] = useState<{ fait: number; total: number; nom: string } | null>(null);
  const [echecs, setEchecs] = useState<string[]>([]);
  const [occupe, setOccupe] = useState(false);

  // ---------- état des photos et export préparé ----------

  const photosListe = useMemo(
    () => eleves.filter((e) => photos.has(e.id)).map((e) => ({ eleveId: e.id, donnees: new Uint8Array(photos.get(e.id).donnees) })),
    [eleves, photos]
  );
  const exportPrepare = useMemo(() => preparerExport(eleves, photosListe, reglages), [eleves, photosListe, reglages]);
  const meta = useMemo(() => {
    const m = new Map<string, any>();
    photos.forEach((p, id) => m.set(id, { poidsOctets: p.poidsOctets, largeur: p.largeur, hauteur: p.hauteur, alertes: p.alertes || [] }));
    return m;
  }, [photos]);

  const lignes = useMemo(() => {
    const parId = new Map<string, any>(exportPrepare.correspondances.map((c: any) => [c.eleveId, c]));
    return eleves.map((e, rang) => {
      const p = photos.get(e.id);
      const c = parId.get(e.id);
      const codes: string[] = p ? [...(c?.alertes || []), ...(p.alertes || [])] : [];
      return {
        eleve: e,
        photo: p,
        fichier: c?.nom || nomFichier(e, reglages, rang).nom,
        codes,
        statut: !p ? 'sans photo' : codes.length ? 'alerte' : 'conforme'
      };
    });
  }, [eleves, photos, reglages, exportPrepare]);

  const total = eleves.length;
  const avecPhoto = lignes.filter((l) => l.photo).length;
  const conformes = lignes.filter((l) => l.statut === 'conforme').length;
  const alertes = lignes.filter((l) => l.statut === 'alerte').length;

  // ---------- export ----------

  const prefixe = reglages.zip?.dossier ? `${reglages.zip.dossier}/` : '';
  const csv = () => genererCsv(lignesRapport(eleves, exportPrepare.correspondances, meta));

  const fabriquerZip = () => {
    if (exportPrepare.entrees.length === 0) throw new Error('Aucune photo à exporter.');
    const entrees = [...exportPrepare.entrees];
    if (reglages.zip?.inclureRapport) entrees.push({ nom: `${prefixe}rapport-photos.csv`, donnees: new TextEncoder().encode(csv()) });
    return new Blob([creerZip(entrees)], { type: 'application/zip' });
  };

  const telechargerZip = () => {
    try {
      telechargerBlob(fabriquerZip(), 'photos-eleves.zip');
      notify('ZIP des photos téléchargé.', 'success');
    } catch (err: any) {
      notify(err?.message || 'ZIP impossible.', 'error');
    }
  };

  const telechargerCsv = () => {
    try {
      telechargerBlob(new Blob([csv()], { type: 'text/csv;charset=utf-8' }), 'rapport-photos.csv');
      notify('Rapport CSV téléchargé.', 'success');
    } catch (err: any) {
      notify(err?.message || 'Rapport impossible.', 'error');
    }
  };

  const partagerZip = async () => {
    try {
      const fichier = new File([fabriquerZip()], 'photos-eleves.zip', { type: 'application/zip' });
      const reussi = await partagerFichiers([fichier], 'Photos des élèves');
      if (!reussi) notify("Le partage de fichiers n'est pas disponible ici : téléchargez le ZIP.", 'error');
    } catch (err: any) {
      notify(err?.message || 'Partage impossible.', 'error');
    }
  };

  // ---------- photos déjà prises : association puis application ----------

  const recalculer = (liste: File[], ordre: boolean) => {
    const r = associerFichiers(liste.map((f) => ({ nom: f.name })), eleves, { parOrdre: ordre });
    setAssociation(r);
    const c: Record<number, string> = {};
    r.forEach((x: any) => {
      if (x.eleveId) c[x.index] = x.eleveId;
    });
    setChoix(c);
  };

  const surFichiers = (e: React.ChangeEvent<HTMLInputElement>) => {
    const liste = Array.from(e.target.files || []);
    e.target.value = '';
    setFichiers(liste);
    setEchecs([]);
    recalculer(liste, parOrdre);
  };

  const changerOrdre = (ordre: boolean) => {
    setParOrdre(ordre);
    recalculer(fichiers, ordre);
  };

  const elevesChoisis = new Map<string, number>();
  Object.values(choix).forEach((id) => {
    if (id) elevesChoisis.set(id, (elevesChoisis.get(id) || 0) + 1);
  });
  const doublonsChoix = Array.from(elevesChoisis.values()).filter((n) => n > 1).length;
  const nbACibler = Object.values(choix).filter(Boolean).length;

  const appliquer = async () => {
    const cibles = Object.entries(choix)
      .filter(([, id]) => id)
      .map(([i, id]) => ({ i: Number(i), eleveId: id }));
    if (cibles.length === 0 || doublonsChoix > 0) return;
    setOccupe(true);
    setEchecs([]);
    const problemes: string[] = [];
    let reussies = 0;
    let ignorees = 0;
    for (let k = 0; k < cibles.length; k += 1) {
      const { i, eleveId } = cibles[k];
      const fichier = fichiers[i];
      setProgression({ fait: k, total: cibles.length, nom: fichier.name });
      if (!remplacer && photos.has(eleveId)) {
        ignorees += 1;
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 0)); // laisse l'écran respirer entre deux photos
      let image: any = null;
      try {
        image = await chargerImage(fichier);
        const boite = await detecterVisage(image);
        const params = boite ? cadrageDepuisVisage(image.largeur, image.hauteur, reglages.largeur, reglages.hauteur, boite) : cadrageInitial(image.largeur, image.hauteur, reglages.largeur, reglages.hauteur);
        const res = await produirePhoto(image, params, reglages, { visage: boite });
        await onEnregistrerPhoto({
          eleveId,
          donnees: res.donnees,
          poidsOctets: res.poidsOctets,
          largeur: res.largeur,
          hauteur: res.hauteur,
          alertes: res.alertes,
          mesures: res.mesures,
          creeLe: Date.now()
        });
        reussies += 1;
      } catch (err: any) {
        problemes.push(`${fichier.name} : ${err?.message || 'échec'}`);
      } finally {
        libererImage(image);
      }
    }
    setProgression(null);
    setOccupe(false);
    setEchecs(problemes);
    setFichiers([]);
    setAssociation([]);
    setChoix({});
    notify(
      `${reussies} photo(s) traitée(s)${ignorees ? `, ${ignorees} ignorée(s) (déjà prises)` : ''}${problemes.length ? `, ${problemes.length} en échec` : ''}.`,
      problemes.length && !reussies ? 'error' : 'success'
    );
  };

  const bouton = 'text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50';
  const secondaire = `${bouton} bg-slate-800 hover:bg-slate-700 text-slate-200`;
  const principal = `${bouton} bg-emerald-600 hover:bg-emerald-700 text-white`;
  const carte = 'bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3';

  return (
    <div className="space-y-5">
      {/* ---- RÉSUMÉ ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ['Élèves', total, 'text-white'],
          ['Photos prises', avecPhoto, 'text-white'],
          ['Conformes', conformes, 'text-emerald-300'],
          ['Avec alerte', alertes, 'text-amber-300']
        ].map(([libelle, valeur, couleur]) => (
          <div key={libelle as string} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <p className={`text-xl font-bold ${couleur}`}>{valeur as number}</p>
            <p className="text-[11px] text-slate-400">{libelle as string}</p>
          </div>
        ))}
      </div>

      {/* ---- SUIVI PHOTO PAR PHOTO ---- */}
      <div className={carte}>
        <h4 className="font-bold text-slate-200 text-sm">Suivi élève par élève</h4>
        {lignes.length === 0 ? (
          <p className="text-xs text-slate-500">La liste de classe est vide : importez-la d&apos;abord dans l&apos;onglet Classe.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {lignes.map((l) => (
              <li key={l.eleve.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 text-xs">
                  <p className="font-bold text-white truncate">{nomComplet(l.eleve)}</p>
                  <p className="text-slate-500 truncate">{l.fichier}</p>
                  {l.photo && (
                    <p className="text-slate-400">
                      {l.photo.largeur}×{l.photo.hauteur} · {formaterKo(l.photo.poidsOctets)}
                    </p>
                  )}
                  <p className={l.statut === 'conforme' ? 'text-emerald-300' : l.statut === 'alerte' ? 'text-amber-300' : 'text-slate-500'}>
                    {l.statut === 'sans photo' ? 'Sans photo' : l.statut === 'conforme' ? 'Conforme' : 'Alerte'}
                  </p>
                  {l.codes.length > 0 && (
                    <ul className="text-amber-300/90 list-disc pl-4 mt-1 space-y-0.5">
                      {l.codes.map((code: string) => (
                        <li key={code}>{messageAlerte(code)}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button onClick={() => onRefaire(l.eleve.id)} className={`${secondaire} shrink-0`}>
                  <Camera className="w-3.5 h-3.5" />
                  {l.photo ? 'Refaire' : 'Prendre'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- PHOTOS DÉJÀ PRISES ---- */}
      <div className={carte}>
        <h4 className="font-bold text-slate-200 text-sm">Importer des photos déjà prises</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Choisissez des photos : elles sont associées aux élèves par le matricule dans le nom du fichier, puis par le nom et les prénoms. Vous vérifiez et
          corrigez avant tout. Chaque photo est ensuite recadrée, comprimée selon la norme et renommée.
        </p>
        <label className={`${secondaire} cursor-pointer`}>
          <ImagePlus className="w-4 h-4" />
          Choisir des photos
          <input type="file" accept="image/*" multiple className="hidden" onChange={surFichiers} />
        </label>

        {fichiers.length > 0 && (
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-[11px] text-slate-300">
              <input type="checkbox" checked={parOrdre} onChange={(e) => changerOrdre(e.target.checked)} className="mt-0.5 w-4 h-4 accent-indigo-500" />
              <span>Associer les photos restantes dans l&apos;ordre de la liste (par ordre alphabétique des noms de fichiers).</span>
            </label>
            <label className="flex items-start gap-2 text-[11px] text-slate-300">
              <input type="checkbox" checked={remplacer} onChange={(e) => setRemplacer(e.target.checked)} className="mt-0.5 w-4 h-4 accent-indigo-500" />
              <span>Remplacer les photos déjà prises.</span>
            </label>

            <ul className="divide-y divide-slate-800">
              {fichiers.map((f, i) => {
                const a = association[i];
                return (
                  <li key={`${f.name}-${i}`} className="py-2.5 space-y-1.5">
                    <p className="text-xs text-white truncate">{f.name}</p>
                    <select
                      value={choix[i] || ''}
                      onChange={(e) => setChoix((c) => ({ ...c, [i]: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200"
                    >
                      <option value="">— ne pas utiliser —</option>
                      {eleves.map((e) => (
                        <option key={e.id} value={e.id}>
                          {nomComplet(e)}
                          {e.matricule ? ` (${e.matricule})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500">
                      {a?.statut === 'ok' && a.eleveId === choix[i] ? `Association par ${LIBELLES_METHODE[a.methode] || a.methode}` : a && a.statut !== 'ok' && !choix[i] ? LIBELLES_STATUT[a.statut] || '' : choix[i] ? 'Choix manuel' : ''}
                    </p>
                  </li>
                );
              })}
            </ul>

            {doublonsChoix > 0 && <p className="text-xs text-rose-300">Un même élève est choisi pour plusieurs photos : corrigez avant d&apos;appliquer.</p>}
            {progression && (
              <p className="text-xs text-slate-300">
                Traitement {progression.fait + 1} sur {progression.total} : {progression.nom}
              </p>
            )}
            <button onClick={appliquer} disabled={occupe || nbACibler === 0 || doublonsChoix > 0} className={principal}>
              {occupe ? 'Traitement en cours…' : `Appliquer à ${nbACibler} photo(s)`}
            </button>
          </div>
        )}
        {echecs.length > 0 && (
          <ul className="text-xs text-rose-300 list-disc pl-4 space-y-1">
            {echecs.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- EXPORT ---- */}
      <div className={carte}>
        <h4 className="font-bold text-slate-200 text-sm">Exporter</h4>
        <p className="text-xs text-amber-300 leading-relaxed">{RAPPEL_EDUCMASTER}</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Le ZIP contient uniquement les photos{prefixe ? ` (dans le dossier « ${reglages.zip.dossier} »)` : ', sans sous-dossier'}.{' '}
          {reglages.zip?.inclureRapport ? 'Le rapport CSV y est ajouté (réglage de Normes & Profil).' : 'Le rapport CSV se télécharge à part, pour ne pas gêner l’import.'}
        </p>
        {total - avecPhoto > 0 && <p className="text-xs text-slate-500">{total - avecPhoto} élève(s) sans photo ne seront pas dans le ZIP.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button onClick={telechargerZip} disabled={avecPhoto === 0} className={principal}>
            <Download className="w-4 h-4" />
            ZIP des photos
          </button>
          <button onClick={telechargerCsv} disabled={total === 0} className={secondaire}>
            <FileSpreadsheet className="w-4 h-4" />
            Rapport CSV
          </button>
          <button onClick={partagerZip} disabled={avecPhoto === 0} className={secondaire}>
            <Share2 className="w-4 h-4" />
            Partager le ZIP
          </button>
        </div>
      </div>
    </div>
  );
}