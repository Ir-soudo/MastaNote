import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react';
import { ETAPES } from './config.js';
import { NIVEAUX, consoliderEcole } from './ecole.js';
import { creerSynthese, depuisCode, versCode, versResultat } from './synthese.js';
import { resultatExemple } from './exemple.js';

// ==========================================================
// ÉCRAN « TOUTE L'ÉCOLE »
// Le directeur indique, pour chaque classe de son école (une par niveau par défaut, modifiable : classes
// ajoutées, retirées, renommées), d'où viennent ses chiffres : une classe de CET appareil, ou une synthèse
// reçue d'un collègue (code collé ou fichier). L'écran additionne le tout, niveau par niveau puis pour l'école.
// Stockage séparé : mastanote-reports-ecole-v1. Rien n'est modifié ailleurs dans l'application.
// ==========================================================

const KEY = 'mastanote-reports-ecole-v1';

type Entree = { id: string; niveau: string; libelle: string; source: 'locale' | 'importee'; classId?: string };
type Store = { entrees: Entree[]; syntheses: Record<string, Record<string, any>> }; // entrée -> étape -> synthèse

const identifiant = () => `e_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

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
  calculerPourClasse,
  onBack,
  onClose
}: {
  classes: any[];
  etape: number;
  setEtape: (n: number) => void;
  calculerPourClasse: (c: any) => { verification: { ok: boolean }; resultat: any };
  onBack: () => void;
  onClose: () => void;
}) {
  const [store, setStore] = useState<Store>(() => chargerStore(classes));
  const [brouillons, setBrouillons] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, { ok: boolean; texte: string }>>({});
  const [niveauAjout, setNiveauAjout] = useState<string>(NIVEAUX[0]);

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

  // Code d'exemple (chiffres fictifs) pour essayer l'import sans attendre une vraie synthèse
  const codeExemple = (entree: Entree) => {
    const decalage = Math.max(0, NIVEAUX.indexOf(entree.niveau));
    return versCode(
      creerSynthese({
        resultat: resultatExemple(decalage),
        classe: { nom: `EXEMPLE ${entree.niveau} (chiffres fictifs)`, niveau: entree.niveau },
        etape,
        annee: ''
      })
    );
  };

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
      const estExemple = String(s.c).startsWith('EXEMPLE');
      if (estExemple) avis.push('Chiffres fictifs : à remplacer par une vraie synthèse avant tout rapport.');
      dire(entree.id, s.n === entree.niveau && s.e === etape && !estExemple, avis.join(' '));
      setBrouillons((b) => ({ ...b, [entree.id]: '' }));
    } catch (err: any) {
      dire(entree.id, false, err?.message || "Import impossible.");
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
  const provisoire = lignes.some((l) => l.etat === 'provisoire');
  const sansDonnees = consolidation.parNiveau.filter((n) => !n.resultat).map((n) => n.niveau);

  const champ =
    'bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500';

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
                        String(store.syntheses[entree.id]?.[etape]?.c ?? '').startsWith('EXEMPLE') ? 'text-amber-300' : 'text-emerald-300'
                      }`}
                    >
                      {String(store.syntheses[entree.id]?.[etape]?.c ?? '').startsWith('EXEMPLE')
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
          <p className="text-[10px] text-slate-500">
            Les fiches d'école à télécharger (synthèse par niveau, champs de formation) arrivent au prochain lot : elles reprendront ces totaux.
          </p>
        </section>
      </main>
    </div>
  );
}