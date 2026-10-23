import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { ETAPES } from './config.js';
import { NIVEAUX, consoliderEcole } from './ecole.js';
import { creerSynthese, depuisCode, versCode, versResultat } from './synthese.js';
import { resultatExemple } from './exemple.js';
import { construireSyntheseEcole, construireSyntheseNiveaux, tableauSyntheseEcole, tableauSyntheseNiveaux } from './layoutEcole.js';
import { formesVersSvg } from './svg.js';
import { genererPdf, genererPng, genererXlsx, partagerImage, peutPartagerImage, telecharger } from './export.js';
import TelechargerMenu, { type FormatExport } from './TelechargerMenu';

// ==========================================================
// ÉCRAN « TOUTE L'ÉCOLE »
// Le directeur indique, pour chaque classe de son école (une par niveau par défaut, modifiable : classes
// ajoutées, retirées, renommées), d'où viennent ses chiffres : une classe de CET appareil, ou une synthèse
// reçue d'un collègue (code collé ou fichier). L'écran additionne le tout, niveau par niveau puis pour l'école,
// et produit les fiches de l'école (aperçu, PDF, image, Excel).
// Stockage séparé : mastanote-reports-ecole-v1. Rien n'est modifié ailleurs dans l'application.
// ==========================================================

const KEY = 'mastanote-reports-ecole-v1';

type Entree = { id: string; niveau: string; libelle: string; source: 'locale' | 'importee'; classId?: string };
type Store = { entrees: Entree[]; syntheses: Record<string, Record<string, any>> }; // entrée -> étape -> synthèse

const LARGEURS_APERCU: (string | number)[] = ['100%', 1000, 1500];
const NOMS_ZOOM = ["Ajuster à l'écran", 'Agrandir', 'Très grand'];

const identifiant = () => `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const slug = (s: string) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const estExemple = (s: any) => String(s?.c ?? '').startsWith('EXEMPLE');

// Par défaut : une ligne par niveau ; si une classe de cet appareil a ce niveau, elle est proposée
const storeParDefaut = (classes: any[]): Store => ({
  entrees: NIVEAUX.map((niveau) => {
    const locale = classes.find((c) => c.niveau === niveau);
    return {
      id: `n_${niveau}`,
      niveau,
      libelle: locale ? locale.nom : niveau,
      source: locale ? 'locale' : 'importee',
      classId: locale?.id
    } as Entree;
  }),
  syntheses: {}
});

const chargerStore = (classes: any[]): Store => {
  try {
    const brut = localStorage.getItem(KEY);
    const lu = brut ? JSON.parse(brut) : null;
    if (lu && Array.isArray(lu.entrees) && lu.syntheses && typeof lu.syntheses === 'object') return lu;
  } catch (err) {
    console.error("Impossible de lire les données de l'école :", err);
  }
  return storeParDefaut(classes);
};

const fmtPct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${String(v).replace('.', ',')}%`);

export default function EcoleView({
  classes,
  etape,
  setEtape,
  meta,
  setMeta,
  calculerPourClasse,
  onBack,
  onClose
}: {
  classes: any[];
  etape: number;
  setEtape: (n: number) => void;
  meta: any;
  setMeta: (patch: any) => void;
  calculerPourClasse: (c: any) => { verification: { ok: boolean }; resultat: any };
  onBack: () => void;
  onClose: () => void;
}) {
  const [store, setStore] = useState<Store>(() => chargerStore(classes));
  const [brouillons, setBrouillons] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, { ok: boolean; texte: string }>>({});
  const [niveauAjout, setNiveauAjout] = useState<string>(NIVEAUX[0]);
  const [fiche, setFiche] = useState<'niveaux' | 'ecole'>('niveaux');
  const [zoom, setZoom] = useState<number>(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 1 : 0));
  const [enCours, setEnCours] = useState(false);
  const [erreurExport, setErreurExport] = useState('');
  const [partagePossible] = useState<boolean>(() => peutPartagerImage());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
    } catch (err) {
      console.error("Impossible de sauvegarder les données de l'école :", err);
    }
  }, [store]);

  const majEntree = (id: string, patch: Partial<Entree>) =>
    setStore((s) => ({ ...s, entrees: s.entrees.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));

  const supprimerEntree = (id: string) => {
    if (!confirm('Retirer cette classe de la liste ?')) return;
    setStore((s) => ({ ...s, entrees: s.entrees.filter((e) => e.id !== id) }));
  };

  const ajouterEntree = () =>
    setStore((s) => ({
      ...s,
      entrees: [...s.entrees, { id: identifiant(), niveau: niveauAjout, libelle: `${niveauAjout} (autre classe)`, source: 'importee' }]
    }));

  const dire = (id: string, ok: boolean, texte: string) => setMessages((m) => ({ ...m, [id]: { ok, texte } }));

  // Synthèse d'exemple (chiffres fictifs) pour essayer l'import sans attendre une vraie synthèse
  const syntheseExemple = (entree: Entree) =>
    creerSynthese({
      resultat: resultatExemple(Math.max(0, NIVEAUX.indexOf(entree.niveau))),
      classe: { nom: `EXEMPLE ${entree.niveau} (chiffres fictifs)`, niveau: entree.niveau },
      etape,
      annee: ''
    });
  const codeExemple = (entree: Entree) => versCode(syntheseExemple(entree));

  const importerTexte = (entree: Entree, texte: string) => {
    try {
      const s = depuisCode(texte);
      setStore((st) => ({
        ...st,
        syntheses: { ...st.syntheses, [entree.id]: { ...(st.syntheses[entree.id] || {}), [s.e]: s } }
      }));
      const avis: string[] = [`Synthèse importée : ${s.c || s.n}, étape ${s.e}.`];
      if (s.n !== entree.niveau) avis.push(`Attention : elle concerne le niveau ${s.n}, pas ${entree.niveau}.`);
      if (s.e !== etape) avis.push(`Elle concerne l'étape ${s.e} : choisissez cette étape pour la voir dans le total.`);
      const exemple = estExemple(s);
      if (exemple) avis.push('Chiffres fictifs : à remplacer par une vraie synthèse avant tout rapport.');
      dire(entree.id, s.n === entree.niveau && s.e === etape && !exemple, avis.join(' '));
      setBrouillons((b) => ({ ...b, [entree.id]: '' }));
    } catch (err: any) {
      dire(entree.id, false, err?.message || 'Import impossible.');
    }
  };

  const importerFichier = async (entree: Entree, fichier?: File | null) => {
    if (!fichier) return;
    try {
      importerTexte(entree, await fichier.text());
    } catch (err) {
      dire(entree.id, false, 'Impossible de lire ce fichier.');
    }
  };

  // Résultat de chaque ligne pour l'étape choisie
  const lignes = store.entrees.map((entree) => {
    if (entree.source === 'locale') {
      const classe = classes.find((c) => c.id === entree.classId);
      if (!classe) return { entree, etat: 'sans-classe', resultat: null as any };
      const { verification, resultat } = calculerPourClasse(classe);
      return { entree, etat: verification.ok ? 'ok' : 'provisoire', resultat };
    }
    const s = store.syntheses[entree.id]?.[etape];
    return s ? { entree, etat: 'ok', resultat: versResultat(s) } : { entree, etat: 'vide', resultat: null as any };
  });

  // Calcul léger : refait à chaque affichage, il ne peut donc jamais être périmé
  const consolidation = consoliderEcole(
    lignes.map((l) => ({ id: l.entree.id, niveau: l.entree.niveau, resultat: l.resultat }))
  );
  // Essai rapide : remplit en un clic toutes les lignes vides ou incomplètes avec des chiffres fictifs
  // (les lignes déjà complètes ne changent pas ; une ligne « classe de cet appareil » passe en « synthèse reçue »).
  const remplirAvecExemples = () => {
    const aRemplir = lignes.filter((l) => l.etat !== 'ok').map((l) => l.entree);
    if (aRemplir.length === 0) {
      alert("Toutes les lignes ont déjà leurs chiffres : rien à remplir pour l'étape " + etape + '.');
      return;
    }
    if (!confirm(`Remplir ${aRemplir.length} ligne(s) vide(s) ou incomplète(s) avec des chiffres fictifs d'exemple pour l'étape ${etape} ?`)) return;
    setStore((s) => {
      const ids = new Set(aRemplir.map((e) => e.id));
      const syntheses = { ...s.syntheses };
      for (const e of aRemplir) syntheses[e.id] = { ...(syntheses[e.id] || {}), [etape]: syntheseExemple(e) };
      return { ...s, entrees: s.entrees.map((e) => (ids.has(e.id) ? { ...e, source: 'importee' as const } : e)), syntheses };
    });
  };

  // Retire toutes les synthèses d'exemple (toutes les étapes) pour repartir sur de vrais chiffres
  const effacerExemples = () => {
    if (!confirm("Effacer toutes les synthèses d'exemple (toutes les étapes) ?")) return;
    setStore((s) => {
      const syntheses: Record<string, Record<string, any>> = {};
      for (const [id, parEtape] of Object.entries(s.syntheses)) {
        const reste: Record<string, any> = {};
        for (const [e, syn] of Object.entries(parEtape)) if (!estExemple(syn)) reste[e] = syn;
        if (Object.keys(reste).length) syntheses[id] = reste;
      }
      return { ...s, syntheses };
    });
  };

  const provisoire = lignes.some((l) => l.etat === 'provisoire');
  const sansDonnees = consolidation.parNiveau.filter((n) => !n.resultat).map((n) => n.niveau);

  // --- Fiches de l'école ---
  const lignesIncompletes = lignes.filter((l) => l.etat !== 'ok');
  const bloqueFiche = !consolidation.ecole || lignesIncompletes.length > 0;
  const aExemple = lignes.some((l) => l.entree.source === 'importee' && estExemple(store.syntheses[l.entree.id]?.[etape]));
  const filigrane = aExemple ? 'EXEMPLE' : '';
  // Date vide : on imprime la date du jour au moment du téléchargement (jamais une ancienne date figée)
  const donneesFiche = {
    consolidation,
    etape,
    meta: { ...meta, date: meta.date || new Date().toLocaleDateString('fr-FR') },
    filigrane
  };
  const layoutFiche = consolidation.ecole
    ? fiche === 'niveaux'
      ? construireSyntheseNiveaux(donneesFiche)
      : construireSyntheseEcole(donneesFiche)
    : null;
  const svgApercu = layoutFiche ? formesVersSvg(layoutFiche, { responsive: true }) : '';

  const lancerExport = async (format: FormatExport) => {
    if (!layoutFiche || bloqueFiche) return;
    setErreurExport('');
    setEnCours(true);
    const nom = (ext: string) =>
      `${filigrane ? 'exemple_' : ''}${fiche === 'niveaux' ? 'synthese-niveaux' : 'synthese-ecole'}_etape${etape}_${slug(meta.annee)}.${ext}`;
    try {
      if (format === 'pdf') telecharger(await genererPdf(layoutFiche), nom('pdf'));
      else if (format === 'png') telecharger(await genererPng(layoutFiche), nom('png'));
      else if (format === 'xlsx') {
        const tableau = fiche === 'niveaux' ? tableauSyntheseNiveaux(donneesFiche) : tableauSyntheseEcole(donneesFiche);
        telecharger(genererXlsx(tableau), nom('xlsx'));
      } else await partagerImage(await genererPng(layoutFiche), nom('png'), `Fiche d'école, étape ${etape}`);
    } catch (err: any) {
      console.error(err);
      setErreurExport(err?.message || "L'export a échoué. Réessayez.");
    } finally {
      setEnCours(false);
    }
  };

  const champ =
    'bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500';
  const etiquette = 'block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 px-1';

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
            <p className="text-[11px] text-slate-400">Toute l'école : consolidation des classes</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-5 pb-16">
        <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button onClick={onBack} className="py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors">
            Ma classe
          </button>
          <button className="py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white">Toute l'école</button>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1.5 px-1">Étape</label>
          <select
            value={etape}
            onChange={(e) => setEtape(Number(e.target.value))}
            className={`w-full ${champ} font-bold border-indigo-500/50`}
          >
            {ETAPES.map((e: any) => (
              <option key={e.numero} value={e.numero}>
                Étape {e.numero} (Sommative {e.numero})
              </option>
            ))}
          </select>
        </div>

        <p className="text-[11px] text-slate-400 px-1">
          Pour chaque classe, choisissez d'où viennent les chiffres : une classe de cet appareil, ou la synthèse envoyée par
          l'enseignant (code ou fichier, sans aucun nom d'élève). Vous pouvez ajouter, renommer ou retirer des classes.
        </p>

        {/* Aide à l'essai : chiffres fictifs en un clic */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={remplirAvecExemples}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-300 font-bold text-[11px] px-3 py-2 rounded-lg transition-colors"
          >
            Remplir les lignes vides avec des exemples
          </button>
          <button
            onClick={effacerExemples}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 font-bold text-[11px] px-3 py-2 rounded-lg transition-colors"
          >
            Effacer les exemples
          </button>
        </div>

        {/* ---------------- LES CLASSES DE L'ÉCOLE ---------------- */}
        <section className="space-y-3">
          {lignes.map(({ entree, etat }) => (
            <div key={entree.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <select
                  value={entree.niveau}
                  onChange={(e) => majEntree(entree.id, { niveau: e.target.value })}
                  className={`${champ} w-24 shrink-0 font-bold`}
                >
                  {NIVEAUX.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <input
                  value={entree.libelle}
                  onChange={(e) => majEntree(entree.id, { libelle: e.target.value })}
                  placeholder="Nom de la classe"
                  className={`${champ} flex-1 min-w-0`}
                />
                <button
                  onClick={() => supprimerEntree(entree.id)}
                  title="Retirer cette classe"
                  className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => majEntree(entree.id, { source: 'locale' })}
                  className={`py-2 rounded-lg text-[11px] font-bold transition-colors ${
                    entree.source === 'locale' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Classe de cet appareil
                </button>
                <button
                  onClick={() => majEntree(entree.id, { source: 'importee' })}
                  className={`py-2 rounded-lg text-[11px] font-bold transition-colors ${
                    entree.source === 'importee' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Synthèse reçue
                </button>
              </div>

              {entree.source === 'locale' ? (
                <div className="space-y-1.5">
                  <select
                    value={entree.classId ?? ''}
                    onChange={(e) => majEntree(entree.id, { classId: e.target.value })}
                    className={`w-full ${champ}`}
                  >
                    <option value="">Choisir une classe</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom} ({c.niveau})
                      </option>
                    ))}
                  </select>
                  {etat === 'provisoire' && (
                    <p className="text-[11px] text-amber-300">
                      Les données de cette classe sont incomplètes (voir « Ma classe ») : ses chiffres sont provisoires.
                    </p>
                  )}
                  {etat === 'sans-classe' && <p className="text-[11px] text-slate-500">Aucune classe choisie.</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={brouillons[entree.id] ?? ''}
                    onChange={(e) => setBrouillons((b) => ({ ...b, [entree.id]: e.target.value }))}
                    placeholder="Collez ici le code de synthèse reçu (il commence par MNS1.)"
                    className={`w-full ${champ} min-h-[64px] font-mono text-[11px]`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => importerTexte(entree, brouillons[entree.id] ?? '')}
                      disabled={!(brouillons[entree.id] ?? '').trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-[11px] px-3 py-2 rounded-lg transition-colors"
                    >
                      Importer le code
                    </button>
                    <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-[11px] px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      Charger un fichier
                      <input
                        type="file"
                        accept=".txt,text/plain"
                        className="hidden"
                        onChange={(e) => {
                          importerFichier(entree, e.target.files?.[0]);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  <button
                    onClick={() => setBrouillons((b) => ({ ...b, [entree.id]: codeExemple(entree) }))}
                    className="text-[11px] font-bold text-indigo-300 underline hover:text-indigo-200"
                  >
                    Remplir avec un code d'exemple (chiffres fictifs)
                  </button>
                  {etat === 'ok' && !messages[entree.id] && (
                    <p
                      className={`text-[11px] ${
                        estExemple(store.syntheses[entree.id]?.[etape]) ? 'text-amber-300' : 'text-emerald-300'
                      }`}
                    >
                      {estExemple(store.syntheses[entree.id]?.[etape])
                        ? "Chiffres fictifs d'exemple : à remplacer par une vraie synthèse avant tout rapport."
                        : `Synthèse présente pour l'étape ${etape}.`}
                    </p>
                  )}
                  {etat === 'vide' && !messages[entree.id] && (
                    <p className="text-[11px] text-slate-500">Aucune synthèse pour l'étape {etape}.</p>
                  )}
                </div>
              )}

              {messages[entree.id] && (
                <p className={`text-[11px] ${messages[entree.id].ok ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {messages[entree.id].texte}
                </p>
              )}
            </div>
          ))}

          <div className="flex items-center gap-2">
            <select value={niveauAjout} onChange={(e) => setNiveauAjout(e.target.value)} className={`${champ} w-24 font-bold`}>
              {NIVEAUX.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              onClick={ajouterEntree}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter une classe
            </button>
          </div>
        </section>

        {/* ---------------- TOTAUX ---------------- */}
        <section className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
          <h2 className="font-bold text-white text-sm">Résultats de l'école{provisoire ? ' (provisoires)' : ''} — étape {etape}</h2>

          {!consolidation.ecole ? (
            <p className="text-xs text-slate-400">Aucune classe n'a encore de chiffres pour cette étape.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase font-bold">
                  <tr>
                    <th className="px-2 py-2 text-left rounded-l-lg">Niveau</th>
                    <th className="px-2 py-2 text-center" colSpan={3}>Inscrits</th>
                    <th className="px-2 py-2 text-center" colSpan={3}>Ont composé</th>
                    <th className="px-2 py-2 text-center" colSpan={3}>Ont la moyenne</th>
                    <th className="px-2 py-2 text-center rounded-r-lg" colSpan={3}>%</th>
                  </tr>
                  <tr className="text-[9px]">
                    <th />
                    {[0, 1, 2, 3].flatMap((k) => ['G', 'F', 'T'].map((s) => <th key={`${k}${s}`} className="px-1 pb-1.5 text-center">{s}</th>))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {[...consolidation.parNiveau.map((n) => ({ nom: n.niveau, r: n.resultat })), { nom: 'Ensemble', r: consolidation.ecole }].map(
                    ({ nom, r }) => (
                      <tr key={nom} className={nom === 'Ensemble' ? 'font-bold text-white' : ''}>
                        <td className="px-2 py-1.5 font-semibold text-white">{nom}</td>
                        {r ? (
                          <>
                            {(['inscrits', 'composes', 'recus'] as const).flatMap((cle) =>
                              (['G', 'F', 'T'] as const).map((s) => (
                                <td key={`${cle}${s}`} className="px-1 py-1.5 text-center">{r[cle][s]}</td>
                              ))
                            )}
                            {(['G', 'F', 'T'] as const).map((s) => (
                              <td key={`p${s}`} className="px-1 py-1.5 text-center text-indigo-300">{fmtPct(r.pourcentage[s])}</td>
                            ))}
                          </>
                        ) : (
                          <td colSpan={12} className="px-2 py-1.5 text-center text-slate-600">
                            pas de données
                          </td>
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {sansDonnees.length > 0 && consolidation.ecole && (
            <p className="text-[11px] text-amber-300">
              Niveaux sans chiffres pour cette étape : {sansDonnees.join(', ')}. Le total « Ensemble » ne les compte pas.
            </p>
          )}
        </section>

        {/* ---------------- FICHES DE L'ÉCOLE ---------------- */}
        <section className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-white text-sm">Fiches de l'école</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">À imprimer, signer et transmettre à la circonscription.</p>
            </div>
            <TelechargerMenu
              disabled={bloqueFiche}
              enCours={enCours}
              partagePossible={partagePossible}
              note={aExemple ? "Chiffres d'exemple : la fiche sera marquée « EXEMPLE »" : undefined}
              onExport={lancerExport}
            />
          </div>

          {bloqueFiche && (
            <p className="text-[11px] text-amber-300">
              {!consolidation.ecole
                ? "Aucune classe n'a encore de chiffres pour cette étape."
                : `Le téléchargement sera possible quand chaque classe de la liste aura ses chiffres complets. À compléter ou à retirer : ${lignesIncompletes
                    .map((l) => l.entree.libelle || l.entree.niveau)
                    .join(', ')}.`}
            </p>
          )}
          {erreurExport && <p className="text-[11px] text-rose-300">{erreurExport}</p>}

          <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFiche('niveaux')}
              className={`py-2 rounded-lg text-[11px] font-bold transition-colors ${
                fiche === 'niveaux' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Synthèse par niveau et champs de formation
            </button>
            <button
              onClick={() => setFiche('ecole')}
              className={`py-2 rounded-lg text-[11px] font-bold transition-colors ${
                fiche === 'ecole' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Synthèse niveau école
            </button>
          </div>

          {/* En-tête commun aux fiches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                ['ecole', 'École', 'Ex : EPP Tchankada'],
                ['circonscription', 'Circonscription scolaire', 'Ex : Toviklin'],
                ['direction', 'Direction départementale', 'Ex : COUFFO'],
                ['region', 'Région pédagogique n°', 'Ex : 11'],
                ['bp', 'BP / adresse', 'Ex : 48 Dogbo'],
                ['annee', 'Année scolaire', ''],
                ['lieu', 'Fait à', ''],
                ['date', 'Le', 'Vide = date du jour'],
                ['directeur', 'Nom du directeur (facultatif)', '']
              ] as [string, string, string][]
            ).map(([cle, libelle, exemple]) => (
              <div key={cle}>
                <label className={etiquette}>{libelle}</label>
                <input
                  className={`w-full ${champ}`}
                  value={meta[cle] ?? ''}
                  placeholder={exemple}
                  onChange={(e) => setMeta({ [cle]: e.target.value })}
                />
              </div>
            ))}
          </div>

          {layoutFiche && (
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
                Le cachet et la signature sont à apposer sur la version imprimée. Aucun logo n'est ajouté.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}