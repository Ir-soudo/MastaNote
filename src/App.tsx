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
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

// --- CONFIGURATION ET COMPOSANTS PRINCIPAUX ---

// Liste des matières standardisées pour le Primaire d'EducMaster Bénin
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

// Classes disponibles au Primaire au Bénin
const CLASSES_PRIMAIRE = ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'];

// Formules d'abonnement disponibles
const ABONNEMENT_PLANS = [
  { id: '1an', label: '1 An', duree_mois: 12, prix: 1500 },
  { id: '3ans', label: '3 Ans', duree_mois: 36, prix: 3000 }
];

// --- CONFIGURATION KKIAPAY (Paiement Mobile Money / Web) ---
const KKIAPAY_PUBLIC_KEY = "8d6ab7c07ca711f19bbfd97182685e03";
const KKIAPAY_SANDBOX = false;

// --- CONFIGURATION BACKEND SCANNER IA (Render) ---
const SCAN_API_URL = 'https://mastanote-backend.onrender.com/api/scan';

// Liste d'élèves par défaut pour l'exemple
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
  // --- ÉTAT DE NAVIGATION LANDING PAGE ---
  const [showApp, setShowApp] = useState(false);

  // --- ÉTATS CLASSIQUES ---
  const [user, setUser] = useState({
    nom: 'Enseignant Bénin',
    tel: '0197000000',
    statut_abonnement: 'demo', // demo, actif
    plan: null,
    expireLe: null
  });

  // Gestion des classes de l'enseignant
  const [classes, setClasses] = useState([
    { id: 'class-1', nom: 'CM2 Émeraude', niveau: 'CM2', eleves: ELEVES_INITIAL_CM2 }
  ]);
  const [selectedClassId, setSelectedClassId] = useState('class-1');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, saisie, eleves, scan, parametres

  // Matière active pour la saisie
  const [activeMatiere, setActiveMatiere] = useState('maths');

  // Stockage des notes : { [classeId]: { [matiereId]: { [eleveId]: { note: X, perf: Y } } } }
  const [notes, setNotes] = useState<any>({
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

  // État de la saisie en cours (pour l'interface Mobile-First un à un)
  const [currentSaisieIndex, setCurrentSaisieIndex] = useState(0);
  const [tempNote, setTempNote] = useState('');
  const [tempPerf, setTempPerf] = useState('');

  // États pour la création de classe
  const [newClassName, setNewClassName] = useState('');
  const [newClassNiveau, setNewClassNiveau] = useState('CM2');
  const [showAddClassModal, setShowAddClassModal] = useState(false);

  // États pour l'ajout d'élèves
  const [newStudentNom, setNewStudentNom] = useState('');
  const [newStudentPrenoms, setNewStudentPrenoms] = useState('');
  const [newStudentMatricule, setNewStudentMatricule] = useState('');

  // États pour l'IA Vocale
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('Cliquez sur le micro pour parler');

  // États pour le Paywall
  const [paywallModal, setPaywallModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('1an');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [paymentStep, setPaymentStep] = useState('form'); // form, processing, success
  const [notif, setNotif] = useState<any>(null);

  // États pour le Scanner IA de feuilles de notes
  const [scanMatiere, setScanMatiere] = useState('maths');
  const [scanImage, setScanImage] = useState<any>(null); // { base64, mediaType, previewUrl }
  const [scanStatus, setScanStatus] = useState('idle'); // idle, analyzing, review, error
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [scanErrorMsg, setScanErrorMsg] = useState('');
  const [scanProgressMsg, setScanProgressMsg] = useState('');

  const recognitionRef = useRef<any>(null);
  const planRef = useRef(selectedPlanId);
  const cameraInputRef = useRef<any>(null);
  const galleryInputRef = useRef<any>(null);
  const importFileInputRef = useRef<any>(null);

  useEffect(() => {
    planRef.current = selectedPlanId;
  }, [selectedPlanId]);

  // --- ALERTE NOTIFICATION ---
  const triggerNotif = (message: string, type = 'success') => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 4000);
  };

  // --- CHARGEMENT DU SDK KKIAPAY (WEB) ---
  useEffect(() => {
    if (!document.getElementById('kkiapay-sdk-script')) {
      const script = document.createElement('script');
      script.id = 'kkiapay-sdk-script';
      script.src = 'https://cdn.kkiapay.me/k.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // --- ÉCOUTEURS DES ÉVÉNEMENTS DE PAIEMENT KKIAPAY ---
  useEffect(() => {
    const computeExpiration = (dureeMois: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() + dureeMois);
      return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const handleKkiapaySuccess = (response: any) => {
      const plan = ABONNEMENT_PLANS.find(p => p.id === planRef.current) || ABONNEMENT_PLANS[0];
      setPaymentStep('success');
      setUser(prev => ({
        ...prev,
        statut_abonnement: 'actif',
        plan: plan.label,
        expireLe: computeExpiration(plan.duree_mois)
      }));
      triggerNotif(
        `Paiement validé ! Réf. transaction : ${response?.transactionId || 'N/A'}`,
        'success'
      );
    };

    const handleKkiapayFailed = () => {
      setPaymentStep('form');
      triggerNotif("Le paiement a échoué ou a été annulé. Veuillez réessayer.", 'error');
    };

    let pollId: any;
    const attachListeners = () => {
      if ((window as any).addSuccessListener && (window as any).addFailedListener) {
        (window as any).addSuccessListener(handleKkiapaySuccess);
        (window as any).addFailedListener(handleKkiapayFailed);
        return true;
      }
      return false;
    };

    if (!attachListeners()) {
      pollId = setInterval(() => {
        if (attachListeners() && pollId) clearInterval(pollId);
      }, 300);
    }

    return () => {
      if (pollId) clearInterval(pollId);
    };
  }, []);

  // --- INITIALISATION DE L'API VOCALE ---
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
      try { rec.stop(); } catch (e) { /* déjà arrêté */ }
    };
  }, [selectedClassId, activeMatiere, currentSaisieIndex]);

  // --- ANALYSE DE LA DICTÉE IA ---
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
            triggerNotif(`Notes détectées : Note obtenue ${noteLue}/20, Perf ${perfLu}/20`, 'success');
          } else {
            triggerNotif(`Note obtenue détectée : ${noteLue}/20 (perfectionnement non reconnu, non modifié)`, 'success');
          }
        } else {
          triggerNotif(`Note obtenue détectée : ${noteLue}/20`, 'success');
        }
      } else {
        setVoiceStatus("Désolé, les notes doivent être comprises entre 0 et 20.");
      }
    } else {
      setVoiceStatus("Je n'ai pas compris de chiffres. Réessayez.");
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      triggerNotif("La reconnaissance vocale n'est pas supportée sur ce navigateur.", 'error');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // --- LOGIQUE SAISIE ET NAVIGATION ÉLÈVES ---
  const activeClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const activeEleve = activeClass?.eleves[currentSaisieIndex];

  useEffect(() => {
    if (activeClass && activeEleve) {
      const currentNotes = notes[selectedClassId]?.[activeMatiere]?.[activeEleve.id] || { note: '', perf: '' };
      setTempNote(currentNotes.note !== undefined ? currentNotes.note.toString() : '');
      setTempPerf(currentNotes.perf !== undefined ? currentNotes.perf.toString() : '');
    }
  }, [currentSaisieIndex, activeMatiere, selectedClassId]);

  const handleSaveCurrentAndNext = () => {
    if (!activeClass || !activeEleve) return;

    const n = parseFloat(tempNote);
    const p = parseFloat(tempPerf);

    if (tempNote !== '' && (isNaN(n) || n < 0 || n > 20)) {
      triggerNotif("La note obtenue doit être comprise entre 0 et 20.", 'error');
      return;
    }
    if (tempPerf !== '' && (isNaN(p) || p < 0 || p > 20)) {
      triggerNotif("La note de perfectionnement doit être comprise entre 0 et 20.", 'error');
      return;
    }

    setNotes((prev: any) => {
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

  const handlePrev = () => {
    if (currentSaisieIndex > 0) {
      setCurrentSaisieIndex(prev => prev - 1);
    }
  };

  // --- CREATION / SUPPRESSION DE CLASSE ---
  const handleCreateClass = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newClassName.trim()) return;

    const newClass = {
      id: `class-${Date.now()}`,
      nom: newClassName,
      niveau: newClassNiveau,
      eleves: []
    };

    setClasses(prev => [...prev, newClass]);
    setSelectedClassId(newClass.id);
    setCurrentSaisieIndex(0);
    setNewClassName('');
    setShowAddClassModal(false);
    triggerNotif(`Classe "${newClass.nom}" créée avec succès !`);
  };

  const handleDeleteClass = () => {
    if (classes.length <= 1) {
      triggerNotif("Vous devez conserver au moins une classe.", 'error');
      return;
    }
    if (!activeClass) return;
    if (!confirm(`Voulez-vous vraiment supprimer la classe "${activeClass.nom}" et toutes ses notes ? Cette action est irréversible.`)) {
      return;
    }

    const remaining = classes.filter(c => c.id !== activeClass.id);
    setClasses(remaining);
    setNotes((prev: any) => {
      const updated = { ...prev };
      delete updated[activeClass.id];
      return updated;
    });
    setSelectedClassId(remaining[0].id);
    setCurrentSaisieIndex(0);
    triggerNotif(`Classe "${activeClass.nom}" supprimée.`);
  };

  const generateUniqueMatricule = () => {
    const existing = new Set(activeClass.eleves.map(el => el.matricule));
    let candidate;
    let attempts = 0;
    do {
      candidate = `24-${activeClass.niveau}-${Math.floor(100 + Math.random() * 900)}`;
      attempts++;
    } while (existing.has(candidate) && attempts < 50);
    return candidate;
  };

  const handleAddStudent = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newStudentNom.trim() || !newStudentPrenoms.trim()) {
      triggerNotif("Veuillez remplir le nom et le prénom de l'élève.", 'error');
      return;
    }

    const matriculeGenere = newStudentMatricule.trim() || generateUniqueMatricule();

    const newStudent = {
      id: `student-${Date.now()}`,
      matricule: matriculeGenere,
      nom: newStudentNom.toUpperCase(),
      prenoms: newStudentPrenoms
    };

    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          eleves: [...c.eleves, newStudent]
        };
      }
      return c;
    }));

    setNewStudentNom('');
    setNewStudentPrenoms('');
    setNewStudentMatricule('');
    triggerNotif(`${newStudent.nom} ajouté à la classe !`);
  };

  const handleDeleteStudent = (studentId: string) => {
    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          eleves: c.eleves.filter(e => e.id !== studentId)
        };
      }
      return c;
    }));
    triggerNotif("Élève retiré de la classe.");
  };

  // --- IMPORTATION RAPIDE DU CANEVAS EDUCMASTER ---
  const normalizeHeader = (s: any) => (s ?? '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();

  const detectColumns = (headerRow: any[]) => {
    const normalized = (headerRow || []).map(normalizeHeader);

    const idxPrenom = normalized.findIndex(h => h.includes('prenom'));
    const idxMatricule = normalized.findIndex(h => h.includes('matricule'));
    const idxNom = normalized.findIndex((h, i) =>
      i !== idxPrenom && (h === 'nom' || h.startsWith('nom ') || h.includes('nom de famille') || h === 'noms')
    );

    const detectionComplete = idxMatricule !== -1 && idxNom !== -1 && idxPrenom !== -1;

    return detectionComplete
      ? { matricule: idxMatricule, nom: idxNom, prenoms: idxPrenom }
      : { matricule: 0, nom: 1, prenoms: 2 };
  };

  const rowsFromCsvText = (rawText: string) => {
    const lines = rawText.split(/\r\n|\n|\r/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];

    const headerLine = lines[0];
    const counts = {
      ',': (headerLine.match(/,/g) || []).length,
      ';': (headerLine.match(/;/g) || []).length,
      '\t': (headerLine.match(/\t/g) || []).length
    };
    const separator = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];

    const cleanCell = (cell: string) => cell.trim().replace(/^"+|"+$/g, '').trim();

    return lines.map(line => line.split(separator).map(cleanCell));
  };

  const rowsFromWorkbook = (arrayBuffer: any) => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    let chosenSheetName = workbook.SheetNames[0];
    for (const sheetName of workbook.SheetNames) {
      const preview = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' });
      const headerRow = preview[0] || [];
      if (headerRow.some(h => normalizeHeader(h).includes('matricule'))) {
        chosenSheetName = sheetName;
        break;
      }
    }

    const sheet = workbook.Sheets[chosenSheetName];
    return XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
  };

  const studentsFromRows = (rows: any[]) => {
    if (!rows || rows.length < 2) return [];
    const cols = detectColumns(rows[0]);

    const students: any[] = [];
    rows.slice(1).forEach((row) => {
      if (!row || row.length === 0) return;

      const matricule = (row[cols.matricule] ?? '').toString().trim();
      const nom = (row[cols.nom] ?? '').toString().trim();
      const prenoms = (row[cols.prenoms] ?? '').toString().trim();

      if (!matricule || !nom) return;

      students.push({
        id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        matricule,
        nom: nom.toUpperCase(),
        prenoms
      });
    });
    return students;
  };

  const applyImportedStudents = (imported: any[]) => {
    if (imported.length === 0) {
      triggerNotif("Aucun élève valide trouvé dans ce fichier. Vérifiez qu'il s'agit bien du canevas EducMaster (Matricule, Nom, Prénom).", 'error');
      return;
    }

    let finalStudents = imported;
    let replaced = true;

    if (activeClass && activeClass.eleves.length > 0) {
      replaced = confirm(
        `Cette classe contient déjà ${activeClass.eleves.length} élève(s).\n\nOK = REMPLACER la liste par les ${imported.length} élève(s) importé(s).\nAnnuler = AJOUTER les nouveaux élèves à la liste existante.`
      );
      if (!replaced) {
        const existingMatricules = new Set(activeClass.eleves.map(el => el.matricule));
        const toAdd = imported.filter(s => !existingMatricules.has(s.matricule));
        finalStudents = [...activeClass.eleves, ...toAdd];
      }
    }

    setClasses(prev => prev.map(c => c.id === selectedClassId ? { ...c, eleves: finalStudents } : c));

    if (replaced) {
      setNotes((prev: any) => ({ ...prev, [selectedClassId]: {} }));
      setCurrentSaisieIndex(0);
    }

    triggerNotif(`${imported.length} élève(s) importé(s) avec succès depuis le fichier EducMaster !`, 'success');
  };

  const handleImportEducMasterFile = (e: any) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const isCsvTxt = /\.(csv|txt)$/i.test(file.name);

    if (!isExcel && !isCsvTxt) {
      triggerNotif("Format non supporté. Veuillez importer un fichier .csv, .txt, .xlsx ou .xls EducMaster.", 'error');
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      triggerNotif("Impossible de lire ce fichier.", 'error');
    };

    if (isExcel) {
      reader.onload = () => {
        try {
          const rows = rowsFromWorkbook(reader.result);
          const imported = studentsFromRows(rows);
          applyImportedStudents(imported);
        } catch (err) {
          console.error(err);
          triggerNotif("Erreur lors de la lecture du fichier Excel. Vérifiez qu'il s'agit bien d'un export EducMaster valide.", 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        try {
          const text = typeof reader.result === 'string' ? reader.result : '';
          const rows = rowsFromCsvText(text);
          const imported = studentsFromRows(rows);
          applyImportedStudents(imported);
        } catch (err) {
          console.error(err);
          triggerNotif("Erreur lors de la lecture du fichier. Vérifiez qu'il s'agit bien d'un export EducMaster valide.", 'error');
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  // --- LOGIQUE FINANCIÈRE / PAYWALL (KKIAPAY) ---
  const isValidBeninPhone = (num: string) => /^0\d{9}$/.test(num);

  const handleInitiatePayment = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!isValidBeninPhone(paymentNumber)) {
      triggerNotif("Veuillez entrer un numéro Mobile Money béninois valide (format : 0197000000).", 'error');
      return;
    }

    if (typeof (window as any).openKkiapayWidget !== 'function') {
      triggerNotif("Le module de paiement se charge encore, veuillez réessayer dans un instant.", 'error');
      return;
    }

    const plan = ABONNEMENT_PLANS.find(p => p.id === selectedPlanId) || ABONNEMENT_PLANS[0];
    setPaymentStep('processing');

    (window as any).openKkiapayWidget({
      amount: plan.prix,
      key: KKIAPAY_PUBLIC_KEY,
      sandbox: KKIAPAY_SANDBOX,
      phone: `229${paymentNumber}`,
      name: user.nom,
      position: 'center',
      paymentmethod: ['momo'],
      data: JSON.stringify({ app: 'MastaNoteAI+', abonnement: plan.id })
    });
  };

  // --- ALGORITHMES ET CALCUL DES STATISTIQUES ---
  const getClassStats = () => {
    if (!activeClass || activeClass.eleves.length === 0) return { moyenne: 0, taux: 0, top: '-', flop: '-' };

    const matNotes = notes[selectedClassId]?.[activeMatiere] || {};
    let total = 0;
    let count = 0;
    let admis = 0;
    let maxNote = -1;
    let minNote = 21;
    let topStudent = '-';
    let flopStudent = '-';

    activeClass.eleves.forEach(el => {
      const studentNoteData = matNotes[el.id];
      if (studentNoteData && studentNoteData.note !== undefined) {
        const n = studentNoteData.note;
        total += n;
        count++;
        if (n >= 10) admis++;

        if (n > maxNote) {
          maxNote = n;
          topStudent = `${el.nom} ${el.prenoms}`;
        }
        if (n < minNote) {
          minNote = n;
          flopStudent = `${el.nom} ${el.prenoms}`;
        }
      }
    });

    return {
      moyenne: count > 0 ? (total / count).toFixed(2) : '0.00',
      taux: count > 0 ? Math.round((admis / count) * 100) : 0,
      top: maxNote !== -1 ? `${topStudent} (${maxNote}/20)` : '-',
      flop: minNote !== 21 ? `${flopStudent} (${minNote}/20)` : '-',
      saisis: count,
      totalEleves: activeClass.eleves.length
    };
  };

  const stats = getClassStats();

  const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  // --- EXPORTATEUR DE CLASSE VERS CANVAS EDUCMASTER ---
  const exportToEducMaster = () => {
    if (user.statut_abonnement === 'demo') {
      setPaywallModal(true);
      return;
    }

    if (!activeClass || activeClass.eleves.length === 0) {
      triggerNotif("Aucun élève dans cette classe à exporter.", 'error');
      return;
    }

    let csvContent = "Matricule,Nom,Prénoms";
    MATIERES_PRIMAIRE.forEach(m => {
      csvContent += `,${m.label},`;
    });
    csvContent += "\n";

    csvContent += ",,";
    MATIERES_PRIMAIRE.forEach(() => {
      csvContent += ",Note obtenue,Note perfectionnement";
    });
    csvContent += "\n";

    activeClass.eleves.forEach(el => {
      let row = `${escapeCsv(el.matricule)},${escapeCsv(el.nom)},${escapeCsv(el.prenoms)}`;

      MATIERES_PRIMAIRE.forEach(m => {
        const studentNote = notes[selectedClassId]?.[m.id]?.[el.id] || {};
        const nObtenu = studentNote.note !== undefined ? studentNote.note : "";
        const nPerf = studentNote.perf !== undefined ? studentNote.perf : "";
        row += `,${nObtenu},${nPerf}`;
      });
      csvContent += row + "\n";
    });

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EducMaster_Notes_${activeClass.nom.replace(/\s+/g, '_')}_Import.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerNotif("Fichier d'importation EducMaster généré avec succès !", 'success');
  };

  // --- SCANNER IA DE FEUILLES DE NOTES ---
  const resetScan = () => {
    setScanImage(null);
    setScanStatus('idle');
    setScanResults([]);
    setScanErrorMsg('');
  };

  const handleScanFileSelected = (e: any) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      triggerNotif("Veuillez sélectionner un fichier image.", 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setScanImage({ base64, mediaType: file.type, previewUrl: result });
      setScanStatus('idle');
      setScanResults([]);
      setScanErrorMsg('');
    };
    reader.onerror = () => {
      triggerNotif("Impossible de lire cette image.", 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeScan = async () => {
    if (!scanImage || !activeClass) return;
    setScanStatus('analyzing');
    setScanErrorMsg('');
    setScanProgressMsg("Analyse en cours...");

    const coldStartTimer = setTimeout(() => {
      setScanProgressMsg("Le serveur se réveille peut-être (jusqu'à 60 secondes après une période d'inactivité)... Merci de patienter.");
    }, 5000);

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 90000);

    try {
      const roster = activeClass.eleves
        .map(el => `${el.matricule} | ${el.nom} ${el.prenoms}`)
        .join('\n');
      const matiereLabel = MATIERES_PRIMAIRE.find(m => m.id === scanMatiere)?.label || scanMatiere;

      const promptText = `Tu analyses la photo d'une feuille de notes (manuscrite ou imprimée) d'une classe de primaire au Bénin, pour la matière "${matiereLabel}".
Voici la liste des élèves de la classe, au format "matricule | Nom Prénoms" :
${roster}

Pour chaque ligne de la feuille que tu peux identifier avec certitude, associe-la au matricule correspondant de la liste ci-dessus (en te basant sur le nom écrit), et extrais la note obtenue sur 20 ainsi que la note de perfectionnement sur 20 si elle est présente.
Réponds UNIQUEMENT avec un tableau JSON valide, sans aucun texte autour, sans balises markdown, au format exact suivant :
[{"matricule":"24-CM2-001","note":14,"perf":15}]
Utilise null pour perf si elle n'est pas visible sur la feuille. Si tu ne peux pas identifier le matricule d'une ligne avec certitude, ignore cette ligne.`;

      const response = await fetch(SCAN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: scanImage.base64,
          mediaType: scanImage.mediaType,
          promptText
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur serveur : ${response.status}`);
      }

      const data = await response.json();
      const textBlock = typeof data.content === 'string' ? data.content : '';
      const clean = textBlock.replace(/```json|```/g, '').trim();
      const parsedArr = JSON.parse(clean);

      const results = activeClass.eleves.map(el => {
        const found = Array.isArray(parsedArr)
          ? parsedArr.find(p => p.matricule && p.matricule.toString().trim() === el.matricule.trim())
          : null;
        const hasNote = found && found.note !== null && found.note !== undefined && found.note !== '';
        const hasPerf = found && found.perf !== null && found.perf !== undefined && found.perf !== '';
        return {
          studentId: el.id,
          matricule: el.matricule,
          nom: `${el.nom} ${el.prenoms}`,
          note: hasNote ? found.note.toString() : '',
          perf: hasPerf ? found.perf.toString() : '',
          include: !!hasNote
        };
      });

      setScanResults(results);
      setScanStatus('review');

      const detectedCount = results.filter(r => r.include).length;
      if (detectedCount === 0) {
        triggerNotif("Aucune note n'a pu être identifiée automatiquement. Vous pouvez les saisir manuellement ci-dessous.", 'error');
      } else {
        triggerNotif(`${detectedCount} note(s) détectée(s) sur ${activeClass.eleves.length} élève(s). Vérifiez avant d'enregistrer.`, 'success');
      }
    } catch (err: any) {
      console.error(err);
      setScanStatus('error');
      if (err && err.name === 'AbortError') {
        setScanErrorMsg("Le serveur met trop de temps à répondre (plus de 90 secondes). Il devrait être réveillé maintenant : réessayez.");
      } else {
        setScanErrorMsg(err?.message || "L'analyse a échoué. Vérifiez la netteté de la photo et réessayez.");
      }
    } finally {
      clearTimeout(coldStartTimer);
      clearTimeout(abortTimer);
      setScanProgressMsg('');
    }
  };

  const handleApplyScanResults = () => {
    let count = 0;
    setNotes((prev: any) => {
      const updatedNotes = { ...prev };
      const classData = updatedNotes[selectedClassId] || {};
      const matiereData = classData[scanMatiere] || {};

      scanResults.forEach(res => {
        if (res.include) {
          const n = parseFloat(res.note);
          const p = parseFloat(res.perf);
          matiereData[res.studentId] = {
            note: isNaN(n) ? undefined : n,
            perf: isNaN(p) ? undefined : p
          };
          count++;
        }
      });

      classData[scanMatiere] = matiereData;
      updatedNotes[selectedClassId] = classData;
      return updatedNotes;
    });

    triggerNotif(`${count} note(s) enregistrée(s) avec succès !`, 'success');
    setActiveTab('dashboard');
    setActiveMatiere(scanMatiere);
    resetScan();
  };

  const handleResultChange = (studentId: string, field: string, value: string) => {
    setScanResults(prev => prev.map(res => {
      if (res.studentId === studentId) {
        const updated = { ...res, [field]: value };
        if (field === 'note' && value.trim() !== '') {
          updated.include = true;
        }
        return updated;
      }
      return res;
    }));
  };

  const handleToggleInclude = (studentId: string) => {
    setScanResults(prev => prev.map(res => {
      if (res.studentId === studentId) {
        return { ...res, include: !res.include };
      }
      return res;
    }));
  };

  // --- RENDU DE LA LANDING PAGE EN AMONT ---
  if (!showApp) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-900 overflow-x-hidden">
        {/* Dégradés de fond futuristes */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-20 overflow-hidden">
          <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 blur-[150px]"></div>
          <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 blur-[130px]"></div>
        </div>

        {/* 1. Navbar */}
        <header className="relative border-b border-slate-800/80 bg-[#0b0f19]/85 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                    MastaNote AI<span className="text-emerald-400">+</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    PRIMAIRE CI-CM2
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Révolution EducMaster Bénin</p>
              </div>
            </div>

            <button 
              onClick={() => setShowApp(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#f97316] hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all duration-200 hover:-translate-y-0.5"
            >
              Accéder à l'application
            </button>
          </div>
        </header>

        {/* 2. Section d'accueil (Hero Section) */}
        <section className="relative pt-20 pb-24 px-6 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-8 animate-pulse">
            <Zap className="w-3.5 h-3.5" /> Propulsé par l'Intelligence Artificielle de pointe
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-[1.1] mb-6">
            Dites adieu à la corvée de <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
              saisie manuelle des notes
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Prenez en photo vos grilles de notes manuscrites. Notre IA extrait, structure et génère instantanément votre fichier prêt pour le portail <strong className="text-slate-200 font-semibold">EducMaster Bénin</strong>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <button
              onClick={() => setShowApp(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-[#0b0f19] bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 shadow-xl shadow-emerald-500/25 transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2 group"
            >
              Lancer l'application maintenant
              <ArrowRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => {
                const sec = document.getElementById('features');
                sec?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-slate-300 bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/50 transition-all duration-200"
            >
              Comment ça marche ?
            </button>
          </div>

          {/* Présentation du mockup d'interface */}
          <div className="mt-16 relative rounded-3xl border border-slate-800 bg-[#0f1423]/60 p-4 shadow-2xl max-w-5xl mx-auto overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>
            <div className="rounded-2xl overflow-hidden bg-[#070b13] border border-slate-800/50 aspect-[16/10] flex items-center justify-center p-8 relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-transparent to-transparent"></div>
              
              <div className="z-10 max-w-lg text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 animate-bounce">
                  <Camera className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Scanner de Notes en Action</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Sélectionnez une photo de votre feuille de notes, l'IA se charge du reste en analysant l'écriture en quelques secondes.
                  </p>
                </div>
                <button
                  onClick={() => setShowApp(true)}
                  className="px-6 py-3 rounded-xl bg-[#f97316] hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all"
                >
                  ⚡ Commencer à scanner
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Section Fonctionnalités (Features) */}
        <section id="features" className="py-24 border-t border-slate-900 bg-[#070a12]/50 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
                Spécialement développé pour les instituteurs du Bénin
              </h2>
              <p className="text-slate-400">
                Gagnez des heures précieuses à chaque fin de trimestre pour vous concentrer sur l'essentiel : la pédagogie.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Fonctionnalité 1 */}
              <div className="p-8 rounded-2xl border border-slate-800/60 bg-[#0c101d]/80 hover:border-indigo-500/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                  <Camera className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">Extraction intelligente par Vision</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Notre modèle de vision décrypte les écritures manuscrites des enseignants, même sur des grilles papier froissées ou à faible luminosité.
                </p>
              </div>

              {/* Fonctionnalité 2 */}
              <div className="p-8 rounded-2xl border border-slate-800/60 bg-[#0c101d]/80 hover:border-emerald-500/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">Export CSV compatible EducMaster</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Générez en un clic des fichiers d'importation CSV structurés, respectant au millimètre près les exigences d'intégration d'EducMaster Bénin.
                </p>
              </div>

              {/* Fonctionnalité 3 */}
              <div className="p-8 rounded-2xl border border-slate-800/60 bg-[#0c101d]/80 hover:border-orange-500/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 mb-6">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-100 mb-2">Conforme & RGPD</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Vos images et informations d'élèves ne sont jamais conservées après traitement. Vos données scolaires restent sécurisées et privées.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Footer */}
        <footer className="border-t border-slate-900 py-12 text-center text-slate-500 text-xs bg-[#070a12]/70">
          <p>© 2026 MastaNote AI+. Tous droits réservés.</p>
          <p className="mt-2 text-slate-600">Pour une gestion scolaire moderne et simplifiée.</p>
        </footer>
      </div>
    );
  }

  // --- RENDU DE L'APPLICATION ET DU DASHBOARD EXISTANT ---
  return (
    <div className="min-h-screen bg-[#070b13] text-white font-sans selection:bg-emerald-500 selection:text-slate-900">
      
      {/* Barre de notification temporaire */}
      {notif && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className={`flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl border ${
            notif.type === 'error' 
              ? 'bg-red-500/10 text-red-400 border-red-500/20' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            {notif.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span className="text-sm font-semibold">{notif.message}</span>
          </div>
        </div>
      )}

      {/* HEADER DE L'APPLICATION */}
      <header className="border-b border-slate-800/60 bg-[#0c111e]/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight">MastaNote AI<span className="text-emerald-400">+</span></span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">PRIMAIRE CI-CM2</span>
              </div>
              <p className="text-[10px] text-slate-400">Révolution EducMaster Bénin</p>
            </div>
          </div>

          <div className="flex items-center gap-3 justify-between sm:justify-end">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Statut : 
                <span className={`ml-1 font-bold ${user.statut_abonnement === 'actif' ? 'text-emerald-400' : 'text-orange-400'}`}>
                  {user.statut_abonnement === 'actif' ? 'Abonné' : 'Démonstration'}
                </span>
              </p>
              {user.statut_abonnement === 'actif' && (
                <p className="text-[10px] text-slate-500">Expire le {user.expireLe}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {user.statut_abonnement === 'demo' ? (
                <button
                  onClick={() => setPaywallModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#f97316] hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition-all duration-200"
                >
                  <Lock className="w-3.5 h-3.5" /> Débloquer l'Export
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Licence Active
                </div>
              )}

              <button 
                onClick={() => setActiveTab('parametres')}
                className={`p-2 rounded-xl border transition-all ${activeTab === 'parametres' ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 text-slate-400'}`}
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ZONE PRINCIPALE */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6 pb-24">
        
        {/* SELECTEUR DE CLASSE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0c111e]/40 p-4 rounded-2xl border border-slate-800/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Classe :</span>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setCurrentSaisieIndex(0);
              }}
              className="bg-[#0f1423] border border-slate-800 rounded-xl px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteClass}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all flex items-center gap-1.5"
              title="Supprimer la classe active"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
            </button>
            <button
              onClick={() => setShowAddClassModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#141b2f] hover:bg-indigo-600 text-white border border-slate-700/50 hover:border-indigo-500 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Nouvelle classe
            </button>
          </div>
        </div>

        {/* ONGLETS DE NAVIGATION */}
        <div className="flex overflow-x-auto border-b border-slate-800 scrollbar-none gap-2">
          {[
            { id: 'dashboard', label: 'Tableau de bord', icon: TrendingUp },
            { id: 'saisie', label: 'Saisie Express (Vocal)', icon: Mic },
            { id: 'scan', label: 'Scanner IA (Photo)', icon: Camera },
            { id: 'eleves', label: `Liste des Élèves (${activeClass?.eleves.length || 0})`, icon: Users }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.02]' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/[0.1]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* --- CONTENU DE L'ONGLET : TABLEAU DE BORD --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* CARTE HERO CLASSE ACTIVE */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c111e] to-[#0f1527] border border-slate-800 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-white">Classe active : {activeClass?.nom}</h2>
                <p className="text-slate-400 text-sm max-w-lg">
                  Saisissez les notes puis générez le fichier compatible avec le portail officiel EducMaster Bénin.
                </p>
                <div className="flex gap-2 pt-1">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700/50">
                    {activeClass?.eleves.length || 0} Élèves
                  </span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-indigo-400 border border-slate-700/50">
                    Niveau {activeClass?.niveau}
                  </span>
                </div>
              </div>

              <div className="flex w-full md:w-auto items-center gap-3">
                <button
                  onClick={() => setActiveTab('scan')}
                  className="flex-1 md:flex-none px-5 py-3.5 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold text-xs border border-slate-700/40 hover:border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4 text-slate-400" /> Scanner une feuille
                </button>
                <button
                  onClick={exportToEducMaster}
                  className="flex-1 md:flex-none px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#070b13] font-bold text-xs shadow-lg shadow-emerald-500/10 transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Exporter EducMaster (.csv)
                </button>
              </div>
            </div>

            {/* APERÇU RAPIDE PAR MATIÈRE */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aperçu rapide par matière</h3>
              
              {/* Carrousel de matières */}
              <div className="flex overflow-x-auto gap-2 scrollbar-none pb-2">
                {MATIERES_PRIMAIRE.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMatiere(m.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                      activeMatiere === m.id
                        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                        : 'bg-[#0c111e]/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* STATS DU TRIMESTRE POUR LA MATIÈRE ACTIVE */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Moyenne de classe', val: `${stats.moyenne} /20`, icon: TrendingUp, color: 'text-indigo-400' },
                  { label: 'Taux de réussite', val: `${stats.taux}%`, icon: Award, color: 'text-emerald-400' },
                  { label: 'Premier de la classe', val: stats.top, icon: Sparkles, color: 'text-yellow-400' },
                  { label: 'Dernier de la classe', val: stats.flop, icon: AlertTriangle, color: 'text-red-400' }
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="p-4 rounded-2xl border border-slate-800/60 bg-[#0c111e]/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{s.label}</span>
                        <Icon className={`w-4 h-4 ${s.color}`} />
                      </div>
                      <p className="text-lg font-black text-slate-100 truncate">{s.val}</p>
                    </div>
                  );
                })}
              </div>

              {/* TABLEAU DES NOTES DU GROUPE ÉLÈVES */}
              <div className="border border-slate-800/80 rounded-2xl bg-[#0c111e]/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0c111e]/60 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Matricule</th>
                        <th className="py-3.5 px-4">Nom & Prénoms</th>
                        <th className="py-3.5 px-4 text-center">Note Obtenue (sur 20)</th>
                        <th className="py-3.5 px-4 text-center">Note Perfectionnement (sur 20)</th>
                        <th className="py-3.5 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-sm">
                      {activeClass?.eleves.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                            Aucun élève dans cette classe. Allez dans l'onglet "Élèves" pour en ajouter.
                          </td>
                        </tr>
                      ) : (
                        activeClass?.eleves.map(el => {
                          const studentNotes = notes[selectedClassId]?.[activeMatiere]?.[el.id] || {};
                          return (
                            <tr key={el.id} className="hover:bg-slate-800/[0.05] transition-colors">
                              <td className="py-3 px-4 font-mono text-xs text-slate-400">{el.matricule}</td>
                              <td className="py-3 px-4 font-semibold text-slate-200">{el.nom} {el.prenoms}</td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  studentNotes.note === undefined 
                                    ? 'bg-slate-800/30 text-slate-600' 
                                    : studentNotes.note >= 10 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                                      : 'bg-red-500/10 text-red-400 border border-red-500/15'
                                }`}>
                                  {studentNotes.note !== undefined ? studentNotes.note.toFixed(2) : '-'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  studentNotes.perf === undefined 
                                    ? 'bg-slate-800/30 text-slate-600' 
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'
                                }`}>
                                  {studentNotes.perf !== undefined ? studentNotes.perf.toFixed(2) : '-'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => {
                                    const index = activeClass.eleves.findIndex(s => s.id === el.id);
                                    setCurrentSaisieIndex(index);
                                    setActiveTab('saisie');
                                  }}
                                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
                                >
                                  Modifier
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- CONTENU DE L'ONGLET : SAISIE EXPRESS VOCAL / RAPIDE --- */}
        {activeTab === 'saisie' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Formulaire de saisie active (Deux tiers de la largeur) */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Sélecteur de matière */}
              <div className="bg-[#0c111e]/40 p-4 rounded-2xl border border-slate-800/50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Matière de saisie :</span>
                <select
                  value={activeMatiere}
                  onChange={(e) => setActiveMatiere(e.target.value)}
                  className="bg-[#0f1423] border border-slate-800 rounded-xl px-4 py-2 text-sm font-semibold text-white focus:outline-none"
                >
                  {MATIERES_PRIMAIRE.map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {!activeEleve ? (
                <div className="p-8 text-center text-slate-500 text-xs border border-slate-800 rounded-2xl">
                  Aucun élève disponible pour la saisie.
                </div>
              ) : (
                <div className="bg-gradient-to-br from-[#0c111e] to-[#0f1527] border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl relative">
                  
                  {/* Indicateur de progression */}
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>ÉLÈVE {currentSaisieIndex + 1} SUR {activeClass.eleves.length}</span>
                    <span>Niveau {activeClass.niveau}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">{activeEleve.matricule}</span>
                    <h2 className="text-2xl font-black text-slate-100">{activeEleve.nom}</h2>
                    <p className="text-slate-300 text-lg">{activeEleve.prenoms}</p>
                  </div>

                  <hr className="border-slate-800/80" />

                  {/* FORMULAIRE DE SAISIE DE NOTES DES DEUX COLONNES D'ÉDUCMASTER */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Note Obtenue (sur 20)</label>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="20"
                        placeholder="Ex: 14.5"
                        value={tempNote}
                        onChange={(e) => setTempNote(e.target.value)}
                        className="w-full bg-[#070b13] border border-slate-800/80 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-slate-100 text-lg font-bold focus:outline-none transition-all placeholder-slate-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Perfectionnement (sur 20)</label>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max="20"
                        placeholder="Ex: 15"
                        value={tempPerf}
                        onChange={(e) => setTempPerf(e.target.value)}
                        className="w-full bg-[#070b13] border border-slate-800/80 focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-slate-100 text-lg font-bold focus:outline-none transition-all placeholder-slate-700"
                      />
                    </div>
                  </div>

                  {/* CONTROLES DE SAISIE */}
                  <div className="flex items-center justify-between gap-4 pt-4">
                    <button
                      onClick={handlePrev}
                      disabled={currentSaisieIndex === 0}
                      className="px-5 py-3 rounded-xl text-xs font-bold bg-[#141b2f] hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
                    >
                      Précédent
                    </button>

                    <button
                      onClick={handleSaveCurrentAndNext}
                      className="flex-1 px-5 py-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-600/10 transition-all flex items-center justify-center gap-1.5"
                    >
                      Sauvegarder & Suivant <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ASSISTANT AUDIO IA VOCAL (Un tiers de la largeur) */}
            <div className="bg-[#0c111e]/40 border border-slate-800/60 p-6 rounded-3xl space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Mic className="w-5 h-5" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">IA Vocale Intelligente</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gagnez du temps en dictant simplement les deux notes à voix haute séparées par "et". 
                </p>
                <div className="p-3 bg-[#070b13]/80 rounded-xl border border-slate-800 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Format oral recommandé :</p>
                  <p className="text-xs font-semibold text-slate-300">"Quatorze virgule cinq et seize"</p>
                  <p className="text-[10px] text-slate-500">Note obtenue = 14.5 | Perfectionnement = 16</p>
                </div>
              </div>

              <div className="space-y-4 text-center">
                <button
                  onClick={toggleListening}
                  className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isListening 
                      ? 'bg-red-500 shadow-lg shadow-red-500/25 animate-pulse text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 text-white hover:scale-105'
                  }`}
                >
                  {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>

                <p className="text-xs font-bold text-slate-300 px-4 min-h-[2.5rem] flex items-center justify-center">
                  {voiceStatus}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- CONTENU DE L'ONGLET : SCANNER IA PHOTO --- */}
        {activeTab === 'scan' && (
          <div className="space-y-6">
            
            {/* CARTE D'ENTÊTE DE SCANNER */}
            <div className="bg-[#0c111e]/40 p-6 rounded-3xl border border-slate-800/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Camera className="w-5 h-5" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider">Scanner de notes IA</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">Beta</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                Prenez simplement en photo une feuille d'examen papier ou votre carnet de notes. Notre intelligence artificielle s'occupe de lire les écritures, d'isoler les élèves et d'extraire la note globale ainsi que la note de perfectionnement.
              </p>
            </div>

            {scanStatus === 'idle' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Configuration et choix de l'image */}
                <div className="md:col-span-2 space-y-6">
                  
                  {/* Choix de la matière */}
                  <div className="bg-[#0c111e]/40 p-4 rounded-2xl border border-slate-800/50 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pour quelle matière scannez-vous ?</span>
                    <select
                      value={scanMatiere}
                      onChange={(e) => setScanMatiere(e.target.value)}
                      className="bg-[#0f1423] border border-slate-800 rounded-xl px-4 py-2 text-sm font-semibold text-white focus:outline-none"
                    >
                      {MATIERES_PRIMAIRE.map(m => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Zone de glisser-déposer de fichier */}
                  {!scanImage ? (
                    <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-[#0c111e]/10 rounded-3xl p-10 text-center space-y-4 transition-all flex flex-col items-center justify-center min-h-[320px]">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500/5 flex items-center justify-center text-indigo-400">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-extrabold text-slate-200">Importez la photo du document</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto">Prenez directement une photo nette ou téléchargez une image existante (.jpg, .png)</p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        {/* Option Caméra Mobile (avec input capture) */}
                        <button
                          onClick={() => cameraInputRef.current?.click()}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#141b2f] hover:bg-slate-800 text-white border border-slate-800 transition-all flex items-center gap-1.5"
                        >
                          <Camera className="w-4 h-4" /> Prendre une photo
                        </button>

                        <button
                          onClick={() => galleryInputRef.current?.click()}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5"
                        >
                          <ImageIcon className="w-4 h-4" /> Depuis la galerie
                        </button>
                      </div>

                      {/* Inputs masqués */}
                      <input 
                        type="file" 
                        ref={cameraInputRef} 
                        accept="image/*" 
                        capture="environment" 
                        className="hidden" 
                        onChange={handleScanFileSelected} 
                      />
                      <input 
                        type="file" 
                        ref={galleryInputRef} 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleScanFileSelected} 
                      />
                    </div>
                  ) : (
                    <div className="relative border border-slate-800 bg-[#0c111e]/40 rounded-3xl overflow-hidden p-3 space-y-4">
                      
                      {/* Aperçu de l'image sélectionnée */}
                      <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-900 aspect-[16/10] flex items-center justify-center">
                        <img 
                          src={scanImage.previewUrl} 
                          alt="Feuille de notes" 
                          className="max-h-full max-w-full object-contain" 
                        />
                      </div>

                      {/* Options de l'aperçu */}
                      <div className="flex items-center justify-between gap-4">
                        <button
                          onClick={resetScan}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Changer d'image
                        </button>

                        <button
                          onClick={handleAnalyzeScan}
                          className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#070b13] shadow-lg shadow-emerald-500/10 transition-all flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Lancer l'analyse IA
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Encadré d'instructions du Scan */}
                <div className="bg-[#0c111e]/40 border border-slate-800/60 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider">Astuces de réussite</h3>
                  </div>
                  <ul className="space-y-3 text-xs text-slate-400 leading-relaxed list-disc list-inside">
                    <li>Veillez à ce que la photo soit bien nette et prise de face (non inclinée).</li>
                    <li>Utilisez une écriture manuscrite lisible ou des caractères dactylographiés.</li>
                    <li>La structure "Nom de l'élève" suivi de sa "note" et éventuellement sa "note de perfectionnement" doit apparaître de manière évidente.</li>
                    <li>Le serveur de calcul peut prendre de 15 à 60 secondes selon l'activité de l'instance d'hébergement.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* CHARGEMENT DURANT L'ANALYSE */}
            {scanStatus === 'analyzing' && (
              <div className="border border-slate-800 bg-[#0c111e]/20 rounded-3xl p-12 text-center space-y-6 flex flex-col items-center justify-center min-h-[360px]">
                <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin"></div>
                <div className="space-y-2">
                  <h4 className="text-lg font-extrabold text-slate-100">Analyse de l'image en cours...</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Notre algorithme extrait vos notes. {scanProgressMsg}
                  </p>
                </div>
              </div>
            )}

            {/* GESTION DES ERREURS DE SCAN */}
            {scanStatus === 'error' && (
              <div className="border border-red-500/10 bg-red-500/[0.02] rounded-3xl p-8 text-center space-y-6 flex flex-col items-center justify-center min-h-[360px]">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-slate-200">Échec du décryptage de l'image</h4>
                  <p className="text-xs text-red-400 max-w-sm mx-auto leading-relaxed">{scanErrorMsg}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={resetScan}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#141b2f] hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all"
                  >
                    Retourner au scanner
                  </button>
                  <button
                    onClick={handleAnalyzeScan}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Réessayer l'analyse
                  </button>
                </div>
              </div>
            )}

            {/* ÉTAPE DE REVUE AVANT APPLICATION DES NOTES */}
            {scanStatus === 'review' && (
              <div className="space-y-6">
                
                {/* Carte explicative */}
                <div className="bg-[#0c111e]/40 p-4 rounded-2xl border border-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-200">Notes extraites pour : {MATIERES_PRIMAIRE.find(m => m.id === scanMatiere)?.label}</h4>
                    <p className="text-xs text-slate-500">Veuillez vérifier les informations ci-dessous avant d'enregistrer ces notes dans votre livret.</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={resetScan}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#141b2f] text-slate-300 border border-slate-800 hover:bg-slate-800 transition-all"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleApplyScanResults}
                      className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-[#070b13] hover:from-emerald-400 hover:to-teal-400 transition-all shadow-lg shadow-emerald-500/10"
                    >
                      Confirmer & Enregistrer les notes
                    </button>
                  </div>
                </div>

                {/* Tableau d'édition rapide des résultats de l'IA */}
                <div className="border border-slate-800/80 rounded-2xl bg-[#0c111e]/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#0c111e]/60 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-4 text-center w-12">Importer</th>
                          <th className="py-3.5 px-4">Matricule</th>
                          <th className="py-3.5 px-4">Nom de l'élève</th>
                          <th className="py-3.5 px-4 text-center">Note Obtenue</th>
                          <th className="py-3.5 px-4 text-center">Note Perfectionnement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50 text-sm">
                        {scanResults.map(res => (
                          <tr key={res.studentId} className={`transition-colors ${res.include ? 'hover:bg-slate-800/[0.05]' : 'opacity-40 bg-slate-950/20'}`}>
                            <td className="py-3 px-4 text-center">
                              <input 
                                type="checkbox" 
                                checked={res.include} 
                                onChange={() => handleToggleInclude(res.studentId)}
                                className="w-4 h-4 text-indigo-600 border-slate-800 rounded bg-[#070b13]"
                              />
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-400">{res.matricule}</td>
                            <td className="py-3 px-4 font-semibold text-slate-200">{res.nom}</td>
                            
                            <td className="py-3 px-4 text-center">
                              <input
                                type="text"
                                value={res.note}
                                disabled={!res.include}
                                onChange={(e) => handleResultChange(res.studentId, 'note', e.target.value)}
                                className="w-20 mx-auto text-center bg-[#070b13] disabled:opacity-40 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 font-bold"
                              />
                            </td>

                            <td className="py-3 px-4 text-center">
                              <input
                                type="text"
                                value={res.perf}
                                disabled={!res.include}
                                onChange={(e) => handleResultChange(res.studentId, 'perf', e.target.value)}
                                className="w-20 mx-auto text-center bg-[#070b13] disabled:opacity-40 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 font-bold"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- CONTENU DE L'ONGLET : GESTION DES ELEVES --- */}
        {activeTab === 'eleves' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Formulaire de création / Importation d'élèves (Une colonne) */}
            <div className="space-y-6">
              
              {/* Formulaire d'ajout manuel */}
              <div className="bg-[#0c111e]/40 border border-slate-800/50 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Plus className="w-4 h-4" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">Ajouter un élève</h3>
                </div>

                <form onSubmit={handleAddStudent} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nom de famille</label>
                    <input
                      type="text"
                      placeholder="Ex: ADANZAN"
                      value={newStudentNom}
                      onChange={(e) => setNewStudentNom(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Prénoms</label>
                    <input
                      type="text"
                      placeholder="Ex: Sèmèvo Pierre"
                      value={newStudentPrenoms}
                      onChange={(e) => setNewStudentPrenoms(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Matricule (Optionnel)</label>
                    <input
                      type="text"
                      placeholder="Ex: 24-CM2-008"
                      value={newStudentMatricule}
                      onChange={(e) => setNewStudentMatricule(e.target.value)}
                      className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl text-xs font-bold bg-[#141b2f] hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    Ajouter l'élève
                  </button>
                </form>
              </div>

              {/* Module d'importation d'élèves de canevas EducMaster */}
              <div className="bg-gradient-to-br from-[#0a101d] to-[#0c1224] border border-slate-800 p-6 rounded-3xl space-y-4 shadow-lg">
                <div className="flex items-center gap-2 text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider">Importation EducMaster</h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Importez la liste d'élèves directement de votre canevas EducMaster Bénin (.csv ou .xlsx). Notre système détectera automatiquement la position des colonnes.
                </p>

                <button
                  onClick={() => importFileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#070b13] transition-all flex items-center justify-center gap-1.5"
                >
                  Sélectionner le fichier d'importation
                </button>

                <input
                  type="file"
                  ref={importFileInputRef}
                  accept=".csv,.txt,.xlsx,.xls"
                  className="hidden"
                  onChange={handleImportEducMasterFile}
                />
              </div>
            </div>

            {/* Liste d'élèves existante (Deux colonnes) */}
            <div className="md:col-span-2 border border-slate-800/80 rounded-2xl bg-[#0c111e]/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0c111e]/60 border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 w-24">N°</th>
                      <th className="py-3.5 px-4">Matricule</th>
                      <th className="py-3.5 px-4">Nom de famille</th>
                      <th className="py-3.5 px-4">Prénoms</th>
                      <th className="py-3.5 px-4 text-center">Retirer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {activeClass?.eleves.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                          Aucun élève enregistré dans cette classe.
                        </td>
                      </tr>
                    ) : (
                      activeClass?.eleves.map((el, i) => (
                        <tr key={el.id} className="hover:bg-slate-800/[0.05]">
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{i + 1}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-400">{el.matricule}</td>
                          <td className="py-3 px-4 font-extrabold text-slate-100">{el.nom}</td>
                          <td className="py-3 px-4 text-slate-300">{el.prenoms}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteStudent(el.id)}
                              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- CONTENU DE L'ONGLET : MON COMPTE / PARAMETRES --- */}
        {activeTab === 'parametres' && (
          <div className="max-w-2xl mx-auto space-y-6">
            
            {/* Profil de l'enseignant */}
            <div className="bg-[#0c111e]/40 border border-slate-800/60 p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-400">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">{user.nom}</h3>
                  <p className="text-xs text-slate-400">Enseignant de l'enseignement Primaire au Bénin</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Téléphone MoMo</p>
                  <p className="text-sm text-slate-200 font-semibold">{user.tel}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Abonnement actif</p>
                  <p className="text-sm text-slate-200 font-semibold">
                    {user.statut_abonnement === 'actif' ? `Plan ${user.plan}` : 'Démonstration Gratuite'}
                  </p>
                </div>
              </div>
            </div>

            {/* Plans d'abonnement disponibles */}
            <div className="bg-[#0c111e]/40 border border-slate-800/60 p-6 rounded-3xl space-y-6">
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white">Tarifs des licences MastaNote AI+</h3>
                <p className="text-xs text-slate-400">Accédez à l'exportation illimitée d'élèves pour toutes vos classes sans restriction.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {ABONNEMENT_PLANS.map(plan => (
                  <div key={plan.id} className="p-4 rounded-2xl border border-slate-800 bg-[#070b13]/80 space-y-4 relative">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-200">Licence {plan.label}</h4>
                      <p className="text-lg font-black text-indigo-400">{plan.prix} FCFA</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedPlanId(plan.id);
                        setPaywallModal(true);
                      }}
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#141b2f] hover:bg-indigo-600 border border-slate-800 text-white transition-all flex items-center justify-center"
                    >
                      S'abonner maintenant
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- MODAL DE CRÉATION DE CLASSE --- */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c111e] border border-slate-800/80 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold uppercase text-indigo-400 tracking-wider">Créer une classe</h3>
              <button 
                onClick={() => setShowAddClassModal(false)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nom de la classe</label>
                <input
                  type="text"
                  placeholder="Ex: CM2 Émeraude"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Niveau scolaire au Bénin</label>
                <select
                  value={newClassNiveau}
                  onChange={(e) => setNewClassNiveau(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                >
                  {CLASSES_PRIMAIRE.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl text-xs font-bold bg-[#141b2f] hover:bg-indigo-600 border border-slate-800 hover:border-indigo-500 text-white transition-all flex items-center justify-center"
              >
                Créer la classe
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL / PAYWALL KKIAPAY --- */}
      {paywallModal && (
        <div className="fixed inset-0 z-50 bg-[#070b13]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c111e] border border-slate-800/80 rounded-3xl max-w-sm w-full p-6 space-y-6 shadow-2xl">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-orange-400">
                <Lock className="w-4 h-4" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider">Abonnement requis</h3>
              </div>
              <button 
                onClick={() => {
                  setPaywallModal(false);
                  setPaymentStep('form');
                }}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Annuler
              </button>
            </div>

            {paymentStep === 'form' && (
              <form onSubmit={handleInitiatePayment} className="space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  L'exportation des notes au format d'import de canevas EducMaster Bénin est réservée aux abonnés.
                </p>

                {/* Sélecteur de formules de tarification */}
                <div className="grid grid-cols-2 gap-3">
                  {ABONNEMENT_PLANS.map(plan => (
                    <button
                      type="button"
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        selectedPlanId === plan.id
                          ? 'border-indigo-500 bg-indigo-500/[0.03] text-indigo-400'
                          : 'border-slate-800 hover:bg-slate-800/50 text-slate-400'
                      }`}
                    >
                      <h4 className="text-xs font-bold">{plan.label}</h4>
                      <p className="text-sm font-black mt-0.5">{plan.prix} F</p>
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Téléphone de Paiement (MoMo MTN/Moov)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="Ex: 0197000000"
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500 placeholder-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-lg shadow-indigo-600/15 transition-all flex items-center justify-center gap-1"
                >
                  <CreditCard className="w-4 h-4" /> Procéder au paiement
                </button>
              </form>
            )}

            {paymentStep === 'processing' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin mx-auto"></div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-slate-200">Validation en cours...</h4>
                  <p className="text-xs text-slate-500">Validez la transaction sur votre téléphone via l'invite MoMo.</p>
                </div>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="text-center py-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">Abonnement activé !</h4>
                  <p className="text-xs text-slate-500">L'exportation EducMaster Bénin est maintenant totalement débloquée.</p>
                </div>
                <button
                  onClick={() => {
                    setPaywallModal(false);
                    setPaymentStep('form');
                  }}
                  className="px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                >
                  Super, merci !
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}