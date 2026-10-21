import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle, FileSpreadsheet, Layers, Sparkles, Wand2 } from 'lucide-react';

// ==========================================================
// Maquette animée d'un téléphone : scan du registre -> notes rattachées -> export EducMaster.
// Entièrement construite en code (aucune image à charger). Les noms et notes sont fictifs.
// Les valeurs affichées suivent la règle de l'application (perfectionnement seulement à partir de 10/20).
// ==========================================================

const SCENE_DURATION_MS = 4800;

const CAPTIONS = [
  'Photographiez le registre',
  'Chaque note retrouve son élève',
  'Exportez vers EducMaster'
];

// Animations : désactivées automatiquement si l'utilisateur a demandé moins de mouvement.
const MOCKUP_CSS = `
@keyframes mn-scan { 0% { top: 4%; opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { top: 84%; opacity: 0; } }
@keyframes mn-rowin { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes mn-pop { 0% { opacity: 0; transform: scale(.6); } 70% { transform: scale(1.06); } 100% { opacity: 1; transform: scale(1); } }
@keyframes mn-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes mn-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .mn-anim { animation: none !important; } }
`;

// --- Données fictives ---
const REGISTRE_HEADER = ['N°', 'Dictée', 'Math', 'EPS'];
const REGISTRE_ROWS = [
  ['1', '15', '14', '12'],
  ['2', '8', '10', '11'],
  ['3', '18', '16', '15'],
  ['4', '10', '9', '13'],
  ['5', '12', '17', '14'],
  ['6', '7', '11', '9'],
  ['7', '16', '13', '18']
];

const NOTES_ROWS = [
  { n: 1, name: 'ABALO Sena', total: '15', note: '13,5', perf: '1,5', ok: true, tag: 'ventilée' },
  { n: 2, name: "BIO N'gobi", total: '8', note: '8', perf: '0', ok: false, tag: 'sous 10 : sans perf.' },
  { n: 3, name: 'GNONLONFOUN Afiwa', total: '18', note: '16,25', perf: '1,75', ok: true, tag: 'ventilée' },
  { n: 4, name: 'SESSOU Koffi', total: '10', note: '10', perf: '0', ok: true, tag: '' }
];

const EXPORT_CHECKS = [
  "Matières dans l'ordre EducMaster",
  'Note obtenue + perfectionnement',
  'Matricules conservés'
];

// ==========================================================
// COMPOSANT PRINCIPAL
// ==========================================================
export default function PhoneMockup() {
  const [scene, setScene] = useState(0);

  // Passe automatiquement à la scène suivante (le minuteur repart aussi quand on choisit une scène à la main)
  useEffect(() => {
    const t = setTimeout(() => setScene((s) => (s + 1) % CAPTIONS.length), SCENE_DURATION_MS);
    return () => clearTimeout(t);
  }, [scene]);

  return (
    <div className="flex flex-col items-center gap-5">
      <style>{MOCKUP_CSS}</style>

      <div className="relative">
        {/* Halo lumineux derrière le téléphone */}
        <div
          className="absolute -inset-8 rounded-full bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-amber-500/20 blur-3xl"
          aria-hidden="true"
        />

        <div
          role="img"
          aria-label="Aperçu de l'application : on photographie le registre, les notes sont rangées automatiquement par élève, puis exportées vers EducMaster."
          className="mn-anim relative w-[236px] sm:w-[260px] rounded-[2.4rem] border border-slate-700 bg-slate-950 p-2 shadow-2xl shadow-indigo-900/40"
          style={{ animation: 'mn-float 6s ease-in-out infinite' }}
        >
          {/* Encoche */}
          <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-950 rounded-full z-10" />

          <div className="relative rounded-[1.9rem] overflow-hidden bg-slate-900 h-[430px] sm:h-[470px]">
            <div key={scene} className="mn-anim h-full" style={{ animation: 'mn-fade .5s ease both' }}>
              {scene === 0 && <SceneScan />}
              {scene === 1 && <SceneNotes />}
              {scene === 2 && <SceneExport />}
            </div>
          </div>
        </div>
      </div>

      {/* Légende + points de navigation */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-semibold text-white min-h-[1.25rem]">
          {scene + 1}. {CAPTIONS[scene]}
        </p>
        <div className="flex gap-2">
          {CAPTIONS.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => setScene(i)}
              aria-label={`Étape ${i + 1} : ${c}`}
              className={`h-1.5 rounded-full transition-all ${
                i === scene ? 'w-6 bg-indigo-400' : 'w-1.5 bg-slate-600 hover:bg-slate-500'
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-slate-500">Aperçu illustratif — données fictives</p>
      </div>
    </div>
  );
}

// ==========================================================
// BARRE DE TITRE D'ÉCRAN
// ==========================================================
function ScreenBar({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 px-3 pt-8 pb-2 text-[11px] font-bold text-white">
      {icon}
      {title}
    </div>
  );
}

// ==========================================================
// SCÈNE 1 : le registre est photographié, l'IA le lit
// ==========================================================
function SceneScan() {
  return (
    <div className="h-full flex flex-col pb-4">
      <ScreenBar title="Scanner IA" icon={<Camera className="w-3.5 h-3.5 text-indigo-400" />} />

      <div className="px-3 grid grid-cols-2 gap-1 text-[9px] font-bold">
        <span className="text-center py-1 rounded-md bg-slate-800 text-slate-500">Une matière</span>
        <span className="text-center py-1 rounded-md bg-indigo-600 text-white">Toutes les matières</span>
      </div>

      <div className="relative flex-1 min-h-0 mx-3 mt-3 rounded-lg overflow-hidden bg-amber-50 shadow-inner">
        <div className="p-2" style={{ transform: 'rotate(-1.2deg)' }}>
          <div className="grid grid-cols-4 text-center text-[8px] font-bold uppercase text-slate-500 border-b-2 border-amber-300 pb-1">
            {REGISTRE_HEADER.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>
          {REGISTRE_ROWS.map((row) => (
            <div
              key={row[0]}
              className="grid grid-cols-4 text-center border-b border-amber-200 py-[7px] font-serif italic text-[12px] text-blue-900"
            >
              {row.map((cell, i) => (
                <span key={i} className={i === 0 ? 'not-italic font-bold text-slate-500 text-[10px]' : ''}>
                  {cell}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Repères de cadrage de l'appareil photo */}
        <span className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-indigo-500 rounded-tl" />
        <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-indigo-500 rounded-tr" />
        <span className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-indigo-500 rounded-bl" />
        <span className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-indigo-500 rounded-br" />

        {/* Faisceau de lecture */}
        <div
          className="mn-anim absolute inset-x-0 h-10 pointer-events-none"
          style={{
            top: '4%',
            background: 'linear-gradient(to bottom, transparent, rgba(99,102,241,.5), transparent)',
            animation: 'mn-scan 2.4s ease-in-out infinite'
          }}
        />
      </div>

      <div className="mx-3 mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-slate-950 border border-slate-800 py-2 text-[9px] text-slate-300">
        <span className="w-2.5 h-2.5 border-2 border-indigo-400/40 border-t-indigo-400 rounded-full animate-spin" />
        <Sparkles className="w-3 h-3 text-indigo-400" />
        3 images · lecture en cours
      </div>
    </div>
  );
}

// ==========================================================
// SCÈNE 2 : chaque note est rattachée à son élève et ventilée
// ==========================================================
function SceneNotes() {
  return (
    <div className="h-full flex flex-col pb-4">
      <ScreenBar title="Vérification" icon={<Layers className="w-3.5 h-3.5 text-indigo-400" />} />

      <div className="px-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[9px] font-bold text-indigo-300">
          <Sparkles className="w-2.5 h-2.5" />
          9 matières détectées
        </span>
      </div>

      <div className="px-3 mt-3 space-y-2">
        {NOTES_ROWS.map((r, i) => (
          <div
            key={r.n}
            className="mn-anim rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5"
            style={{ animation: `mn-rowin .5s ease ${i * 0.35}s both` }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-white truncate">
                <span className="text-slate-500 mr-1">{r.n}</span>
                {r.name}
              </span>
              <span className={`text-[11px] font-black ${r.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                {r.total}
              </span>
            </div>
            <div className="mt-0.5 text-[9px] text-slate-400">
              Note <b className="text-slate-200">{r.note}</b> · Perf <b className="text-indigo-300">{r.perf}</b>
              {r.tag && (
                <span className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-amber-500/10 px-1 text-[8px] font-semibold text-amber-300">
                  {r.tag === 'ventilée' && <Wand2 className="w-2 h-2" />}
                  {r.tag}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-auto px-3 text-center text-[9px] text-slate-500">
        Vérifiez, corrigez si besoin, puis enregistrez.
      </p>
    </div>
  );
}

// ==========================================================
// SCÈNE 3 : le fichier est prêt pour EducMaster
// ==========================================================
function SceneExport() {
  return (
    <div className="h-full flex flex-col pb-4">
      <ScreenBar title="Export" icon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />} />

      <div className="mx-3 rounded-xl bg-slate-950 border border-slate-800 p-3 flex items-center gap-2.5">
        <div className="bg-emerald-500/15 border border-emerald-500/30 p-2 rounded-lg shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-white truncate">notes_sommative1_cm2.xlsx</p>
          <p className="text-[9px] text-slate-500">Modèle EducMaster · 9 matières</p>
        </div>
      </div>

      <ul className="mx-3 mt-4 space-y-2">
        {EXPORT_CHECKS.map((c, i) => (
          <li
            key={c}
            className="mn-anim flex items-center gap-2 text-[10px] text-slate-300"
            style={{ animation: `mn-rowin .5s ease ${i * 0.3}s both` }}
          >
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            {c}
          </li>
        ))}
      </ul>

      <div className="mt-auto mx-3 space-y-2">
        <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-center text-[10px] font-black text-slate-950 shadow-lg shadow-emerald-500/20">
          Exporter EducMaster (.xlsx)
        </div>
        <div
          className="mn-anim flex items-center justify-center gap-1.5 text-[10px] font-bold text-emerald-300"
          style={{ animation: 'mn-pop .6s ease 1.1s both' }}
        >
          <CheckCircle className="w-4 h-4" />
          Prêt à importer
        </div>
      </div>
    </div>
  );
}