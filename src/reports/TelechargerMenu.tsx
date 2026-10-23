import React, { useState } from 'react';
import { ChevronDown, Download, Share2 } from 'lucide-react';

// Un seul bouton : un clic ouvre la liste des formats disponibles (PDF, image, Excel, partage).
export type FormatExport = 'pdf' | 'png' | 'xlsx' | 'partager';

export default function TelechargerMenu({
  disabled,
  enCours,
  partagePossible,
  note,
  onExport
}: {
  disabled: boolean;
  enCours: boolean;
  partagePossible: boolean;
  note?: string;
  onExport: (format: FormatExport) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const choisir = (format: FormatExport) => {
    setOuvert(false);
    onExport(format);
  };
  const ligne = 'w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-900 transition-colors';

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOuvert((o) => !o)}
        disabled={disabled || enCours}
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

      {ouvert && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOuvert(false)} />
          <div className="absolute right-0 mt-2 w-64 z-30 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl p-1.5">
            {note && <p className="px-3 py-1.5 text-[10px] font-bold text-amber-300">{note}</p>}
            <button onClick={() => choisir('pdf')} className={ligne}>
              <span className="block text-xs font-bold text-white">PDF</span>
              <span className="block text-[10px] text-slate-400">Prêt à imprimer et à signer</span>
            </button>
            <button onClick={() => choisir('png')} className={ligne}>
              <span className="block text-xs font-bold text-white">Image (PNG)</span>
              <span className="block text-[10px] text-slate-400">Pour WhatsApp ou une impression rapide</span>
            </button>
            <button onClick={() => choisir('xlsx')} className={ligne}>
              <span className="block text-xs font-bold text-white">Excel (.xlsx)</span>
              <span className="block text-[10px] text-slate-400">Pour remonter les chiffres au RUP</span>
            </button>
            {partagePossible && (
              <button onClick={() => choisir('partager')} className={`${ligne} flex items-center gap-2`}>
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
  );
}