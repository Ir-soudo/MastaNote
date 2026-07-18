import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  Users,
  Plus,
  Download,
  Mic,
  MicOff,
  CheckCircle,
  CreditCard,
  TrendingUp,
  Award,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Settings,
  Lock,
  Check,
  Camera,
  Sparkles,
  Image as ImageIcon,
  RotateCcw,
  Upload,
  Library
} from 'lucide-react';

// --- CONFIGURATION ET COMPOSANTS PRINCIPAUX ---

const MATIERES_PRIMAIRE = [
  { id: 'dictee', label: 'Dictée', short: 'Dictée' },
  { id: 'maths', label: 'Mathématiques', short: 'Math' },
  { id: 'expression_ecrite', label: 'Expression écrite', short: 'Exp. Écrite' },
  { id: 'comprehension', label: "Compréhension de l'écrit", short: 'Compréh.' },
  { id: 'est', label: 'EST (Edu. Scien. & Tech.)', short: 'EST' },
  { id: 'es', label: 'ES (Edu. Sociale)', short: 'ES' },
  { id: 'ea_oral', label: 'EA (Oral)', short: 'EA Oral' },
  { id: 'ea_dessin', label: 'EA (Dessin/Couture)', short: 'EA Dessin' },
  { id: 'eps', label: 'EPS (Edu. Phys. & Sportive)', short: 'EPS' }
];

const CLASSES_PRIMAIRE = ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];

// --- FORMULES D'ABONNEMENT (Chariow) ---
const ABONNEMENT_PLANS = [
  {
    id: '1an',
    label: '1 An',
    tagline: 'Formule Découverte',
    duree_mois: 12,
    prix: 1500,
    chariowProductId: 'prd_z2kjla30',
    chariowCheckoutUrl: 'https://soudoboutik-ebook.mychariow.shop/prd_z2kjla30/checkout',
    premiumFiches: false,
    avantages: ['Export illimité EducMaster CSV', 'Saisie Vocale et Scanner IA illimités', 'Support technique par e-mail']
  },
  {
    id: '3ans',
    label: '3 Ans',
    tagline: 'Formule Sérénité',
    duree_mois: 36,
    prix: 3000,
    chariowProductId: 'prd_6duiuhl1',
    chariowCheckoutUrl: 'https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1/checkout',
    premiumFiches: false,
    avantages: ['Tout de la formule 1 An', 'Support technique prioritaire', 'Mises à jour applicatives incluses']
  },
  {
    id: '5ans',
    label: '5 Ans VIP',
    tagline: 'VIP Premium',
    duree_mois: 60,
    prix: 5000,
    chariowProductId: 'prd_s877x4vl',
    chariowCheckoutUrl: 'https://soudoboutik-ebook.mychariow.shop/prd_s877x4vl/checkout',
    premiumFiches: true,
    avantages: ['Tout de la formule 3 Ans', 'Bibliothèque de fiches pédagogiques', 'Support ultra-prioritaire']
  }
];

// Récupération dynamique de l'URL Backend (Production ou Local)
const BACKEND_BASE_URL = import.meta.env.VITE_API_URL || 'https://mastanote-backend.onrender.com';
const SCAN_API_URL = `${BACKEND_BASE_URL}/api/scan`;
const LICENSE_API_URL = `${BACKEND_BASE_URL}/api/validate-license`;

// URL corrigée pour le stockage des fiches pédagogiques (Plus de domaine fictif !)
const FICHES_PEDAGOGIQUES_URL = 'https://mastanote-backend.onrender.com/ressources/fiches';

const ELEVES_INITIAL_CM2 = [
  { id: '1', matricule: '24-CM2-001', nom: 'ABALO', prenoms: 'Sena Jean' },
  { id: '2', matricule: '24-CM2-002', nom: 'BIO', prenoms: 'N\'gobi Chabi' },
  { id: '3', matricule: '24-CM2-003', nom: 'GNONLONFOUN', prenoms: 'Afiwa Marie' },
  { id: '4', matricule: '24-CM2-004', nom: 'SESSOU', prenoms: 'Koffi Albert' },
  { id: '5', matricule: '24-CM2-005', nom: 'TOSSOU', prenoms: 'Yélian Reine' },
  { id: '6', matricule: '24-CM2-006', nom: 'KODJOH', prenoms: 'Merveille' },
  { id: '7', matricule: '24-CM2-007', nom: 'IDOHOU', prenoms: 'Babajide Paul' },
  { id: '8', matricule: '24-CM2-008', nom: 'ADANZAN', prenoms: 'Sèmèvo Pierre' }
];

export default function App() {
  const [user, setUser] = useState({
    nom: 'Enseignant Bénin',
    tel: '0197000000',
    statut_abonnement: 'demo',
    planId: null,
    plan: null,
    expireLe: null
  });

  const [classes, setClasses] = useState([
    { id: 'class-1', nom: 'CM2 Émeraude', niveau: 'CM2', eleves: ELEVES_INITIAL_CM2 }
  ]);
  const [selectedClassId, setSelectedClassId] = useState('class-1');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMatiere, setActiveMatiere] = useState('maths');

  const [notes, setNotes] = useState({
    'class-1': {
      'maths': {
        '1': { note: 14, perf: 15 },
        '2': { note: 8.5, perf: 10 },
        '3': { note: 16, perf: 16 },
        '4': { note: 10, perf: 12 },
        '5': { note: 18, perf: 18 }
      },
      'dictee': {
        '1': { note: 12, perf: 14 },
        '2': { note: 9, perf: 11 },
        '3': { note: 15, perf: 15 }
      }
    }
  });

  const [currentSaisieIndex, setCurrentSaisieIndex] = useState(0);
  const [tempNote, setTempNote] = useState('');
  const [tempPerf, setTempPerf] = useState('');

  const [newClassName, setNewClassName] = useState('');
  const [newClassNiveau, setNewClassNiveau] = useState('CM2');
  const [showAddClassModal, setShowAddClassModal] = useState(false);

  const [newStudentNom, setNewStudentNom] = useState('');
  const [newStudentPrenoms, setNewStudentPrenoms] = useState('');
  const [newStudentMatricule, setNewStudentMatricule] = useState('');

  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Cliquez sur le micro pour parler');

  const [paywallModal, setPaywallModal] = useState(false);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [activationStatus, setActivationStatus] = useState('idle');
  const [activationMessage, setActivationMessage] = useState('');
  const [notif, setNotif] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);

  const [scanMatiere, setScanMatiere] = useState('maths');
  const [scanImage, setScanImage] = useState(null);
  const [scanStatus, setScanStatus] = useState('idle');
  const [scanResults, setScanResults] = useState([]);
  const [scanErrorMsg, setScanErrorMsg] = useState('');
  const [scanProgressMsg, setScanProgressMsg] = useState('');

  const recognitionRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const importFileInputRef = useRef(null);

  const isPremiumPlan = user.statut_abonnement === 'actif' && user.planId === '5ans';

  const triggerNotif = (message: string, type = 'success') => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 4000);
  };

  useEffect(() => {
    const handleUpdateAvailable = (e: any) => {
      setUpdateInfo({ activateUpdate: e.detail.activateUpdate });
    };
    window.addEventListener('mastanote-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('mastanote-update-available', handleUpdateAvailable);
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      setVoiceStatus("Écoute active... Dites par exemple : 'Quatorze et douze'");
    };

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      processVoiceCommand(text);
    };

    rec.onerror = () => {
      setVoiceStatus("Une erreur est survenue lors de l'écoute.");
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      rec.onstart = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try { rec.stop(); } catch (e) { }
    };
  }, [selectedClassId, activeMatiere, currentSaisieIndex]);

  const processVoiceCommand = (text: string) => {
    setVoiceStatus(`Reconnu : "${text}"`);
    const cleanText = text.toLowerCase().trim();
    const numberPattern = /([0-9]+[.,]?[0-9]*)/g;
    const matches = cleanText.match(numberPattern);

    if (matches && matches.length >= 1) {
      const noteLue = parseFloat(matches[0].replace(',', '.'));
      if (noteLue >= 0 && noteLue <= 20) {
        setTempNote(noteLue.toString());
        if (matches[1]) {
          const perfLu = parseFloat(matches[1].replace(',', '.'));
          if (perfLu >= 0 && perfLu <= 20) {
            setTempPerf(perfLu.toString());
            triggerNotif(`Notes détectées : ${noteLue}/20, Perf ${perfLu}/20`, 'success');
          } else {
            triggerNotif(`Note détectée : ${noteLue}/20`, 'success');
          }
        } else {
          triggerNotif(`Note détectée : ${noteLue}/20`, 'success');
        }
      } else {
        setVoiceStatus("Les notes doivent être entre 0 et 20.");
      }
    } else {
      setVoiceStatus("Aucun chiffre compris. Réessayez.");
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      triggerNotif("Reconnaissance vocale non supportée sur ce navigateur.", 'error');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const activeClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const activeEleve = activeClass?.eleves[currentSaisieIndex];

  useEffect(() => {
    if (activeClass && activeEleve) {
      const classNotes = (notes as any)[selectedClassId]?.[activeMatiere]?.[activeEleve.id] || { note: '', perf: '' };
      setTempNote(classNotes.note !== undefined ? classNotes.note.toString() : '');
      setTempPerf(classNotes.perf !== undefined ? classNotes.perf.toString() : '');
    }
  }, [currentSaisieIndex, activeMatiere, selectedClassId]);

  const handleSaveCurrentAndNext = () => {
    if (!activeClass || !activeEleve) return;
    const n = parseFloat(tempNote);
    const p = parseFloat(tempPerf);

    if (tempNote !== '' && (isNaN(n) || n < 0 || n > 20)) {
      triggerNotif("La note obtenue doit être entre 0 et 20.", 'error');
      return;
    }
    if (tempPerf !== '' && (isNaN(p) || p < 0 || p > 20)) {
      triggerNotif("La note de perfectionnement doit être entre 0 et 20.", 'error');
      return;
    }

    setNotes(prev => {
      const classData = prev[selectedClassId] || {};
      const matiereData = classData[activeMatiere] || {};
      return {
        ...prev,
        [selectedClassId]: {
          ...classData,
          [activeMatiere]: {
            ...matiereData,
            [activeEleve.id]: {
              note: tempNote !== '' ? n : undefined,
              perf: tempPerf !== '' ? p : undefined
            }
          }
        }
      };
    });

    if (currentSaisieIndex < activeClass.eleves.length - 1) {
      setCurrentSaisieIndex(prev => prev + 1);
    } else {
      triggerNotif("Saisie terminée pour cette classe !", 'success');
    }
  };

  const handleActivateLicense = async () => {
    const key = licenseKeyInput.trim();
    if (!key) {
      setActivationStatus('error');
      setActivationMessage("Veuillez saisir votre clé de licence.");
      return;
    }
    setActivationStatus('validating');
    try {
      const response = await fetch(LICENSE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setActivationStatus('error');
        setActivationMessage(data.message || "Clé invalide ou expirée.");
        return;
      }

      const plan = ABONNEMENT_PLANS.find(p => p.chariowProductId === data.productId) || null;
      setUser(prev => ({
        ...prev,
        statut_abonnement: 'actif',
        planId: plan ? plan.id : null,
        plan: plan ? plan.label : 'Licence active',
        expireLe: new Date(data.expiresAt).toLocaleDateString('fr-FR')
      }));
      setActivationStatus('success');
      setTimeout(() => setPaywallModal(false), 1500);
    } catch (err) {
      setActivationStatus('error');
      setActivationMessage("Erreur réseau. Réessayez.");
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans">
      {/* Barre de Notification */}
      {notif && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border backdrop-blur-md ${notif.type === 'error' ? 'bg-rose-950/80 border-rose-500 text-rose-200' : 'bg-emerald-950/80 border-emerald-500 text-emerald-200'}`}>
          {notif.message}
        </div>
      )}

      {/* En-tête de l'application */}
      <header className="border-b border-slate-800/60 bg-slate-950/50 backdrop-blur-md p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/10">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              MastaNote <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent text-sm font-extrabold">AI+</span>
            </h1>
            <p className="text-xs text-slate-400">Dashboard Enseignant Bénin</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setPaywallModal(true)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${user.statut_abonnement === 'actif' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/10 hover:opacity-90'}`}
          >
            {user.statut_abonnement === 'actif' ? `Plan ${user.plan}` : 'Activer MastaNote Premium'}
          </button>
        </div>
      </header>

      {/* Espace de Saisie Central Rapide */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-6">
        <div className="bg-[#0c101d] border border-slate-800/60 rounded-3xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          
          <div className="flex justify-between items-center mb-6">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">Saisie en cours</span>
              <h2 className="text-xl font-extrabold text-white">{activeClass?.nom} — {MATIERES_PRIMAIRE.find(m => m.id === activeMatiere)?.label}</h2>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-slate-300">{currentSaisieIndex + 1}</span>
              <span className="text-xs text-slate-500"> / {activeClass?.eleves.length || 0} élèves</span>
            </div>
          </div>

          {activeEleve ? (
            <div className="space-y-6">
              <div className="bg-slate-950/40 border border-slate-800/40 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-mono tracking-wider">{activeEleve.matricule}</p>
                  <p className="text-lg font-black text-white">{activeEleve.nom} {activeEleve.prenoms}</p>
                </div>
                <button onClick={toggleListening} className={`p-3 rounded-xl transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Note Obtenue (/20)</label>
                  <input type="number" step="0.25" min="0" max="20" value={tempNote} onChange={e => setTempNote(e.target.value)} placeholder="Ex: 14.5" className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-white text-center font-bold text-lg focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400">Perfectionnement (/20)</label>
                  <input type="number" step="0.25" min="0" max="20" value={tempPerf} onChange={e => setTempPerf(e.target.value)} placeholder="Ex: 12" className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-white text-center font-bold text-lg focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveCurrentAndNext} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 transition-all">
                  Valider et Continuer <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-6">Aucun élève chargé dans cette classe.</p>
          )}
        </div>
      </main>

      {/* Fenêtre Modale d'Activation de Licence (Paywall) */}
      {paywallModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c101d] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="text-center space-y-2">
              <Lock className="w-8 h-8 text-amber-500 mx-auto" />
              <h3 className="text-xl font-extrabold text-white">Activation Premium MastaNote AI+</h3>
              <p className="text-xs text-slate-400">Entrez votre clé après votre paiement sécurisé MTN / Moov Money via Chariow.</p>
            </div>

            <div className="space-y-3">
              <input 
                type="text" 
                value={licenseKeyInput}
                onChange={e => setLicenseKeyInput(e.target.value)}
                placeholder="Collez votre clé de licence ici" 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
              />
              <button 
                onClick={handleActivateLicense}
                disabled={activationStatus === 'validating'}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors"
              >
                {activationStatus === 'validating' ? 'Validation...' : 'Activer ma Licence'}
              </button>
              {activationMessage && (
                <p className={`text-center text-xs font-medium ${activationStatus === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activationMessage}
                </p>
              )}
            </div>

            <div className="border-t border-slate-800/60 pt-4 text-center">
              <button onClick={() => setPaywallModal(false)} className="text-xs text-slate-500 hover:text-slate-400 font-medium">Plus tard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}