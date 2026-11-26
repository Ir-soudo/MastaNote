import React, { useEffect, useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, ClipboardList, Settings2, Trash2, UserPlus, Users } from 'lucide-react';
import { PROFILS, SCHEMAS_NOMS, analyserListe, elevesDepuisClasse, idEleve, messageAlerte, nettoyerSegment, nomFichier, normaliserReglages } from './noyau.js';
import {
  appareilLimite,
  demanderStockagePersistant,
  ecrire,
  ecrireTout,
  lire,
  lireTexteFichier,
  lireTout,
  ouvrirBase,
  sauverReglages,
  supprimer,
  supprimerBase,
  viderStore
} from './navigateur.js';
import CadrageView from './CadrageView';
import RapportView from './RapportView';

// ==========================================================
// STUDIO PHOTO EDUCMASTER — assemblage
// Tout reste sur cet appareil : liste, photos et réglages sont gardés dans une mémoire locale propre à chaque compte.
//
// INTERRUPTEUR : l'écran n'existe que si VITE_PHOTOS vaut « on » au moment de la construction du site.
// Le menu doit tester STUDIO_PHOTO_ACTIVE avant d'afficher son entrée.
// ==========================================================
export const STUDIO_PHOTO_ACTIVE = import.meta.env.VITE_PHOTOS === 'on';

type Props = { uid?: string; classes?: any[]; notify: (message: string, type?: 'success' | 'error') => void };
type Onglet = 'classe' | 'photos' | 'rapport' | 'normes';

const nomComplet = (e: any) => [e.nom, e.prenoms].filter(Boolean).join(' ') || e.matricule || 'Élève sans nom';

const CARTE = 'bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3';
const BOUTON = 'text-xs font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50';
const SECONDAIRE = `${BOUTON} bg-slate-800 hover:bg-slate-700 text-slate-200`;
const PRINCIPAL = `${BOUTON} bg-emerald-600 hover:bg-emerald-700 text-white`;
const CHAMP = 'w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500';

const PRESETS_COLONNES: { id: string; libelle: string; colonnes?: string[] }[] = [
  { id: 'auto', libelle: 'Détection automatique' },
  { id: 'mnpn', libelle: 'Matricule, nom, prénoms, NPI', colonnes: ['matricule', 'nom', 'prenoms', 'npi'] },
  { id: 'mnp', libelle: 'Matricule, nom, prénoms', colonnes: ['matricule', 'nom', 'prenoms'] },
  { id: 'np', libelle: 'Nom, prénoms', colonnes: ['nom', 'prenoms'] },
  { id: 'c', libelle: 'Nom et prénoms dans une seule colonne', colonnes: ['complet'] },
  { id: 'mc', libelle: 'Matricule, puis nom et prénoms', colonnes: ['matricule', 'complet'] }
];

// ---------- petits composants ----------

function Case({ coche, onChange, children }: { coche: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
      <input type="checkbox" checked={coche} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 w-4 h-4 accent-indigo-500 shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </label>
  );
}

/** Champ numérique : on peut taper librement, la valeur n'est contrôlée et bornée qu'en quittant le champ. */
function ChampNombre({ valeur, onCommit, min, max, libelle }: { valeur: number; onCommit: (n: number) => void; min: number; max: number; libelle: string }) {
  const [texte, setTexte] = useState(String(valeur));
  useEffect(() => {
    setTexte(String(valeur));
  }, [valeur]);
  const valider = () => {
    const n = Number(String(texte).replace(',', '.'));
    if (!Number.isFinite(n)) {
      setTexte(String(valeur));
      return;
    }
    const borne = Math.min(max, Math.max(min, n));
    setTexte(String(borne));
    onCommit(borne);
  };
  return (
    <label className="block text-[11px] text-slate-400">
      {libelle}
      <input
        inputMode="decimal"
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onBlur={valider}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className={`${CHAMP} mt-1`}
      />
    </label>
  );
}

/** Champ texte : la saisie n'est nettoyée et enregistrée qu'en quittant le champ (sinon un espace saisi disparaîtrait aussitôt). */
function ChampTexte({
  valeur,
  onCommit,
  libelle,
  placeholder,
  nettoyer
}: {
  valeur: string;
  onCommit: (t: string) => void;
  libelle: string;
  placeholder?: string;
  nettoyer?: (t: string) => string;
}) {
  const [texte, setTexte] = useState(valeur);
  useEffect(() => {
    setTexte(valeur);
  }, [valeur]);
  const valider = () => {
    const propre = nettoyer ? nettoyer(texte) : texte;
    setTexte(propre);
    onCommit(propre);
  };
  return (
    <label className="block text-[11px] text-slate-400">
      {libelle}
      <input
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onBlur={valider}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        placeholder={placeholder}
        className={`${CHAMP} mt-1`}
      />
    </label>
  );
}

// ---------- onglet CLASSE ----------

function OngletClasse({
  eleves,
  classes,
  photos,
  onRemplacer,
  onAjouter,
  onRetirer,
  notify
}: {
  eleves: any[];
  classes: any[];
  photos: Map<string, any>;
  onRemplacer: (liste: any[]) => Promise<boolean>;
  onAjouter: (e: any) => Promise<void>;
  onRetirer: (id: string) => Promise<void>;
  notify: Props['notify'];
}) {
  const [texte, setTexte] = useState('');
  const [preset, setPreset] = useState('auto');
  const [apercu, setApercu] = useState<any>(null);
  const [classeId, setClasseId] = useState('');
  const [nouveau, setNouveau] = useState({ matricule: '', nom: '', prenoms: '', npi: '' });

  const analyser = () => {
    const p = PRESETS_COLONNES.find((x) => x.id === preset);
    setApercu({ ...analyserListe(texte, { colonnes: p?.colonnes }), source: 'texte' });
  };

  const surFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    try {
      setTexte(await lireTexteFichier(fichier));
      setApercu(null);
    } catch (err) {
      notify('Fichier illisible.', 'error');
    }
  };

  const depuisClasse = () => {
    const c = classes.find((x) => String(x.id) === classeId);
    if (!c) return;
    const liste = elevesDepuisClasse(c);
    setApercu({ eleves: liste, alertes: liste.length ? [] : [{ code: 'liste-vide' }], colonnes: [], entete: false, source: 'classe' });
  };

  const utiliser = async () => {
    if (!apercu?.eleves?.length) return;
    const nombre = apercu.eleves.length;
    if (await onRemplacer(apercu.eleves)) {
      setApercu(null);
      setTexte('');
      notify(`${nombre} élève(s) enregistré(s).`, 'success');
    }
  };

  const ajouter = async () => {
    if (!nouveau.nom.trim() && !nouveau.matricule.trim()) {
      notify('Saisissez au moins un nom ou un matricule.', 'error');
      return;
    }
    await onAjouter(nouveau);
    setNouveau({ matricule: '', nom: '', prenoms: '', npi: '' });
  };

  return (
    <div className="space-y-5">
      <div className={CARTE}>
        <h4 className="font-bold text-slate-200 text-sm">Importer la liste de la classe</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          Collez la liste (depuis Excel ou EducMaster) ou choisissez un fichier CSV : matricule, nom, prénoms et NPI si vous l&apos;avez. Vous vérifiez avant d&apos;enregistrer.
        </p>
        <textarea
          value={texte}
          onChange={(e) => {
            setTexte(e.target.value);
            setApercu(null);
          }}
          rows={5}
          placeholder={'Matricule;Nom;Prénoms;NPI\n20240001;KOUASSI;Jean Pierre;1234567890'}
          className={`${CHAMP} text-xs`}
        />
        <select value={preset} onChange={(e) => setPreset(e.target.value)} className={CHAMP}>
          {PRESETS_COLONNES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.libelle}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <label className={`${SECONDAIRE} cursor-pointer`}>
            Choisir un fichier
            <input type="file" accept=".csv,.txt,text/plain,text/csv" className="hidden" onChange={surFichier} />
          </label>
          <button onClick={analyser} disabled={!texte.trim()} className={PRINCIPAL}>
            Analyser
          </button>
        </div>
        {classes.length > 0 && (
          <div className="grid grid-cols-[1fr_auto] gap-2 pt-1">
            <select value={classeId} onChange={(e) => setClasseId(e.target.value)} className={CHAMP}>
              <option value="">Ou lire une de mes classes…</option>
              {classes.map((c) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {c.nom || c.id}
                </option>
              ))}
            </select>
            <button onClick={depuisClasse} disabled={!classeId} className={SECONDAIRE}>
              Lire
            </button>
          </div>
        )}
      </div>

      {apercu && (
        <div className={CARTE}>
          <h4 className="font-bold text-slate-200 text-sm">Vérification : {apercu.eleves.length} élève(s) lu(s)</h4>
          {apercu.source === 'classe' && <p className="text-[11px] text-amber-300">Lecture d&apos;une classe de MastaNote : vérifiez que les noms et matricules ci-dessous sont bien ceux attendus.</p>}
          {apercu.alertes.map((a: any) => (
            <p key={a.code} className="text-xs text-amber-300">
              {messageAlerte(a.code)}
              {a.nombre ? ` (${a.nombre})` : ''}
            </p>
          ))}
          {apercu.eleves.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left text-slate-300">
                <thead className="text-slate-500">
                  <tr>
                    <th className="py-1 pr-2">Matricule</th>
                    <th className="py-1 pr-2">Nom</th>
                    <th className="py-1 pr-2">Prénoms</th>
                    <th className="py-1">NPI</th>
                  </tr>
                </thead>
                <tbody>
                  {apercu.eleves.slice(0, 8).map((e: any) => (
                    <tr key={e.id} className="border-t border-slate-800">
                      <td className="py-1 pr-2">{e.matricule || '—'}</td>
                      <td className="py-1 pr-2">{e.nom || '—'}</td>
                      <td className="py-1 pr-2">{e.prenoms || '—'}</td>
                      <td className="py-1">{e.npi || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {apercu.eleves.length > 8 && <p className="text-[11px] text-slate-500 mt-1">… et {apercu.eleves.length - 8} autre(s).</p>}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setApercu(null)} className={SECONDAIRE}>
              Annuler
            </button>
            <button onClick={utiliser} disabled={apercu.eleves.length === 0} className={PRINCIPAL}>
              Utiliser cette liste
            </button>
          </div>
        </div>
      )}

      <div className={CARTE}>
        <h4 className="font-bold text-slate-200 text-sm">Ajouter un élève</h4>
        <div className="grid grid-cols-2 gap-2">
          <input value={nouveau.matricule} onChange={(e) => setNouveau({ ...nouveau, matricule: e.target.value })} placeholder="Matricule" className={CHAMP} />
          <input value={nouveau.npi} onChange={(e) => setNouveau({ ...nouveau, npi: e.target.value })} placeholder="NPI (facultatif)" className={CHAMP} />
          <input value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} placeholder="Nom" className={CHAMP} />
          <input value={nouveau.prenoms} onChange={(e) => setNouveau({ ...nouveau, prenoms: e.target.value })} placeholder="Prénoms" className={CHAMP} />
        </div>
        <button onClick={ajouter} className={SECONDAIRE}>
          <UserPlus className="w-3.5 h-3.5" />
          Ajouter
        </button>
      </div>

      <div className={CARTE}>
        <h4 className="font-bold text-slate-200 text-sm">Liste actuelle ({eleves.length})</h4>
        {eleves.length === 0 ? (
          <p className="text-xs text-slate-500">Aucun élève pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {eleves.map((e) => (
              <li key={e.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-slate-200">
                  {photos.has(e.id) ? '✓ ' : ''}
                  {nomComplet(e)}
                  {e.matricule ? <span className="text-slate-500"> · {e.matricule}</span> : null}
                </span>
                <button onClick={() => onRetirer(e.id)} className="text-rose-400 hover:text-rose-300 shrink-0" aria-label="Retirer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------- onglet NORMES & PROFIL ----------

function OngletNormes({ reglages, onChange, eleves, nbPhotos, onEffacerTout }: { reglages: any; onChange: (patch: any) => void; eleves: any[]; nbPhotos: number; onEffacerTout: () => void }) {
  const exemple = eleves[0] || { matricule: '20240001', nom: 'Kouassi', prenoms: 'Jean Pierre', npi: '1234567890' };
  const nomExemple = nomFichier(exemple, reglages, 0).nom;
  const personnalise = reglages.profilId === 'personnalise';

  return (
    <div className="space-y-5">
      <p className="text-xs text-amber-300 leading-relaxed">
        Les règles exactes d&apos;EducMaster (dimensions, poids, nom des fichiers) ne sont pas connues de MastaNote. Les valeurs proposées sont celles d&apos;une photo d&apos;identité : vérifiez-les sur l&apos;écran d&apos;import
        d&apos;EducMaster lors du premier essai réel, et corrigez-les ici.
      </p>
      {nbPhotos > 0 && <p className="text-[11px] text-slate-500">Les photos déjà prises gardent leurs dimensions et leur poids : refaites-les ou réimportez-les après un changement de norme.</p>}

      <div className={CARTE}>
        <h4 className="font-bold text-slate-200 text-sm">Format de la photo</h4>
        <select value={reglages.profilId} onChange={(e) => onChange({ profilId: e.target.value })} className={CHAMP}>
          {PROFILS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.libelle}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <ChampNombre libelle="Largeur (pixels)" valeur={reglages.largeur} min={100} max={2000} onCommit={(n) => onChange({ profilId: 'personnalise', largeur: n })} />
          <ChampNombre libelle="Hauteur (pixels)" valeur={reglages.hauteur} min={100} max={2000} onCommit={(n) => onChange({ profilId: 'personnalise', hauteur: n })} />
        </div>
        {!personnalise && <p className="text-[11px] text-slate-500">Modifier une dimension passe en « Personnalisé ». Le format est toujours JPEG (.jpg).</p>}
      </div>

      <div className={CARTE}>
        <h4 className="font-bold text-slate-200 text-sm">Poids</h4>
        <ChampNombre libelle="Poids maximal (Ko)" valeur={reglages.poidsMaxKo} min={20} max={1000} onCommit={(n) => onChange({ poidsMaxKo: n })} />
        <div className="grid grid-cols-3 gap-2">
          {[100, 150, 200].map((n) => (
            <button key={n} onClick={() => onChange({ poidsMaxKo: n })} className={SECONDAIRE}>
              {n} Ko
            </button>
          ))}
        </div>
        <label className="block text-[11px] text-slate-400">
          Qualité JPEG minimale : {Math.round(reglages.qualiteMin * 100)} %
          <input
            type="range"
            min="30"
            max="95"
            step="5"
            value={Math.round(reglages.qualiteMin * 100)}
            onChange={(e) => onChange({ qualiteMin: Number(e.target.value) / 100 })}
            className="w-full accent-indigo-500"
          />
        </label>
        <Case coche={reglages.autoriserReduction} onChange={(v) => onChange({ autoriserReduction: v })}>
          Autoriser la réduction des dimensions si la limite de poids n&apos;est pas atteinte à la qualité minimale. Désactivé par défaut : les dimensions pourraient être exigées exactement.
        </Case>
      </div>

      <div className={CARTE}>
        <h4 className="font-bold text-slate-200 text-sm">Nom des fichiers</h4>
        {SCHEMAS_NOMS.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input type="radio" name="schema-nom" checked={reglages.schemaNom === s.id} onChange={() => onChange({ schemaNom: s.id })} className="accent-indigo-500" />
            {s.libelle}
          </label>
        ))}
        <Case coche={reglages.majuscules} onChange={(v) => onChange({ majuscules: v })}>
          Écrire les noms en majuscules. Les accents, les espaces et les signes sont toujours retirés.
        </Case>
        <p className="text-[11px] text-slate-400">
          Exemple : <strong className="text-white">{nomExemple}</strong>
        </p>
      </div>

      <div className={CARTE}>
        <h4 className="font-bold text-slate-200 text-sm">Archive ZIP</h4>
        <Case coche={reglages.zip.inclureRapport} onChange={(v) => onChange({ zip: { inclureRapport: v } })}>
          Ajouter le rapport CSV dans le ZIP. Désactivé par défaut : une plateforme qui attend des images peut refuser un autre type de fichier.
        </Case>
        <ChampTexte
          libelle="Dossier dans le ZIP (laisser vide : pas de sous-dossier)"
          valeur={reglages.zip.dossier}
          placeholder="Aucun"
          nettoyer={(t) => nettoyerSegment(t, { majuscules: false })}
          onCommit={(t) => onChange({ zip: { dossier: t } })}
        />
      </div>

      <div className={CARTE}>
        <h4 className="font-bold text-slate-200 text-sm">Contrôle qualité et appareil</h4>
        <Case coche={reglages.modeLeger} onChange={(v) => onChange({ modeLeger: v })}>
          Mode léger : saute le calcul de netteté et analyse une image plus petite. À activer si le téléphone ralentit.
        </Case>
        <Case coche={reglages.verifications.nettete} onChange={(v) => onChange({ verifications: { nettete: v } })}>
          Vérifier la netteté (inactif en mode léger)
        </Case>
        <Case coche={reglages.verifications.luminosite} onChange={(v) => onChange({ verifications: { luminosite: v } })}>
          Vérifier la luminosité et le contraste
        </Case>
        <Case coche={reglages.verifications.cadrage} onChange={(v) => onChange({ verifications: { cadrage: v } })}>
          Vérifier le cadrage du visage (seulement si le navigateur sait le détecter)
        </Case>
        <p className="text-[11px] text-slate-500">Les seuils sont des valeurs de départ, à ajuster selon vos téléphones. Les alertes ne bloquent jamais une photo.</p>
        <div className="grid grid-cols-2 gap-2">
          <ChampNombre libelle="Netteté minimale" valeur={reglages.seuils.netteteMin} min={0} max={10000} onCommit={(n) => onChange({ seuils: { netteteMin: n } })} />
          <ChampNombre libelle="Contraste minimal" valeur={reglages.seuils.contrasteMin} min={0} max={128} onCommit={(n) => onChange({ seuils: { contrasteMin: n } })} />
          <ChampNombre libelle="Luminosité minimale (0-255)" valeur={reglages.seuils.luminositeMin} min={0} max={255} onCommit={(n) => onChange({ seuils: { luminositeMin: n } })} />
          <ChampNombre libelle="Luminosité maximale (0-255)" valeur={reglages.seuils.luminositeMax} min={0} max={255} onCommit={(n) => onChange({ seuils: { luminositeMax: n } })} />
        </div>
        <button onClick={() => onChange(null)} className={SECONDAIRE}>
          Rétablir les valeurs par défaut
        </button>
      </div>

      <div className={CARTE}>
        <h4 className="font-bold text-slate-200 text-sm">Données de cet appareil</h4>
        <p className="text-xs text-slate-400 leading-relaxed">
          La liste, les photos et les réglages ne quittent jamais cet appareil. Cette action les efface définitivement, pour ce compte.
        </p>
        <button onClick={onEffacerTout} className={`${BOUTON} bg-rose-950 hover:bg-rose-900 text-rose-200`}>
          <Trash2 className="w-3.5 h-3.5" />
          Effacer la liste, les photos et les réglages
        </button>
      </div>
    </div>
  );
}

// ---------- assemblage ----------

function StudioPhotosInterne({ uid, classes = [], notify }: Props) {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur'>('chargement');
  const [messageErreur, setMessageErreur] = useState('');
  const [reglages, setReglages] = useState(() => normaliserReglages(undefined));
  const [eleves, setEleves] = useState<any[]>([]);
  const [photos, setPhotos] = useState<Map<string, any>>(new Map());
  const [onglet, setOnglet] = useState<Onglet>('classe');
  const [index, setIndex] = useState(0);

  // Ouverture de la mémoire locale de ce compte
  useEffect(() => {
    let annule = false;
    let base: IDBDatabase | null = null;
    (async () => {
      try {
        base = await ouvrirBase(uid);
        const brut = await lire(base, 'reglages', 'normes');
        let r = normaliserReglages(brut?.valeur);
        if (!brut) {
          if (appareilLimite()) r = normaliserReglages({ ...r, modeLeger: true });
          await sauverReglages(base, r);
        }
        const listeEleves = await lireTout(base, 'eleves');
        const listePhotos = await lireTout(base, 'photos');
        if (annule) {
          base.close();
          return;
        }
        listeEleves.sort((a: any, b: any) => (a.rang ?? 0) - (b.rang ?? 0));
        setDb(base);
        setReglages(r);
        setEleves(listeEleves);
        setPhotos(new Map(listePhotos.map((p: any) => [p.eleveId, p])));
        setOnglet(listeEleves.length > 0 ? 'photos' : 'classe');
        setEtat('pret');
      } catch (err: any) {
        if (!annule) {
          setMessageErreur(err?.message || 'Le stockage local est indisponible.');
          setEtat('erreur');
        }
      }
    })();
    return () => {
      annule = true;
      if (base) base.close();
    };
  }, [uid]);

  // ---------- réglages ----------

  const changerReglages = async (patch: any) => {
    const suivant =
      patch === null
        ? normaliserReglages(undefined)
        : normaliserReglages({
            ...reglages,
            ...patch,
            verifications: { ...reglages.verifications, ...(patch.verifications || {}) },
            seuils: { ...reglages.seuils, ...(patch.seuils || {}) },
            zip: { ...reglages.zip, ...(patch.zip || {}) }
          });
    setReglages(suivant);
    try {
      if (db) await sauverReglages(db, suivant);
    } catch (err) {
      notify("Réglages non enregistrés : l'espace de l'appareil est peut-être plein.", 'error');
    }
  };

  // ---------- liste de classe ----------

  const remplacerListe = async (liste: any[]) => {
    if (!db) return false;
    const ids = new Set(liste.map((e) => e.id));
    const orphelines = Array.from(photos.keys()).filter((id) => !ids.has(id));
    if (orphelines.length > 0 && !window.confirm(`${orphelines.length} photo(s) ne correspondent plus à la liste et seront supprimées de cet appareil. Continuer ?`)) {
      return false;
    }
    try {
      const avecRang = liste.map((e, i) => ({ ...e, rang: i }));
      await viderStore(db, 'eleves');
      await ecrireTout(db, 'eleves', avecRang);
      for (const id of orphelines) await supprimer(db, 'photos', id);
      setEleves(avecRang);
      setPhotos((prev) => {
        const m = new Map(prev);
        orphelines.forEach((id) => m.delete(id));
        return m;
      });
      setIndex(0);
      return true;
    } catch (err: any) {
      notify(err?.message || 'Enregistrement de la liste impossible.', 'error');
      return false;
    }
  };

  const ajouterEleve = async (e: any) => {
    if (!db) return;
    const propre = { matricule: e.matricule.trim(), nom: e.nom.trim(), prenoms: e.prenoms.trim(), npi: e.npi.trim() };
    const rang = Math.max(-1, ...eleves.map((x) => x.rang ?? 0)) + 1;
    const complet = { ...propre, id: idEleve(propre, new Set(eleves.map((x) => x.id))), rang };
    try {
      await ecrire(db, 'eleves', complet);
      setEleves([...eleves, complet]);
    } catch (err: any) {
      notify(err?.message || 'Ajout impossible.', 'error');
    }
  };

  const retirerEleve = async (id: string) => {
    if (!db) return;
    const e = eleves.find((x) => x.id === id);
    if (!window.confirm(`Retirer ${e ? nomComplet(e) : 'cet élève'}${photos.has(id) ? ' et sa photo' : ''} de cet appareil ?`)) return;
    try {
      await supprimer(db, 'eleves', id);
      await supprimer(db, 'photos', id);
      setEleves((l) => l.filter((x) => x.id !== id));
      setPhotos((prev) => {
        const m = new Map(prev);
        m.delete(id);
        return m;
      });
    } catch (err: any) {
      notify(err?.message || 'Suppression impossible.', 'error');
    }
  };

  // ---------- photos ----------

  const enregistrerPhoto = async (photo: any) => {
    if (!db) throw new Error('Stockage local indisponible.');
    await ecrire(db, 'photos', photo);
    setPhotos((prev) => new Map(prev).set(photo.eleveId, photo));
    demanderStockagePersistant();
  };

  const supprimerPhoto = async (id: string) => {
    if (!db) return;
    try {
      await supprimer(db, 'photos', id);
      setPhotos((prev) => {
        const m = new Map(prev);
        m.delete(id);
        return m;
      });
    } catch (err: any) {
      notify(err?.message || 'Suppression impossible.', 'error');
    }
  };

  const indexSur = Math.min(index, Math.max(0, eleves.length - 1));
  const eleve = eleves[indexSur];
  const avecPhoto = eleves.filter((e) => photos.has(e.id)).length;

  const suivantSansPhoto = () => {
    for (let k = 1; k < eleves.length; k += 1) {
      const i = (indexSur + k) % eleves.length;
      if (!photos.has(eleves[i].id)) return i;
    }
    return -1;
  };

  const surPhotoValidee = async (photo: any) => {
    await enregistrerPhoto(photo);
    const i = suivantSansPhoto();
    if (i >= 0) setIndex(i);
    else notify("Toutes les photos de la classe sont prises. Passez à l'onglet Rapport pour exporter.", 'success');
  };

  const refaire = (id: string) => {
    const i = eleves.findIndex((e) => e.id === id);
    if (i >= 0) setIndex(i);
    setOnglet('photos');
  };

  // ---------- effacement complet ----------

  const effacerTout = async () => {
    if (!window.confirm('Effacer définitivement la liste, toutes les photos et les réglages du Studio Photo sur cet appareil ?')) return;
    try {
      db?.close();
      setDb(null);
      await supprimerBase(uid);
      const base = await ouvrirBase(uid);
      const initial = normaliserReglages(undefined);
      await sauverReglages(base, initial);
      setDb(base);
      setReglages(initial);
      setEleves([]);
      setPhotos(new Map());
      setIndex(0);
      setOnglet('classe');
      notify('Toutes les données du Studio Photo ont été effacées de cet appareil.', 'success');
    } catch (err: any) {
      notify(err?.message || 'Effacement impossible.', 'error');
    }
  };

  // ---------- affichage ----------

  if (etat === 'chargement') return <p className="text-sm text-slate-400">Ouverture du Studio Photo…</p>;
  if (etat === 'erreur') {
    return (
      <div className={CARTE}>
        <p className="text-sm text-rose-300 leading-relaxed">{messageErreur}</p>
        <p className="text-xs text-slate-500">Le Studio Photo garde les photos dans la mémoire du navigateur. Il ne fonctionne pas en navigation privée sur certains navigateurs.</p>
      </div>
    );
  }

  const onglets: { id: Onglet; libelle: string; icone: React.ReactNode }[] = [
    { id: 'classe', libelle: 'Classe', icone: <Users className="w-3.5 h-3.5" /> },
    { id: 'photos', libelle: 'Photos', icone: <Camera className="w-3.5 h-3.5" /> },
    { id: 'rapport', libelle: 'Rapport', icone: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'normes', libelle: 'Normes & Profil', icone: <Settings2 className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="max-w-2xl mx-auto w-full space-y-5">
      <div>
        <h3 className="font-bold text-xl text-white">Studio Photo EducMaster</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">Photos d&apos;élèves au bon format, recadrées, nommées et prêtes à envoyer. Tout reste sur cet appareil : aucune photo n&apos;est envoyée nulle part.</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {onglets.map((o) => (
          <button
            key={o.id}
            onClick={() => setOnglet(o.id)}
            className={`text-[11px] font-bold px-1.5 py-2.5 rounded-xl flex flex-col items-center gap-1 border transition-colors ${
              onglet === o.id ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            {o.icone}
            {o.libelle}
          </button>
        ))}
      </div>

      {onglet === 'classe' && (
        <OngletClasse eleves={eleves} classes={classes} photos={photos} onRemplacer={remplacerListe} onAjouter={ajouterEleve} onRetirer={retirerEleve} notify={notify} />
      )}

      {onglet === 'photos' &&
        (eleves.length === 0 || !eleve ? (
          <p className="text-sm text-slate-400">Importez d&apos;abord la liste de la classe, dans l&apos;onglet Classe.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setIndex((indexSur - 1 + eleves.length) % eleves.length)} className={SECONDAIRE} aria-label="Élève précédent">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select value={indexSur} onChange={(e) => setIndex(Number(e.target.value))} className={`${CHAMP} flex-1`}>
                {eleves.map((e, i) => (
                  <option key={e.id} value={i}>
                    {photos.has(e.id) ? '✓ ' : ''}
                    {i + 1}. {nomComplet(e)}
                  </option>
                ))}
              </select>
              <button onClick={() => setIndex((indexSur + 1) % eleves.length)} className={SECONDAIRE} aria-label="Élève suivant">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(avecPhoto / eleves.length) * 100}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {avecPhoto} photo(s) sur {eleves.length}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <p className="text-sm font-bold text-white">{nomComplet(eleve)}</p>
              <p className="text-[11px] text-slate-500">{[eleve.matricule && `Matricule ${eleve.matricule}`, eleve.npi && `NPI ${eleve.npi}`].filter(Boolean).join(' · ') || 'Sans matricule'}</p>
            </div>
            <CadrageView
              key={eleve.id}
              eleve={eleve}
              nomPrevu={nomFichier(eleve, reglages, indexSur).nom}
              reglages={reglages}
              photoExistante={photos.get(eleve.id)}
              onValider={surPhotoValidee}
              notify={notify}
            />
            {photos.has(eleve.id) && (
              <button onClick={() => supprimerPhoto(eleve.id)} className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer la photo de cet élève
              </button>
            )}
          </div>
        ))}

      {onglet === 'rapport' && <RapportView eleves={eleves} photos={photos} reglages={reglages} onRefaire={refaire} onEnregistrerPhoto={enregistrerPhoto} notify={notify} />}

      {onglet === 'normes' && <OngletNormes reglages={reglages} onChange={changerReglages} eleves={eleves} nbPhotos={photos.size} onEffacerTout={effacerTout} />}
    </div>
  );
}

export default function StudioPhotos(props: Props) {
  if (!STUDIO_PHOTO_ACTIVE) return null;
  return <StudioPhotosInterne {...props} />;
}