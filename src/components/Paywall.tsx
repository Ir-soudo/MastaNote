// src/components/Paywall.tsx
import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, ShieldCheck, Key, ArrowRight, ExternalLink } from 'lucide-react';
import { LicenceService } from '../services/LicenceService';

interface PaywallProps {
  onActivate: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onActivate }) => {
  const [licenceKey, setLicenceKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!licenceKey.trim()) {
      setError('Veuillez saisir une clé de licence.');
      setLoading(false);
      return;
    }

    try {
      // Validation de la clé de licence
      if (licenceKey.startsWith('MN-')) {
        // Identification de la formule à partir du motif de la clé
        let productId = 'prd_z2kjla30'; // Par défaut : 1 An
        if (licenceKey.includes('-VIP-') || licenceKey.includes('-5ANS-')) {
          productId = 'prd_s877x4vl'; // VIP Premium 5 Ans
        } else if (licenceKey.includes('-SER-') || licenceKey.includes('-3ANS-')) {
          productId = 'prd_6duiuhl1'; // Sérénité 3 Ans
        }

        const expiryDate = new Date();
        if (productId === 'prd_s877x4vl') {
          expiryDate.setFullYear(expiryDate.getFullYear() + 5);
        } else if (productId === 'prd_6duiuhl1') {
          expiryDate.setFullYear(expiryDate.getFullYear() + 3);
        } else {
          expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        }

        LicenceService.saveLicence({
          key: licenceKey,
          productId: productId,
          expiryDate: expiryDate.toISOString(),
          active: true
        });

        setSuccess(true);
        setTimeout(() => {
          onActivate();
        }, 1500);
      } else {
        setError('Clé de licence invalide. Vérifiez le format (ex: MN-XXXX-XXXX).');
      }
    } catch (err) {
      setError("Erreur lors de la validation. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* En-tête / Branding */}
        <div className="text-center mb-12">
          <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/20">
            MastaNote AI+
          </span>
          <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl tracking-tight">
            Activez votre accès professionnel
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Gagnez un temps précieux au quotidien. Exportez vos fiches sur EducMaster en un clic et accédez à vos fiches pédagogiques.
          </p>
        </div>

        {/* Formulaire d'activation de clé */}
        <div className="max-w-md mx-auto mb-16 bg-slate-800/50 border border-slate-700/50 p-6 rounded-2xl backdrop-blur-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Key className="text-amber-400 w-5 h-5" /> Déjà acheté ? Activez ici
          </h2>
          <form onSubmit={handleActivation} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Saisissez votre clé de licence (ex: MN-XXXX-XXXX)"
                value={licenceKey}
                onChange={(e) => setLicenceKey(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                disabled={loading || success}
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-green-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 shrink-0" /> Licence activée avec succès ! Redirection...
              </p>
            )}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-700 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              {loading ? 'Vérification...' : 'Activer MastaNote AI+'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Grille des Tarifs Native */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          
          {/* Formule Découverte - 1 An */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-3xl p-8 flex flex-col justify-between hover:border-slate-600 transition-all">
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">🌟 Formule Découverte</h3>
                  <p className="text-xs text-slate-400 mt-1">Pour tester sur une année scolaire</p>
                </div>
                <span className="px-2.5 py-1 bg-slate-700/50 text-slate-300 text-xs font-semibold rounded-lg">
                  1 An
                </span>
              </div>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">1 500</span>
                <span className="text-lg font-semibold text-slate-400 ml-1">FCFA</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Export illimité des fichiers <strong>EducMaster CSV</strong></span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Accès complet au dashboard de base</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Support technique standard (E-mail)</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-500 line-through">
                  <AlertTriangle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                  <span>Fiches pédagogiques non incluses</span>
                </li>
              </ul>
            </div>
            <a
              href="https://soudoboutik-ebook.mychariow.shop/prd_z2kjla30/checkout"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl text-center flex items-center justify-center gap-2 transition-all"
            >
              S'abonner (Mobile Money) <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Formule Sérénité - 3 Ans */}
          <div className="bg-slate-800/50 border-2 border-amber-500/30 rounded-3xl p-8 flex flex-col justify-between hover:border-amber-500/50 transition-all relative">
            <span className="absolute -top-3 right-6 px-3 py-1 bg-amber-500 text-slate-950 text-xs font-bold rounded-full uppercase tracking-wider">
              1 An Offert !
            </span>
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">🚀 Formule Sérénité</h3>
                  <p className="text-xs text-slate-400 mt-1">Tranquillité à moyen terme</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-lg">
                  3 Ans
                </span>
              </div>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">3 000</span>
                <span className="text-lg font-semibold text-slate-400 ml-1">FCFA</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Export illimité des fichiers <strong>EducMaster CSV</strong></span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Accès complet au dashboard</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Toutes les futures mises à jour</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span>Support technique prioritaire</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-500 line-through">
                  <AlertTriangle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                  <span>Fiches pédagogiques non incluses</span>
                </li>
              </ul>
            </div>
            <a
              href="https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1/checkout"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-center flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/10"
            >
              S'abonner (Mobile Money) <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Formule VIP Premium - 5 Ans */}
          <div className="bg-slate-950 border border-purple-500/40 rounded-3xl p-8 flex flex-col justify-between hover:border-purple-500/80 transition-all relative">
            <span className="absolute -top-3 right-6 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase tracking-wider">
              Le plus Populaire !
            </span>
            <div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-purple-300">🏆 VIP Premium</h3>
                  <p className="text-xs text-slate-400 mt-1">L'offre ultime sans compromis</p>
                </div>
                <span className="px-2.5 py-1 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded-lg">
                  5 Ans
                </span>
              </div>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">5 000</span>
                <span className="text-lg font-semibold text-slate-400 ml-1">FCFA</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span>Export illimité des fichiers <strong>EducMaster CSV</strong></span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Accès VIP exclusif</strong> à l'espace de téléchargement des fiches pédagogiques</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span>Support ultra-prioritaire direct (WhatsApp)</span>
                </li>
                <li className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span>Mises à jour majeures à vie</span>
                </li>
              </ul>
            </div>
            <a
              href="https://soudoboutik-ebook.mychariow.shop/prd_s877x4vl/checkout"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-500/20"
            >
              S'abonner (Mobile Money) <ExternalLink className="w-4 h-4" />
            </a>
          </div>

        </div>
      </div>

      {/* Pied de page de réassurance */}
      <div className="text-center text-xs text-slate-500 mt-12 flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Paiements sécurisés via Mobile Money par Chariow. Clé d'activation envoyée instantanément par e-mail.
      </div>
    </div>
  );
};