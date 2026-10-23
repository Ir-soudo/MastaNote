import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle, ChevronDown, Download, Info, Share2 } from 'lucide-react';
import { EPREUVES_RAPPORT, ETAPES, MODE_ARRONDI_DEFAUT, SEUIL_REUSSITE, evaluationPourEtape } from './config.js';
import { EPREUVES_IDS, calculerClasse, verifierDonnees } from './metrics.js';
import { construireFicheClasse, tableauFicheClasse } from './layout.js';
import { formesVersSvg } from './svg.js';
import { genererPdf, genererPng, genererXlsx, partagerImage, peutPartagerImage, telecharger } from './export.js';
import { resultatExemple } from './exemple.js';
import EcoleView from './EcoleView';
import { creerSynthese, nomFichierSynthese, versCode } from './synthese.js';

// ==========================================================
// MODULE « RAPPORTS D'ÉTAPE » — contrôle des données, résultats et fiche de classe téléchargeable
//
// Ce module LIT les classes et les notes de l'application (il ne les modifie JAMAIS).
// Les informations qui manquaient à l'application (sexe, absences, Communication orale) et les champs
// de l'en-tête du rapport sont enregistrés dans des stockages SÉPARÉS, propres au module :
//   mastanote-reports-v1 (données de classe) et mastanote-reports-meta-v1 (en-tête et observations).
// Supprimer ce module et ces stockages ne change rien au reste de l'application.
// ==========================================================

const STORAGE_KEY = 'mastanote-reports-v1';
const META_KEY = 'mastanote-reports-meta-v1';
const PERF_MIN_NOTE = 10; // même règle que l'application : pas de perfectionnement sous 10/20
const PERF_MAX = 2;

// Largeurs de l'aperçu : ajusté à l'écran, grand, très grand (défilement horizontal au-delà)
const LARGEURS_APERCU: (string | number)[] = ['100%', 1000, 1500];
const NOMS_ZOOM = ["Ajuster à l'écran", 'Agrandir', 'Très grand'];

type Sexe = 'M' | 'F';
type CelluleSaisie = { note?: string; perf?: string };
type ClassExtra = {
  sexe: Record<string, Sexe>;
  absences: Record<string, Record<string, boolean>>; // évaluation -> élève -> absent
  commOrale: Record<string, Record<string, CelluleSaisie>>; // évaluation -> élève -> note saisie
};
type Extras = Record<string, ClassExtra>;

type Meta = { ecole: string; circonscription: string; annee: string; lieu: string; date: string; directeur: string };
type MetaStore = { meta: Meta; observations: Record<string, string> };

const emptyExtra = (): ClassExtra => ({ sexe: {}, absences: {}, commOrale: {} });

const loadExtras = (): Extras => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.error('Impossible de lire les données du module Rapports :', err);
    return {};
  }
};

// Année scolaire proposée par défaut (modifiable) : à partir de septembre, la nouvelle année commence
const anneeParDefaut = () => {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const metaVide = (): MetaStore => ({
  meta: { ecole: '', circonscription: '', annee: anneeParDefaut(), lieu: '', date: new Date().toLocaleDateString('fr-FR'), directeur: '' },
  observations: {}
});

const loadMeta = (): MetaStore => {
  try {
    const raw = localStorage.getItem(META_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object' && parsed.meta) {
      return { meta: { ...metaVide().meta, ...parsed.meta }, observations: parsed.observations || {} };
    }
  } catch (err) {
    console.error("Impossible de lire l'en-tête du rapport :", err);
  }
  return metaVide();
};

const parseNum = (s: unknown): number | null => {
  if (s === undefined || s === null || s === '') return null;
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const noteValide = (n: number | null): n is number => n !== null && n >= 0 && n <= 20;

// Nom de fichier sans accents ni espaces
const slug = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

// Transforme les données de l'application + celles du module en élèves « prêts pour le moteur de calcul ».
function construireEleves(classe: any, notes: any, extras: Extras, evaluationId: string) {
  const notesClasse = notes?.[classe.id]?.[evaluationId] || {};
  const extra = extras[classe.id] || emptyExtra();

  return classe.eleves.map((el: any) => {
    const epreuves: Record<string, { note: number; perf: number }> = {};
    for (const id of EPREUVES_IDS as string[]) {
      let note: number | null = null;
      let perf: number | null = null;
      if (id === 'communication_orale') {
        const saisie = extra.commOrale?.[evaluationId]?.[el.id];
        note = parseNum(saisie?.note);
        perf = parseNum(saisie?.perf);
      } else {
        const cellule = notesClasse[id]?.[el.id];
        note = typeof cellule?.note === 'number' ? cellule.note : null;
        perf = typeof cellule?.perf === 'number' ? cellule.perf : null;
      }
      if (!noteValide(note)) continue;
      // Même règle que l'export EducMaster : aucun perfectionnement si la note est inférieure à 10
      const perfRetenu = note < PERF_MIN_NOTE ? 0 : Math.min(Math.max(perf ?? 0, 0), PERF_MAX);
      epreuves[id] = { note, perf: perfRetenu };
    }
    return {
      id: el.id,
      sexe: extra.sexe?.[el.id] ?? el.sexe,
      absent: Boolean(extra.absences?.[evaluationId]?.[el.id]),
      epreuves
    };
  });
}

const fmtPct = (v: number | null) => (v === null ? '—' : `${v.toFixed(2).replace('.', ',')} %`);

// ==========================================================
// COMPOSANT PRINCIPAL
// ==========================================================
export default function ReportsModule({
  classes,
  notes,
  onClose
}: {
  classes: any[];
  notes: any;
  onClose: () => void;
}) {
  const [extras, setExtras] = useState<Extras>(loadExtras);
  const [store, setStore] = useState<MetaStore>(loadMeta);
  const [classId, setClassId] = useState<string>(classes?.[0]?.id ?? '');
  const [etape, setEtape] = useState<number>(ETAPES[0].numero);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [enCours, setEnCours] = useState('');
  const [erreurExport, setErreurExport] = useState('');
  const [partagePossible] = useState<boolean>(() => peutPartagerImage());
  const [modeExemple, setModeExemple] = useState(false); // téléchargement d'une fiche fictive (filigrane EXEMPLE)
  const [vue, setVue] = useState<'classe' | 'ecole'>('classe'); // « Ma classe » ou « Toute l'école »
  const [messageSynthese, setMessageSynthese] = useState('');
  const [zoom, setZoom] = useState<number>(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 0));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(extras));
    } catch (err) {
      console.error('Impossible de sauvegarder les données du module Rapports :', err);
    }
  }, [extras]);

  useEffect(() => {
    try {
      localStorage.setItem(META_KEY, JSON.stringify(store));
    } catch (err) {
      console.error("Impossible de sauvegarder l'en-tête du rapport :", err);
    }
  }, [store]);

  const classe = classes.find((c) => c.id === classId) ?? classes[0];
  const evaluationId = (evaluationPourEtape(etape) ?? 'sommative1') as string;

  const eleves = useMemo(
    () => (classe ? construireEleves(classe, notes, extras, evaluationId) : []),
    [classe, notes, extras, evaluationId]
  );
  const verification = useMemo(() => verifierDonnees(eleves), [eleves]);
  const resultat = useMemo(() => calculerClasse(eleves), [eleves]);

  const cleObservations = `${classe?.id ?? ''}:${etape}`;
  const observations = store.observations[cleObservations] ?? '';
  const setMeta = (patch: Partial<Meta>) => setStore((s) => ({ ...s, meta: { ...s.meta, ...patch } }));
  const setObservations = (v: string) =>
    setStore((s) => ({ ...s, observations: { ...s.observations, [cleObservations]: v } }));

  const donneesRapport = useMemo(
    () =>
      classe
        ? { classe: { nom: classe.nom, niveau: classe.niveau }, etape, resultat, meta: store.meta, observations }
        : null,
    [classe, etape, resultat, store.meta, observations]
  );
  const layout = useMemo(() => (donneesRapport ? construireFicheClasse(donneesRapport) : null), [donneesRapport]);
  const svgApercu = useMemo(() => (layout ? formesVersSvg(layout, { responsive: true }) : ''), [layout]);
  const exemple = useMemo(() => resultatExemple(), []);

  // Synthèse à transmettre au directeur (code + nom de fichier) : seulement si les données sont complètes
  const synthese = useMemo(() => {
    if (!classe || !verification.ok || resultat.composes.T === 0) return null;
    const s = creerSynthese({
      resultat,
      classe: { nom: classe.nom, niveau: classe.niveau },
      etape,
      annee: store.meta.annee
    });
    return { code: versCode(s), nom: nomFichierSynthese(s) };
  }, [classe, verification, resultat, etape, store.meta.annee]);

  const bloque = !verification.ok || resultat.composes.T === 0;

  const nomEleve = (id: string) => {
    const e = classe?.eleves.find((x: any) => x.id === id);
    return e ? `${e.nom} ${e.prenoms}` : id;
  };
  const libelleEpreuve = (id: string) => EPREUVES_RAPPORT.find((e) => e.id === id)?.libelle ?? id;
  const parType = (type: string) => verification.problemes.filter((p: any) => p.type === type);

  // --- Modifications du stockage du module ---
  const updateClassExtra = (fn: (c: ClassExtra) => ClassExtra) => {
    setExtras((prev) => ({ ...prev, [classe.id]: fn(prev[classe.id] ?? emptyExtra()) }));
  };

  const toggleSexe = (eleveId: string, sexe: Sexe) =>
    updateClassExtra((c) => {
      const next = { ...c.sexe };
      if (next[eleveId] === sexe) delete next[eleveId];
      else next[eleveId] = sexe;
      return { ...c, sexe: next };
    });

  const toggleAbsent = (eleveId: string) =>
    updateClassExtra((c) => {
      const ev = { ...(c.absences[evaluationId] || {}) };
      if (ev[eleveId]) delete ev[eleveId];
      else ev[eleveId] = true;
      return { ...c, absences: { ...c.absences, [evaluationId]: ev } };
    });

  const setComm = (eleveId: string, patch: CelluleSaisie) =>
    updateClassExtra((c) => {
      const ev = { ...(c.commOrale[evaluationId] || {}) };
      ev[eleveId] = { ...(ev[eleveId] || {}), ...patch };
      return { ...c, commOrale: { ...c.commOrale, [evaluationId]: ev } };
    });

  const marquerAbsentsSansNote = () => {
    const ids = parType('aucune-note').map((p: any) => p.eleveId as string);
    if (ids.length === 0) return;
    if (!confirm(`Marquer ${ids.length} élève(s) sans aucune note comme absents à l'étape ${etape} ?`)) return;
    updateClassExtra((c) => {
      const ev = { ...(c.absences[evaluationId] || {}) };
      ids.forEach((id) => {
        ev[id] = true;
      });
      return { ...c, absences: { ...c.absences, [evaluationId]: ev } };
    });
  };

  // --- Téléchargement ---
  const nomFichier = (extension: string) =>
    `rapport_etape${etape}_${slug(classe.niveau)}_${slug(store.meta.annee)}.${extension}`;

  const lancerExport = async (format: 'pdf' | 'png' | 'xlsx' | 'partager') => {
    // Mode exemple : fiche fictive avec filigrane. Mode normal : données réelles, seulement si le contrôle est au vert.
    const donnees = modeExemple
      ? {
          classe: { nom: 'Classe exemple', niveau: 'CM2' },
          etape,
          resultat: exemple,
          meta: store.meta,
          observations: 'Exemple : chiffres fictifs.',
          filigrane: 'EXEMPLE'
        }
      : donneesRapport;
    if (!donnees || (!modeExemple && bloque)) return;
    const mise = modeExemple ? construireFicheClasse(donnees) : layout;
    if (!mise) return;
    const nom = (extension: string) => `${modeExemple ? 'exemple_' : ''}${nomFichier(extension)}`;

    setMenuOuvert(false);
    setErreurExport('');
    setEnCours(format);
    try {
      if (format === 'pdf') telecharger(await genererPdf(mise), nom('pdf'));
      else if (format === 'png') telecharger(await genererPng(mise), nom('png'));
      else if (format === 'xlsx') telecharger(genererXlsx(tableauFicheClasse(donnees)), nom('xlsx'));
      else await partagerImage(await genererPng(mise), nom('png'), `Rapport d'étape ${etape}`);
    } catch (err: any) {
      console.error(err);
      setErreurExport(err?.message || "L'export a échoué. Réessayez.");
    } finally {
      setEnCours('');
    }
  };

  const copierCode = async () => {
    if (!synthese) return;
    try {
      await navigator.clipboard.writeText(synthese.code);
      setMessageSynthese('Code copié. Vous pouvez le coller dans WhatsApp.');
    } catch (err) {
      setMessageSynthese('Copie automatique impossible : sélectionnez le texte ci-dessus et copiez-le.');
    }
  };

  const telechargerSynthese = () => {
    if (!synthese) return;
    telecharger(new Blob([synthese.code], { type: 'text/plain;charset=utf-8' }), synthese.nom);
  };

  // Résultat d'une classe de cet appareil pour l'étape choisie (utilisé par la vue « Toute l'école »)
  const calculerPourClasse = (c: any) => {
    const elevesClasse = construireEleves(c, notes, extras, evaluationId);
    return { verification: verifierDonnees(elevesClasse), resultat: calculerClasse(elevesClasse) };
  };

  if (vue === 'ecole') {
    return (
      <EcoleView
        classes={classes}
        etape={etape}
        setEtape={setEtape}
        calculerPourClasse={calculerPourClasse}
        onBack={() => setVue('classe')}
        onClose={onClose}
      />
    );
  }

  const sansNote = parType('aucune-note');
  const sansSexe = parType('sexe-manquant');
  const notesManquantes = parType('note-manquante');

  const champClasse =
    'w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500';

  return (
    <div className="fixed inset-0 z-[48] bg-slate-900 text-slate-100 font-sans overflow-y-auto">
      <header className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-800 hover:bg-slate-900 text-slate-300 transition-colors"
            title="Retour à l'application"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-lg tracking-tight text-white">Rapports d'étape</h1>
            <p className="text-[11px] text-slate-400">Contrôle des données, résultats et fiche de classe</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-5 pb-16">
        <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button className="py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white">Ma classe</button>
          <button
            onClick={() => setVue('ecole')}
            className="py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Toute l'école
          </button>
        </div>
        {!classe ? (
          <div className="text-center py-16 text-sm text-slate-400 border border-dashed border-slate-800 rounded-2xl">
            Aucune classe disponible. Créez d'abord une classe dans l'application.
          </div>
        ) : (
          <>
            <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-2xl p-3.5 text-xs text-slate-300 flex gap-2.5">
              <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-px" />
              <p>
                Ce module <strong className="text-white">lit</strong> vos classes et vos notes sans jamais les modifier.
                Le sexe, les absences, la Communication orale et l'en-tête du rapport sont enregistrés à part. Le calcul suit vos règles :
                seuil de {SEUIL_REUSSITE}/20, coefficient 1,
                {MODE_ARRONDI_DEFAUT === 'troncature' ? ' pourcentages tronqués à deux décimales' : ' pourcentages arrondis à deux décimales'}.
              </p>
            </div>

            {/* Choix de la classe et de l'étape */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-1">Classe</label>
                <select
                  value={classe.id}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.niveau})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5 px-1">Étape</label>
                <select
                  value={etape}
                  onChange={(e) => setEtape(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-indigo-500/50 text-slate-200 text-sm font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
                >
                  {ETAPES.map((e: any) => (
                    <option key={e.numero} value={e.numero}>
                      Étape {e.numero} (Sommative {e.numero})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {classe.eleves.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400 border border-dashed border-slate-800 rounded-2xl">
                Cette classe n'a pas encore d'élèves.
              </div>
            ) : (
              <>
                {/* ---------------- CONTRÔLE DES DONNÉES ---------------- */}
                <section className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h2 className="font-bold text-white text-sm">Contrôle des données</h2>

                  {verification.ok ? (
                    <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-300 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-px" />
                      <span>Données complètes : les résultats ci-dessous sont fiables et le rapport peut être téléchargé.</span>
                    </div>
                  ) : (
                    <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                      <span>
                        Données incomplètes : les résultats ci-dessous sont <strong>provisoires</strong>. Le rapport ne pourra être téléchargé
                        qu'une fois les points suivants corrigés.
                      </span>
                    </div>
                  )}

                  {sansSexe.length > 0 && (
                    <p className="text-xs text-slate-300">
                      <strong className="text-amber-300">{sansSexe.length}</strong> élève(s) sans sexe renseigné (les colonnes G et F seraient fausses).
                    </p>
                  )}
                  {sansNote.length > 0 && (
                    <div className="text-xs text-slate-300 space-y-1.5">
                      <p>
                        <strong className="text-amber-300">{sansNote.length}</strong> élève(s) sans aucune note à cette étape (absents ?) :
                      </p>
                      <p className="text-slate-400">{sansNote.map((p: any) => nomEleve(p.eleveId)).join(' ; ')}</p>
                      <button
                        onClick={marquerAbsentsSansNote}
                        className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-200 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Les marquer absents
                      </button>
                    </div>
                  )}
                  {notesManquantes.length > 0 && (
                    <div className="text-xs text-slate-300 space-y-1">
                      <p>
                        <strong className="text-amber-300">{notesManquantes.length}</strong> élève(s) avec des notes manquantes :
                      </p>
                      <ul className="max-h-40 overflow-y-auto space-y-0.5 text-slate-400">
                        {notesManquantes.map((p: any) => (
                          <li key={p.eleveId}>
                            {nomEleve(p.eleveId)} : {(p.epreuves as string[]).map(libelleEpreuve).join(', ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>

                {/* ---------------- RAPPORT : FICHE DE CLASSE ---------------- */}
                <section className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-white text-sm">Rapport — fiche de classe</h2>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Résultats de l'évaluation d'étape n°{etape}, prêts à imprimer, signer et transmettre.
                      </p>
                    </div>

                    {/* Un seul bouton : il propose les formats disponibles */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() => {
                          setModeExemple(false);
                          setMenuOuvert((o) => !o);
                        }}
                        disabled={bloque || enCours !== ''}
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 disabled:opacity-40 transition-all"
                      >
                        {enCours ? (
                          <span className="w-3.5 h-3.5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Télécharger
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {menuOuvert && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setMenuOuvert(false)} />
                          <div className="absolute right-0 mt-2 w-64 z-30 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1.5">
                            {modeExemple && (
                              <p className="px-3 py-1.5 text-[10px] font-bold text-amber-300">
                                Exemple : chiffres fictifs, filigrane « EXEMPLE »
                              </p>
                            )}
                            <button
                              onClick={() => lancerExport('pdf')}
                              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-900 transition-colors"
                            >
                              <span className="block text-xs font-bold text-white">PDF</span>
                              <span className="block text-[10px] text-slate-400">Prêt à imprimer et à signer</span>
                            </button>
                            <button
                              onClick={() => lancerExport('png')}
                              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-900 transition-colors"
                            >
                              <span className="block text-xs font-bold text-white">Image (PNG)</span>
                              <span className="block text-[10px] text-slate-400">Pour WhatsApp ou une impression rapide</span>
                            </button>
                            <button
                              onClick={() => lancerExport('xlsx')}
                              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-900 transition-colors"
                            >
                              <span className="block text-xs font-bold text-white">Excel (.xlsx)</span>
                              <span className="block text-[10px] text-slate-400">Pour remonter les chiffres au RUP</span>
                            </button>
                            {partagePossible && (
                              <button
                                onClick={() => lancerExport('partager')}
                                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2"
                              >
                                <Share2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                <span>
                                  <span className="block text-xs font-bold text-white">Partager l'image…</span>
                                  <span className="block text-[10px] text-slate-400">WhatsApp, e-mail, etc.</span>
                                </span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {bloque && (
                    <p className="text-[11px] text-amber-300">
                      {resultat.composes.T === 0
                        ? "Aucun élève n'a composé à cette étape : rien à rapporter."
                        : 'Le téléchargement sera possible quand le contrôle des données ci-dessus sera au vert.'}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      setModeExemple(true);
                      setMenuOuvert(true);
                    }}
                    className="text-[11px] font-bold text-indigo-300 underline hover:text-indigo-200"
                  >
                    Télécharger un exemple avec des chiffres fictifs
                  </button>
                  {erreurExport && <p className="text-[11px] text-rose-300">{erreurExport}</p>}

                  {/* En-tête du rapport */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">École</label>
                      <input className={champClasse} value={store.meta.ecole} onChange={(e) => setMeta({ ecole: e.target.value })} placeholder="Ex : EPP Tchankada" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">Circonscription scolaire</label>
                      <input className={champClasse} value={store.meta.circonscription} onChange={(e) => setMeta({ circonscription: e.target.value })} placeholder="Ex : Toviklin" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">Année scolaire</label>
                      <input className={champClasse} value={store.meta.annee} onChange={(e) => setMeta({ annee: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">Nom du directeur (facultatif)</label>
                      <input className={champClasse} value={store.meta.directeur} onChange={(e) => setMeta({ directeur: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">Fait à</label>
                      <input className={champClasse} value={store.meta.lieu} onChange={(e) => setMeta({ lieu: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">Le</label>
                      <input className={champClasse} value={store.meta.date} onChange={(e) => setMeta({ date: e.target.value })} placeholder="JJ/MM/AAAA" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1">
                      Observations (colonne OBS de cette classe et de cette étape)
                    </label>
                    <textarea
                      className={`${champClasse} min-h-[72px]`}
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder="Remarques pédagogiques, appréciation globale..."
                    />
                  </div>

                  {/* Aperçu : exactement ce qui sera téléchargé */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5 px-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Aperçu</p>
                      <div className="flex gap-1">
                        {NOMS_ZOOM.map((nom, i) => (
                          <button
                            key={nom}
                            onClick={() => setZoom(i)}
                            className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-colors ${
                              zoom === i
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {nom}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-white">
                      <div style={{ width: LARGEURS_APERCU[zoom] }} dangerouslySetInnerHTML={{ __html: svgApercu }} />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 px-1">
                      Faites défiler l'aperçu horizontalement sur téléphone. La zone de signature et le cachet restent à apposer sur la version imprimée.
                    </p>
                  </div>
                </section>

                {/* ---------------- SYNTHÈSE À TRANSMETTRE AU DIRECTEUR ---------------- */}
                <section className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h2 className="font-bold text-white text-sm">Synthèse à transmettre au directeur</h2>
                  <p className="text-[11px] text-slate-400">
                    Un code court à envoyer par WhatsApp, ou un fichier : il ne contient que des effectifs et des totaux, aucun nom d'élève.
                    Le directeur l'importe dans « Toute l'école ».
                  </p>
                  {!synthese ? (
                    <p className="text-[11px] text-amber-300">Disponible quand le contrôle des données ci-dessus est au vert.</p>
                  ) : (
                    <>
                      <textarea
                        readOnly
                        value={synthese.code}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-mono rounded-xl px-3 py-2 min-h-[72px] focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={copierCode}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-3.5 py-2 rounded-lg transition-colors"
                        >
                          Copier le code
                        </button>
                        <button
                          onClick={telechargerSynthese}
                          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-[11px] px-3.5 py-2 rounded-lg transition-colors"
                        >
                          Télécharger le fichier
                        </button>
                      </div>
                      {messageSynthese && <p className="text-[11px] text-emerald-300">{messageSynthese}</p>}
                    </>
                  )}
                </section>

                {/* ---------------- RÉSULTATS ---------------- */}
                <section className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
                  <h2 className="font-bold text-white text-sm">
                    Résultats {verification.ok ? '' : 'provisoires '}— {classe.nom}, étape {etape}
                  </h2>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-bold">
                        <tr>
                          <th className="px-3 py-2 text-left rounded-l-lg">Effectifs</th>
                          <th className="px-3 py-2 text-center">G</th>
                          <th className="px-3 py-2 text-center">F</th>
                          <th className="px-3 py-2 text-center rounded-r-lg">T</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(
                          [
                            ['Inscrits', resultat.inscrits],
                            ['Ont composé', resultat.composes],
                            ['Ont la moyenne', resultat.recus]
                          ] as [string, any][]
                        ).map(([label, v]) => (
                          <tr key={label}>
                            <td className="px-3 py-2 font-semibold text-white">{label}</td>
                            <td className="px-3 py-2 text-center">{v.G}</td>
                            <td className="px-3 py-2 text-center">{v.F}</td>
                            <td className="px-3 py-2 text-center font-bold text-white">{v.T}</td>
                          </tr>
                        ))}
                        <tr>
                          <td className="px-3 py-2 font-semibold text-white">Pourcentage</td>
                          <td className="px-3 py-2 text-center">{fmtPct(resultat.pourcentage.G)}</td>
                          <td className="px-3 py-2 text-center">{fmtPct(resultat.pourcentage.F)}</td>
                          <td className="px-3 py-2 text-center font-bold text-indigo-300">{fmtPct(resultat.pourcentage.T)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-bold">
                        <tr>
                          <th className="px-3 py-2 text-left rounded-l-lg">Épreuve</th>
                          <th className="px-3 py-2 text-center">Ont composé</th>
                          <th className="px-3 py-2 text-center">Seuil atteint</th>
                          <th className="px-3 py-2 text-center">%</th>
                          <th className="px-3 py-2 text-center rounded-r-lg">À renforcer</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {EPREUVES_RAPPORT.map((ep: any) => {
                          const st = resultat.parEpreuve[ep.id];
                          return (
                            <tr key={ep.id}>
                              <td className="px-3 py-2 font-semibold text-white">
                                {ep.libelle}
                                <span className="block text-[9px] font-normal text-slate-500">{ep.groupe}</span>
                              </td>
                              <td className="px-3 py-2 text-center">{st.composes.T}</td>
                              <td className="px-3 py-2 text-center">{st.atteint.T}</td>
                              <td className="px-3 py-2 text-center">{fmtPct(st.pourcentage.T)}</td>
                              <td className="px-3 py-2 text-center font-bold text-amber-300">{st.nonAtteint.T}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    « À renforcer » : élèves ayant composé l'épreuve sans atteindre {SEUIL_REUSSITE}/20. Les colonnes G et F détaillées figurent dans le rapport.
                  </p>
                </section>

                {/* ---------------- COMPLÉTER LES DONNÉES ---------------- */}
                <section className="space-y-3">
                  <h2 className="font-bold text-white text-sm px-1">Compléter les données de la classe</h2>
                  <p className="text-[11px] text-slate-400 px-1">
                    Sexe : cliquez G ou F (un second clic efface). Absent : concerne seulement l'étape {etape}. Communication orale : note de l'étape {etape}.
                  </p>

                  {classe.eleves.map((el: any) => {
                    const extra = extras[classe.id] || emptyExtra();
                    const sexe = extra.sexe[el.id] ?? el.sexe;
                    const absent = Boolean(extra.absences[evaluationId]?.[el.id]);
                    const saisie = extra.commOrale[evaluationId]?.[el.id] || {};
                    const noteNum = parseNum(saisie.note);
                    const noteInvalide = saisie.note !== undefined && saisie.note !== '' && !noteValide(noteNum);
                    const perfBloque = absent || (noteNum !== null && noteNum < PERF_MIN_NOTE);

                    return (
                      <div
                        key={el.id}
                        className={`bg-slate-950 border rounded-2xl p-3.5 space-y-3 ${
                          absent ? 'border-amber-500/30 opacity-70' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-white truncate">
                            {el.nom} {el.prenoms}
                          </p>
                          <button
                            onClick={() => toggleAbsent(el.id)}
                            className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                              absent
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {absent ? 'Absent' : 'Marquer absent'}
                          </button>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 w-12">Sexe</span>
                          <div
                            className={`inline-flex rounded-lg overflow-hidden border ${
                              sexe ? 'border-slate-800' : 'border-amber-500/50'
                            }`}
                          >
                            <button
                              onClick={() => toggleSexe(el.id, 'M')}
                              title="Garçon"
                              className={`px-3 py-1 text-[11px] font-bold transition-colors ${
                                sexe === 'M' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              G
                            </button>
                            <button
                              onClick={() => toggleSexe(el.id, 'F')}
                              title="Fille"
                              className={`px-3 py-1 text-[11px] font-bold transition-colors ${
                                sexe === 'F' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              F
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 w-12 leading-tight">Comm. orale</span>
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            placeholder="Note /20"
                            value={saisie.note ?? ''}
                            disabled={absent}
                            onChange={(e) => setComm(el.id, { note: e.target.value })}
                            className={`w-24 bg-slate-900 border rounded-lg px-2 py-1.5 text-center text-sm text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 ${
                              noteInvalide ? 'border-rose-500' : 'border-slate-800'
                            }`}
                          />
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            max={PERF_MAX}
                            placeholder={perfBloque ? '0' : `Perf ≤ ${PERF_MAX}`}
                            value={perfBloque ? '0' : saisie.perf ?? ''}
                            disabled={perfBloque}
                            onChange={(e) => setComm(el.id, { perf: e.target.value })}
                            className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-sm text-indigo-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                          />
                        </div>
                      </div>
                    );
                  })}
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}