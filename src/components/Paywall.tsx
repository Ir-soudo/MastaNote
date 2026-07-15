// src/components/Paywall.tsx
import React, { useState } from 'react';
import { LicenceService, CHARIOW_CONFIG } from '../services/licenceService';

interface PaywallProps {
    onActivationSuccess: () => void;
}

export const Paywall: React.FC<PaywallProps> = ({ onActivationSuccess }) => {
    const [key, setKey] = useState('');
    const [status, setStatus] = useState({ message: '', isError: false, isLoading: false });

    const handleActivate = async () => {
        if (!key.trim()) {
            setStatus({ message: "Veuillez saisir une clé de licence.", isError: true, isLoading: false });
            return;
        }

        setStatus({ message: "Validation en cours...", isError: false, isLoading: true });
        const result = await LicenceService.validateKeyWithChariow(key.trim());

        if (result.success) {
            setStatus({ message: result.message, isError: false, isLoading: false });
            setTimeout(() => {
                onActivationSuccess();
            }, 1500);
        } else {
            setStatus({ message: result.message, isError: true, isLoading: false });
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-50 z-[99999] overflow-y-auto font-sans flex items-center justify-center p-4">
            <div className="max-w-6xl w-full my-8 text-center">
                
                <h1 className="text-4xl font-extrabold text-blue-900 mb-2">Rejoignez MastaNote AI+</h1>
                <p className="text-gray-600 text-lg mb-12">Sélectionnez votre formule pour débloquer votre assistant de gestion de notes.</p>

                {/* Les 3 Cartes */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 items-stretch">
                    
                    {/* Formule 1 An */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-700">Formule Découverte</h3>
                            <div className="text-3xl font-extrabold text-gray-900 my-4">1 500 FCFA <span className="text-sm font-normal text-gray-500">/ 1 an</span></div>
                            <p className="text-gray-500 text-sm mb-6">Idéal pour tester l'outil sur une année scolaire.</p>
                            <ul className="text-left space-y-3 text-gray-600 mb-8">
                                <li className="flex items-center">✓ Export illimité EducMaster CSV</li>
                                <li className="flex items-center">✓ Support standard par e-mail</li>
                                <li className="flex items-center text-red-500">✗ Ressources pédagogiques exclues</li>
                            </ul>
                        </div>
                        <a href={CHARIOW_CONFIG.LINKS.ONE_YEAR} target="_blank" rel="noreferrer" className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition duration-200">S'abonner (1 An)</a>
                    </div>

                    {/* Formule 3 Ans */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-700">Formule Sérénité</h3>
                            <div className="text-3xl font-extrabold text-gray-900 my-4">3 000 FCFA <span className="text-sm font-normal text-gray-500">/ 3 ans</span></div>
                            <p className="text-gray-500 text-sm mb-6">Équivaut à 1 an offert ! Vos outils de notes sécurisés sur le moyen terme.</p>
                            <ul className="text-left space-y-3 text-gray-600 mb-8">
                                <li className="flex items-center">✓ Export illimité EducMaster CSV</li>
                                <li className="flex items-center">✓ Support prioritaire</li>
                                <li className="flex items-center">✓ Mises à jour incluses</li>
                                <li className="flex items-center text-red-500">✗ Ressources pédagogiques exclues</li>
                            </ul>
                        </div>
                        <a href={CHARIOW_CONFIG.LINKS.THREE_YEARS} target="_blank" rel="noreferrer" className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition duration-200">S'abonner (3 Ans)</a>
                    </div>

                    {/* Formule 5 Ans Premium */}
                    <div className="bg-white border-2 border-amber-600 rounded-2xl p-8 shadow-md relative flex flex-col justify-between transform md:scale-105">
                        <span className="absolute -top-3.5 right-6 bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Recommandé</span>
                        <div>
                            <h3 className="text-xl font-bold text-amber-800">VIP Premium</h3>
                            <div className="text-3xl font-extrabold text-gray-900 my-4">5 000 FCFA <span className="text-sm font-normal text-gray-500">/ 5 ans</span></div>
                            <p className="text-gray-500 text-sm mb-6">Seulement 1 000 FCFA par an ! Le pack complet d'excellence.</p>
                            <ul className="text-left space-y-3 text-gray-600 mb-8">
                                <li className="flex items-center">✓ Export illimité EducMaster CSV</li>
                                <li className="flex items-center font-semibold text-amber-700">★ Bibliothèque de fiches pédagogiques</li>
                                <li className="flex items-center">✓ Support VIP WhatsApp direct</li>
                                <li className="flex items-center">✓ Mises à jour majeures à vie</li>
                            </ul>
                        </div>
                        <a href={CHARIOW_CONFIG.LINKS.FIVE_YEARS} target="_blank" rel="noreferrer" className="block text-center bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl transition duration-200">S'abonner (5 Ans)</a>
                    </div>

                </div>

                {/* Saisie de clé */}
                <div className="max-w-md mx-auto bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="text-lg font-bold text-blue-900 mb-2">Vous avez déjà votre clé ?</h4>
                    <p className="text-gray-500 text-xs mb-4">Saisissez-la ci-dessous pour activer votre application.</p>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Ex: XXXX-XXXX-XXXX-XXXX" 
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button 
                            onClick={handleActivate}
                            disabled={status.isLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-xl transition duration-200 disabled:opacity-50"
                        >
                            {status.isLoading ? '...' : 'Activer'}
                        </button>
                    </div>
                    {status.message && (
                        <p className={`mt-3 text-sm font-medium ${status.isError ? 'text-red-500' : 'text-emerald-500'}`}>
                            {status.message}
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
};