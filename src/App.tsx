import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpen, Users, Plus, Download, Mic, MicOff, CheckCircle, CreditCard,
  TrendingUp, Award, AlertTriangle, FileSpreadsheet, Trash2, ChevronRight,
  ArrowLeft, Settings, Lock, Check, Camera, Sparkles, Image as ImageIcon,
  RotateCcw, Upload, Library
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

const ABONNEMENT_PLANS = [
  {
    id: '1an', label: '1 An', tagline: 'Formule Découverte', duree_mois: 12, prix: 1500,
    chariowProductId: 'prd_z2kjla30',
    chariowCheckoutUrl: 'https://soudoboutik-ebook.mychariow.shop/prd_z2kjla30/checkout',
    premiumFiches: false,
    avantages: ['Export illimité EducMaster CSV', 'Saisie Vocale et Scanner IA illimités', 'Support technique par e-mail']
  },
  {
    id: '3ans', label: '3 Ans', tagline: 'Formule Sérénité', duree_mois: 36, prix: 3000,
    chariowProductId: 'prd_6duiuhl1',
    chariowCheckoutUrl: 'https://soudoboutik-ebook.mychariow.shop/prd_6duiuhl1/checkout',
    premiumFiches: false,
    avantages: ['Tout de la formule 1 An', 'Support technique prioritaire', 'Mises à jour applicatives incluses']
  },
  {
    id: '5ans', label: '5 Ans VIP', tagline: 'VIP Premium', duree_mois: 60, prix: 5000,
    chariowProductId: 'prd_s877x4vl',
    chariowCheckoutUrl: 'https://soudoboutik-ebook.mychariow.shop/prd_s877x4vl/checkout',
    premiumFiches: true,
    avantages: ['Tout de la formule 3 Ans', 'Bibliothèque de fiches pédagogiques', 'Support ultra-prioritaire']
  }
];

const SCAN_API_URL = 'https://mastanote-backend-j9hh.onrender.com/api/scan';
const LICENSE_API_URL = 'https://mastanote-backend-j9hh.onrender.com/api/validate-license';
const FICHES_PEDAGOGIQUES_URL = 'https://votre-espace-de-stockage-fiches.com/ressources';

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

// --- PERSISTANCE LOCALE (localStorage) ---
// Clé unique versionnée : si un jour la structure des données change,
// on peut incrémenter "v1" pour éviter de charger un format obsolète.
const STORAGE_KEY = 'mastanote-ai-state-v1';

const loadPersistedState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Impossible de lire les données sauvegardées :", err);
    return null;
  }
};

export default function App() {
  const persisted = loadPersistedState();

  // --- ÉTATS ---
  const [user, setUser] = useState(persisted?.user || {
    nom: 'Enseignant Bénin',
    tel: '0197000000',
    statut_abonnement: 'demo',
    planId: null,
    plan: null,
    expireLe: null
  });

  const [classes, setClasses] = useState(persisted?.classes || [
    { id: 'class-1', nom: 'CM2 Émeraude', niveau: 'CM2', eleves: ELEVES_INITIAL_CM2 }
  ]);
  const [selectedClassId, setSelectedClassId] = useState('class-1');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeMatiere, setActiveMatiere] = useState('maths');

  const [notes, setNotes] = useState(persisted?.notes || {
    'class-1': {
      'maths': {
        '1': { note: 14, perf: 15 }, '2': { note: 8.5, perf: 10 }, '3': { note: 16, perf: 16 },
        '4': { note: 10, perf: 12 }, '5': { note: 18, perf: 18 }
      },
      'dictee': {
        '1': { note: 12, perf: 14 }, '2': { note: 9, perf: 11 }, '3': { note: 15, perf: 15 }
      }
    }
  });

  // Sauvegarde automatique à chaque changement de classes/notes/user.
  // Un debounce léger (300ms) évite d'écrire à chaque frappe de clavier.
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, classes, notes }));
      } catch (err) {
        console.error("Impossible de sauvegarder les données :", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [user, classes, notes]);

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

  const triggerNotif = (message, type = 'success') => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 4000);
  };

  // --- DÉTECTION D'UNE NOUVELLE VERSION DE L'APPLICATION (PWA) ---
  useEffect(() => {
    const handleUpdateAvailable = (e) => {
      setUpdateInfo({ activateUpdate: e.detail.activateUpdate });
    };
    window.addEventListener('mastanote-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('mastanote-update-available', handleUpdateAvailable);
  }, []);

  // --- INITIALISATION DE L'API VOCALE ---
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
    rec.onresult = (event) => {
      const text = event.results[0][0].transcript;
      processVoiceCommand(text);
    };
    rec.onerror = () => {
      setVoiceStatus("Une erreur est survenue lors de l'écoute.");
      setIsListening(false);
    };
    rec.onend = () => setIsListening(false);

    recognitionRef.current = rec;

    return () => {
      rec.onstart = null; rec.onresult = null; rec.onerror = null; rec.onend = null;
      try { rec.stop(); } catch (e) { /* déjà arrêté */ }
    };
  }, [selectedClassId, activeMatiere, currentSaisieIndex]);

  const processVoiceCommand = (text) => {
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
    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  const activeClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const activeEleve = activeClass?.eleves[currentSaisieIndex];

  useEffect(() => {
    if (activeClass && activeEleve) {
      const currentNotes = notes[selectedClassId]?.[activeMatiere]?.[activeEleve.id] || { note: '', perf: '' };
      setTempNote(currentNotes.note !== undefined ? currentNotes.note.toString() : '');
      setTempPerf(currentNotes.perf !== undefined ? currentNotes.perf.toString() : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handlePrev = () => {
    if (currentSaisieIndex > 0) setCurrentSaisieIndex(prev => prev - 1);
  };

  const handleCreateClass = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newClassName.trim()) return;

    const newClass = { id: `class-${Date.now()}`, nom: newClassName, niveau: newClassNiveau, eleves: [] };

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
    if (!confirm(`Voulez-vous vraiment supprimer la classe "${activeClass.nom}" et toutes ses notes ? Cette action est irréversible.`)) return;

    const remaining = classes.filter(c => c.id !== activeClass.id);
    setClasses(remaining);
    setNotes(prev => {
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

  const handleAddStudent = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newStudentNom.trim() || !newStudentPrenoms.trim()) {
      triggerNotif("Veuillez remplir le nom et le prénom de l'élève.", 'error');
      return;
    }

    const matriculeGenere = newStudentMatricule.trim() || generateUniqueMatricule();
    const newStudent = {
      id: `student-${Date.now()}`, matricule: matriculeGenere,
      nom: newStudentNom.toUpperCase(), prenoms: newStudentPrenoms
    };

    setClasses(prev => prev.map(c => c.id === selectedClassId ? { ...c, eleves: [...c.eleves, newStudent] } : c));

    setNewStudentNom('');
    setNewStudentPrenoms('');
    setNewStudentMatricule('');
    triggerNotif(`${newStudent.nom} ajouté à la classe !`);
  };

  const handleDeleteStudent = (studentId) => {
    setClasses(prev => prev.map(c => c.id === selectedClassId
      ? { ...c, eleves: c.eleves.filter(e => e.id !== studentId) }
      : c
    ));
    triggerNotif("Élève retiré de la classe.");
  };

  const normalizeHeader = (s) => (s ?? '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const detectColumns = (headerRow) => {
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

  const rowsFromCsvText = (rawText) => {
    const lines = rawText.split(/\r\n|\n|\r/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];
    const headerLine = lines[0];
    const counts = {
      ',': (headerLine.match(/,/g) || []).length,
      ';': (headerLine.match(/;/g) || []).length,
      '\t': (headerLine.match(/\t/g) || []).length
    };
    const separator = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const cleanCell = (cell) => cell.trim().replace(/^"+|"+$/g, '').trim();
    return lines.map(line => line.split(separator).map(cleanCell));
  };

  const rowsFromWorkbook = (arrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let chosenSheetName = workbook.SheetNames[0];
    for (const sheetName of workbook.SheetNames) {
      const preview = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' });
      const headerRow = preview[0] || [];
      if (headerRow.some(h => normalizeHeader(h).includes('matricule'))) {
        chosenSheetName = sheetName;
        break;
      }
    }
    const sheet = workbook.Sheets[chosenSheetName];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  };

  const studentsFromRows = (rows) => {
    if (!rows || rows.length < 2) return [];
    const cols = detectColumns(rows[0]);
    const students = [];
    rows.slice(1).forEach((row) => {
      if (!row || row.length === 0) return;
      const matricule = (row[cols.matricule] ?? '').toString().trim();
      const nom = (row[cols.nom] ?? '').toString().trim();
      const prenoms = (row[cols.prenoms] ?? '').toString().trim();
      if (!matricule || !nom) return;
      students.push({
        id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        matricule, nom: nom.toUpperCase(), prenoms
      });
    });
    return students;
  };

  const applyImportedStudents = (imported) => {
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
      setNotes(prev => ({ ...prev, [selectedClassId]: {} }));
      setCurrentSaisieIndex(0);
    }

    triggerNotif(`${imported.length} élève(s) importé(s) avec succès depuis le fichier EducMaster !`, 'success');
  };

  const handleImportEducMasterFile = (e) => {
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
    reader.onerror = () => triggerNotif("Impossible de lire ce fichier.", 'error');

    if (isExcel) {
      reader.onload = () => {
        try {
          const rows = rowsFromWorkbook(reader.result);
          applyImportedStudents(studentsFromRows(rows));
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
          applyImportedStudents(studentsFromRows(rowsFromCsvText(text)));
        } catch (err) {
          console.error(err);
          triggerNotif("Erreur lors de la lecture du fichier. Vérifiez qu'il s'agit bien d'un export EducMaster valide.", 'error');
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const getClassStats = () => {
    if (!activeClass || activeClass.eleves.length === 0) return { moyenne: 0, taux: 0, top: '-', flop: '-' };
    const matNotes = notes[selectedClassId]?.[activeMatiere] || {};
    let total = 0, count = 0, admis = 0, maxNote = -1, minNote = 21, topStudent = '-', flopStudent = '-';

    activeClass.eleves.forEach(el => {
      const studentNoteData = matNotes[el.id];
      if (studentNoteData && studentNoteData.note !== undefined) {
        const n = studentNoteData.note;
        total += n; count++;
        if (n >= 10) admis++;
        if (n > maxNote) { maxNote = n; topStudent = `${el.nom} ${el.prenoms}`; }
        if (n < minNote) { minNote = n; flopStudent = `${el.nom} ${el.prenoms}`; }
      }
    });

    return {
      moyenne: count > 0 ? (total / count).toFixed(2) : '0.00',
      taux: count > 0 ? Math.round((admis / count) * 100) : 0,
      top: maxNote !== -1 ? `${topStudent} (${maxNote}/20)` : '-',
      flop: minNote !== 21 ? `${flopStudent} (${minNote}/20)` : '-',
      saisis: count, totalEleves: activeClass.eleves.length
    };
  };

  const stats = getClassStats();

  const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

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
      csvContent += `,${escapeCsv(m.label + ' - Note')},${escapeCsv(m.label + ' - Perfectionnement')}`;
    });
    csvContent += "\n";

    activeClass.eleves.forEach(el => {
      let row = `${escapeCsv(el.matricule)},${escapeCsv(el.nom)},${escapeCsv(el.prenoms)}`;
      MATIERES_PRIMAIRE.forEach(m => {
        const studentNote = notes[selectedClassId]?.[m.id]?.[el.id] || {};
        row += `,${studentNote.note !== undefined ? studentNote.note : ""},${studentNote.perf !== undefined ? studentNote.perf : ""}`;
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

  const computeExpirationLabel = (isoDateString, dureeMoisFallback) => {
    let d = null;
    if (isoDateString) {
      const parsed = new Date(isoDateString);
      if (!isNaN(parsed.getTime())) d = parsed;
    }
    if (!d) {
      d = new Date();
      d.setMonth(d.getMonth() + (dureeMoisFallback || 12));
    }
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleActivateLicense = async () => {
    const key = licenseKeyInput.trim();
    if (!key) {
      setActivationStatus('error');
      setActivationMessage("Veuillez saisir votre clé de licence reçue par e-mail.");
      return;
    }

    setActivationStatus('validating');
    setActivationMessage("Vérification de votre licence...");

    try {
      const response = await fetch(LICENSE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        setActivationStatus('error');
        setActivationMessage(data.message || "Clé invalide ou expirée. Vérifiez votre e-mail de confirmation Chariow.");
        return;
      }

      const plan = ABONNEMENT_PLANS.find(p => p.chariowProductId === data.productId) || null;

      setUser(prev => ({
        ...prev,
        statut_abonnement: 'actif',
        planId: plan ? plan.id : null,
        plan: plan ? plan.label : 'Licence active',
        expireLe: computeExpirationLabel(data.expiresAt, plan ? plan.duree_mois : 12)
      }));

      setActivationStatus('success');
      setActivationMessage('Licence activée avec succès !');

      setTimeout(() => {
        setPaywallModal(false);
        setActivationStatus('idle');
        setActivationMessage('');
        setLicenseKeyInput('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setActivationStatus('error');
      setActivationMessage("Erreur réseau. Vérifiez votre connexion internet et réessayez.");
    }
  };

  const resetScan = () => {
    setScanImage(null);
    setScanStatus('idle');
    setScanResults([]);
    setScanErrorMsg('');
  };

  const handleScanFileSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerNotif("Veuillez sélectionner un fichier image.", 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      setScanImage({ base64, mediaType: file.type, previewUrl: result });
      setScanStatus('idle');
      setScanResults([]);
      setScanErrorMsg('');
    };
    reader.onerror = () => triggerNotif("Impossible de lire cette image.", 'error');
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
      const roster = activeClass.eleves.map(el => `${el.matricule} | ${el.nom} ${el.prenoms}`).join('\n');
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
        body: JSON.stringify({ imageBase64: scanImage.base64, mediaType: scanImage.mediaType, promptText }),
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
          studentId: el.id, matricule: el.matricule, nom: `${el.nom} ${el.prenoms}`,
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
    } catch (err) {
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

  const updateScanResultField = (studentId, field, value) => {
    setScanResults(prev => prev.map(r => r.studentId === studentId ? { ...r, [field]: value } : r));
  };

  const handleApplyScanResults = () => {
    const toApply = scanResults.filter(r => r.include && r.note !== '');
    if (toApply.length === 0) {
      triggerNotif("Aucune note cochée à enregistrer.", 'error');
      return;
    }

    for (const r of toApply) {
      const n = parseFloat(r.note);
      if (isNaN(n) || n < 0 || n > 20) {
        triggerNotif(`Note invalide pour ${r.nom} (doit être entre 0 et 20).`, 'error');
        return;
      }
      if (r.perf !== '') {
        const p = parseFloat(r.perf);
        if (isNaN(p) || p < 0 || p > 20) {
          triggerNotif(`Note de perfectionnement invalide pour ${r.nom} (doit être entre 0 et 20).`, 'error');
          return;
        }
      }
    }

    setNotes(prev => {
      const classData = { ...(prev[selectedClassId] || {}) };
      const matiereData = { ...(classData[scanMatiere] || {}) };
      toApply.forEach(r => {
        matiereData[r.studentId] = {
          note: parseFloat(r.note),
          perf: r.perf !== '' ? parseFloat(r.perf) : undefined
        };
      });
      classData[scanMatiere] = matiereData;
      return { ...prev, [selectedClassId]: classData };
    });

    triggerNotif(`${toApply.length} note(s) enregistrée(s) pour ${MATIERES_PRIMAIRE.find(m => m.id === scanMatiere)?.label}.`, 'success');
    resetScan();
  };

  const handleOpenFiches = () => {
    if (!isPremiumPlan) {
      triggerNotif("Les fiches pédagogiques sont réservées à la formule 5 Ans VIP.", 'error');
      setPaywallModal(true);
      return;
    }
    window.open(FICHES_PEDAGOGIQUES_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">

      {updateInfo && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-[92vw] max-w-md bg-slate-950 border border-indigo-500/40 shadow-2xl rounded-2xl px-4 py-3.5 flex items-center gap-3">
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 p-2 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">Nouvelle version disponible</p>
            <p className="text-[11px] text-slate-400">Rechargez pour profiter des dernières améliorations.</p>
          </div>
          <button
            onClick={() => { updateInfo.activateUpdate(); setUpdateInfo(null); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shrink-0 transition-colors"
          >Recharger</button>
          <button
            onClick={() => setUpdateInfo(null)}
            className="text-slate-500 hover:text-slate-300 text-lg font-bold px-1 shrink-0"
            title="Plus tard"
          >✕</button>
        </div>
      )}

      {notif && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border text-sm transition-all duration-300 animate-bounce max-w-[90vw] ${
          notif.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-200' : 'bg-rose-950 border-rose-500 text-rose-200'
        }`}>
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{notif.message}</span>
        </div>
      )}

      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 px-4 py-3 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2.5 rounded-xl shadow-md shadow-indigo-900/30">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
                  MastaNote AI+
                </h1>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  Primaire CI-CM2
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Révolution EducMaster Bénin</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPremiumPlan && (
              <button
                onClick={handleOpenFiches}
                className="hidden sm:flex bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-1.5 rounded-xl items-center gap-1.5 font-semibold hover:bg-amber-500/20 transition-colors"
                title="Bibliothèque de fiches pédagogiques (VIP)"
              >
                <Library className="w-3.5 h-3.5" />
                Fiches VIP
              </button>
            )}

            {user.statut_abonnement === 'demo' ? (
              <button
                onClick={() => setPaywallModal(true)}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 hover:opacity-95 transition-all shadow-lg shadow-orange-500/10"
              >
                <Lock className="w-3.5 h-3.5" />
                Débloquer l'Export
              </button>
            ) : (
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                Premium ({user.plan})
              </span>
            )}

            <button
              onClick={() => setActiveTab('parametres')}
              className={`p-2 rounded-xl border transition-colors ${activeTab === 'parametres' ? 'bg-slate-800 border-slate-700 text-white' : 'border-slate-800 hover:bg-slate-900 text-slate-400'}`}
              title="Paramètres"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <section className="bg-slate-950/50 border-b border-slate-800/80 px-4 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full max-w-xs">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">Classe :</span>
            <select
              value={selectedClassId}
              onChange={(e) => { setSelectedClassId(e.target.value); setCurrentSaisieIndex(0); }}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-full"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDeleteClass}
              className="bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-800 text-xs text-rose-400 font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
              title="Supprimer la classe active"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
            <button
              onClick={() => setShowAddClassModal(true)}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-indigo-400 font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouvelle classe</span>
            </button>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col gap-6">

        {showAddClassModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
                <Plus className="text-indigo-400" />
                Créer une nouvelle classe
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nom de la classe (ex: CM2 Diamant)</label>
                  <input
                    type="text" required placeholder="Saisissez le nom"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Niveau d'études (EducMaster)</label>
                  <select
                    value={newClassNiveau}
                    onChange={(e) => setNewClassNiveau(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    {CLASSES_PRIMAIRE.map(lvl => (<option key={lvl} value={lvl}>{lvl}</option>))}
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setShowAddClassModal(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Annuler</button>
                  <button type="button" onClick={handleCreateClass} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2 rounded-xl transition-colors">Créer la classe</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {paywallModal && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-4xl shadow-2xl relative my-8">
              <button
                onClick={() => { setPaywallModal(false); setActivationStatus('idle'); setActivationMessage(''); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
              >✕</button>

              <div className="text-center mb-6">
                <div className="inline-flex bg-amber-500/10 text-amber-500 border border-amber-500/20 p-3 rounded-2xl mb-3">
                  <CreditCard className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-2xl text-white">Rejoignez MastaNote AI+</h3>
                <p className="text-sm text-slate-400 mt-1">Choisissez votre formule ci-dessous. Le paiement se fait sur la page sécurisée Chariow.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {ABONNEMENT_PLANS.map(plan => (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl p-5 border flex flex-col ${
                      plan.premiumFiches ? 'bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/20' : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    {plan.premiumFiches && (
                      <span className="absolute -top-3 right-4 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">Meilleur choix</span>
                    )}
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{plan.tagline}</span>
                    <p className={`text-2xl font-black mt-1.5 ${plan.premiumFiches ? 'text-amber-400' : 'text-white'}`}>
                      {plan.prix.toLocaleString('fr-FR')} F
                      <span className="text-xs font-medium text-slate-500"> / {plan.label}</span>
                    </p>
                    <ul className="text-xs text-slate-300 space-y-1.5 mt-4 mb-5 flex-1">
                      {plan.avantages.map((av, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{av}</span>
                        </li>
                      ))}
                    </ul>
                    <a
                      href={plan.chariowCheckoutUrl} target="_blank" rel="noopener noreferrer"
                      className={`text-center text-sm font-bold py-2.5 rounded-xl transition-all ${
                        plan.premiumFiches ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:opacity-95' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >S'abonner ({plan.label})</a>
                  </div>
                ))}
              </div>

              <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800/80 max-w-lg mx-auto">
                <h4 className="font-bold text-white text-sm mb-1">Vous avez déjà payé sur Chariow ?</h4>
                <p className="text-xs text-slate-400 mb-4">Saisissez la clé de licence reçue par e-mail après votre paiement pour l'activer ici.</p>

                <div className="flex gap-2">
                  <input
                    type="text" placeholder="Ex : ABC-123-XYZ-789"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    disabled={activationStatus === 'validating'}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-sm font-mono text-center tracking-wider focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                  <button
                    onClick={handleActivateLicense}
                    disabled={activationStatus === 'validating'}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {activationStatus === 'validating' && (
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    )}
                    Activer
                  </button>
                </div>

                {activationMessage && (
                  <p className={`text-xs font-medium mt-2.5 ${
                    activationStatus === 'success' ? 'text-emerald-400' :
                    activationStatus === 'error' ? 'text-rose-400' : 'text-slate-400'
                  }`}>{activationMessage}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex border-b border-slate-800/80 overflow-x-auto whitespace-nowrap scrollbar-hide gap-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'dashboard' ? 'border-indigo-500 text-white bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Tableau de bord
          </button>
          <button
            onClick={() => {
              if (activeClass?.eleves.length > 0) setActiveTab('saisie');
              else { triggerNotif("Veuillez d'abord ajouter des élèves à votre classe.", "error"); setActiveTab('eleves'); }
            }}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'saisie' ? 'border-indigo-500 text-white bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4 text-indigo-400" />
            Saisie Express (Vocal)
          </button>
          <button
            onClick={() => {
              if (activeClass?.eleves.length > 0) setActiveTab('scan');
              else { triggerNotif("Veuillez d'abord ajouter des élèves à votre classe.", "error"); setActiveTab('eleves'); }
            }}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'scan' ? 'border-indigo-500 text-white bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4 text-indigo-400" />
            Scanner IA (Photo)
          </button>
          <button
            onClick={() => setActiveTab('eleves')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'eleves' ? 'border-indigo-500 text-white bg-slate-900/40' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Liste des Élèves ({activeClass?.eleves.length || 0})
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <FileSpreadsheet className="w-64 h-64" />
              </div>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                  <h2 className="font-extrabold text-xl sm:text-2xl text-white">Classe active : {activeClass?.nom}</h2>
                  <p className="text-slate-400 text-sm mt-1">Saisissez les notes puis générez le fichier compatible avec le portail officiel EducMaster Bénin.</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl font-medium">{activeClass?.eleves.length || 0} Élèves</span>
                    <span className="bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl font-medium">Niveau {activeClass?.niveau}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => setActiveTab('scan')} className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    <Camera className="w-4 h-4" />
                    Scanner une feuille
                  </button>
                  <button onClick={exportToEducMaster} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/10">
                    <Download className="w-4 h-4" />
                    Exporter EducMaster (.csv)
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aperçu rapide par matière</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {MATIERES_PRIMAIRE.map(m => (
                  <button
                    key={m.id} onClick={() => setActiveMatiere(m.id)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border shrink-0 transition-all ${
                      activeMatiere === m.id ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-300'
                    }`}
                  >{m.label}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><TrendingUp className="w-6 h-6" /></div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Moyenne de classe</p>
                  <p className="text-2xl font-black text-white">{stats.moyenne} <span className="text-xs font-medium text-slate-400">/20</span></p>
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><Award className="w-6 h-6" /></div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Taux de réussite</p>
                  <p className="text-2xl font-black text-white">{stats.taux}%</p>
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400"><Users className="w-6 h-6" /></div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Progression saisie</p>
                  <p className="text-2xl font-black text-white">{stats.saisis} <span className="text-xs font-medium text-slate-400">/ {stats.totalEleves}</span></p>
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800/80 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-indigo-600/10 rounded-xl text-indigo-400"><Award className="w-6 h-6" /></div>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase">Premier de la classe</p>
                  <p className="text-sm font-bold text-white truncate max-w-[150px]" title={stats.top}>{stats.top}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 lg:col-span-2">
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <FileSpreadsheet className="text-indigo-400 w-5 h-5" />
                  Notes de {MATIERES_PRIMAIRE.find(m => m.id === activeMatiere)?.label}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 text-xs uppercase font-bold">
                      <tr>
                        <th className="px-4 py-3 rounded-l-xl">Matricule</th>
                        <th className="px-4 py-3">Élève</th>
                        <th className="px-4 py-3 text-center">Note obtenue (/20)</th>
                        <th className="px-4 py-3 text-center">Note Perf (/20)</th>
                        <th className="px-4 py-3 text-center rounded-r-xl">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {activeClass?.eleves.map(el => {
                        const noteData = notes[selectedClassId]?.[activeMatiere]?.[el.id] || {};
                        const n = noteData.note;
                        const p = noteData.perf;
                        return (
                          <tr key={el.id} className="hover:bg-slate-900/40">
                            <td className="px-4 py-3 text-xs font-semibold text-slate-400">{el.matricule}</td>
                            <td className="px-4 py-3 font-semibold text-white">{el.nom} {el.prenoms}</td>
                            <td className="px-4 py-3 text-center font-black">
                              {n !== undefined ? (<span className={n >= 10 ? 'text-emerald-400' : 'text-rose-400'}>{n}</span>) : (<span className="text-slate-600">-</span>)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {p !== undefined ? <span className="text-indigo-300">{p}</span> : <span className="text-slate-600">-</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {n !== undefined ? (
                                n >= 10 ? (<span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Moyen</span>)
                                  : (<span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">Faible</span>)
                              ) : (<span className="text-xs text-slate-500 italic">Non saisi</span>)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="text-amber-500 w-5 h-5" />
                    Diagnostics
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Les indicateurs ci-dessous révèlent la performance d'apprentissage pour la matière <strong className="text-indigo-300">{MATIERES_PRIMAIRE.find(m => m.id === activeMatiere)?.label}</strong>.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Premier de Classe</p>
                    <p className="text-sm font-extrabold text-indigo-400 mt-1">{stats.top}</p>
                  </div>
                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase">Dernier de Classe</p>
                    <p className="text-sm font-extrabold text-rose-400 mt-1">{stats.flop}</p>
                  </div>
                </div>
                <div className="bg-indigo-950/20 border border-indigo-500/10 p-3 rounded-xl text-center">
                  <p className="text-[10px] text-slate-400">Rappel EducMaster</p>
                  <p className="text-[11px] font-semibold text-slate-300 mt-1">L'importation de notes requiert impérativement les deux notes (Note obtenue + Perfectionnement) pour chaque élève.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'saisie' && activeClass?.eleves.length > 0 && (
          <div className="max-w-xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={() => setActiveTab('dashboard')} className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm font-medium">
                <ArrowLeft className="w-4 h-4" />
                Retour au tableau de bord
              </button>
              <span className="text-xs text-slate-400 font-semibold bg-slate-950 border border-slate-800 px-3 py-1 rounded-full">
                {currentSaisieIndex + 1} / {activeClass.eleves.length} élèves
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-2xl">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-1">Matière de saisie</label>
              <select
                value={activeMatiere}
                onChange={(e) => { setActiveMatiere(e.target.value); setCurrentSaisieIndex(0); }}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                {MATIERES_PRIMAIRE.map(m => (<option key={m.id} value={m.id}>{m.label}</option>))}
              </select>
            </div>

            <div className="bg-gradient-to-tr from-slate-950 to-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl" />
              <div className="text-center space-y-1 mb-6">
                <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
                  Matricule : {activeEleve?.matricule || '-'}
                </span>
                <h3 className="text-2xl font-black text-white pt-2">{activeEleve?.nom}</h3>
                <p className="text-indigo-400 text-sm font-semibold">{activeEleve?.prenoms}</p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3 text-center">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contrôle de saisie vocale IA</span>
                  {isListening && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={toggleListening}
                    className={`p-4 rounded-full shadow-lg transition-all ${
                      isListening ? 'bg-rose-600 text-white animate-pulse shadow-rose-900/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/20'
                    }`}
                  >
                    {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-300">{voiceStatus}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Note Obtenue</label>
                  <input
                    type="number" step="0.25" min="0" max="20" placeholder="Note /20"
                    value={tempNote} onChange={(e) => setTempNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-center text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Perfectionnement</label>
                  <input
                    type="number" step="0.25" min="0" max="20" placeholder="Soin /20"
                    value={tempPerf} onChange={(e) => setTempPerf(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-center text-xl font-black text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mt-6 pt-2">
                <button
                  onClick={handlePrev} disabled={currentSaisieIndex === 0}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-semibold py-3.5 rounded-xl border border-slate-800 disabled:opacity-40 transition-colors"
                >Précédent</button>
                <button
                  onClick={handleSaveCurrentAndNext}
                  className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-1.5 transition-colors"
                >Enregistrer & Suivant<ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>

            <p className="text-center text-[10px] text-slate-500">
              Matière de saisie en cours : <strong className="text-slate-400">{MATIERES_PRIMAIRE.find(m => m.id === activeMatiere)?.label}</strong>
            </p>
          </div>
        )}

        {activeTab === 'scan' && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <div className="flex items-center justify-between">
              <button onClick={() => setActiveTab('dashboard')} className="text-slate-400 hover:text-white flex items-center gap-1.5 text-sm font-medium">
                <ArrowLeft className="w-4 h-4" />
                Retour au tableau de bord
              </button>
            </div>

            <div className="bg-gradient-to-tr from-slate-950 to-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="text-center space-y-1">
                <div className="inline-flex bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 p-3 rounded-2xl mb-1">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-white">Scanner IA de feuilles de notes</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">Prenez une photo (ou importez une image) d'une feuille de notes manuscrite ou imprimée : l'IA identifie les élèves et remplit les notes automatiquement.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-1">Matière concernée</label>
                <select
                  value={scanMatiere} onChange={(e) => setScanMatiere(e.target.value)} disabled={scanStatus === 'review'}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
                >
                  {MATIERES_PRIMAIRE.map(m => (<option key={m.id} value={m.id}>{m.label}</option>))}
                </select>
              </div>

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleScanFileSelected} className="hidden" />
              <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleScanFileSelected} className="hidden" />

              {!scanImage && (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => cameraInputRef.current?.click()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                    <Camera className="w-6 h-6" />
                    Prendre une photo
                  </button>
                  <button onClick={() => galleryInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors">
                    <ImageIcon className="w-6 h-6" />
                    Choisir un fichier
                  </button>
                </div>
              )}

              {scanImage && scanStatus !== 'review' && (
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                    <img src={scanImage.previewUrl} alt="Feuille de notes à analyser" className="w-full max-h-80 object-contain" />
                  </div>
                  {scanStatus === 'error' && (
                    <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      {scanErrorMsg}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={resetScan} disabled={scanStatus === 'analyzing'}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-semibold py-3 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Changer de photo
                    </button>
                    <button
                      onClick={handleAnalyzeScan} disabled={scanStatus === 'analyzing'}
                      className="flex-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white text-sm font-bold py-3 px-6 rounded-xl shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                    >
                      {scanStatus === 'analyzing' ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Analyser avec l'IA
                        </>
                      )}
                    </button>
                  </div>
                  {scanStatus === 'analyzing' && scanProgressMsg && (
                    <p className="text-center text-xs text-slate-400 italic">{scanProgressMsg}</p>
                  )}
                </div>
              )}

              {scanStatus === 'review' && (
                <div className="space-y-4">
                  <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                    <img src={scanImage.previewUrl} alt="Feuille de notes analysée" className="w-full max-h-56 object-contain" />
                  </div>
                  <div className="bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3 text-xs text-slate-300">
                    Vérifiez les notes détectées ci-dessous avant d'enregistrer. Décochez ou corrigez une ligne si besoin.
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-bold">
                        <tr>
                          <th className="px-3 py-2">✓</th>
                          <th className="px-3 py-2">Élève</th>
                          <th className="px-3 py-2 text-center">Note</th>
                          <th className="px-3 py-2 text-center">Perf</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {scanResults.map(r => (
                          <tr key={r.studentId} className={r.include ? '' : 'opacity-50'}>
                            <td className="px-3 py-2">
                              <input type="checkbox" checked={r.include} onChange={(e) => updateScanResultField(r.studentId, 'include', e.target.checked)} className="w-4 h-4 accent-indigo-500" />
                            </td>
                            <td className="px-3 py-2 font-semibold text-white whitespace-normal">{r.nom}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number" min="0" max="20" step="0.25" value={r.note}
                                onChange={(e) => updateScanResultField(r.studentId, 'note', e.target.value)}
                                className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center text-white focus:outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number" min="0" max="20" step="0.25" value={r.perf}
                                onChange={(e) => updateScanResultField(r.studentId, 'perf', e.target.value)}
                                className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-center text-indigo-300 focus:outline-none focus:border-indigo-500"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={resetScan} className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-semibold py-3 rounded-xl transition-colors">Annuler</button>
                    <button onClick={handleApplyScanResults} className="flex-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-sm py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/10 hover:opacity-95 transition-all">Enregistrer les notes cochées</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'eleves' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-violet-950 via-slate-900 to-slate-950 border border-violet-500/20 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-violet-500/10 border border-violet-500/20 text-violet-400 p-3 rounded-2xl shrink-0">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm sm:text-md">Importation Rapide EducMaster</h4>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-md">Importez directement le canevas EducMaster (.csv, .txt, .xlsx ou .xls) prérempli avec la liste de vos élèves — sans ressaisie manuelle.</p>
                </div>
              </div>
              <input
                ref={importFileInputRef} type="file"
                accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleImportEducMasterFile} className="hidden"
              />
              <button
                onClick={() => importFileInputRef.current?.click()}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-violet-900/30 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Importer le fichier EducMaster
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
                <h4 className="font-bold text-white text-md flex items-center gap-2">
                  <Plus className="text-indigo-400" />
                  Ajouter un élève
                </h4>
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Nom de famille</label>
                    <input
                      type="text" required placeholder="Saisissez en majuscules"
                      value={newStudentNom} onChange={(e) => setNewStudentNom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Prénoms</label>
                    <input
                      type="text" required placeholder="Saisissez les prénoms"
                      value={newStudentPrenoms} onChange={(e) => setNewStudentPrenoms(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Numéro Matricule (EducMaster - Optionnel)</label>
                    <input
                      type="text" placeholder="Automatique si vide"
                      value={newStudentMatricule} onChange={(e) => setNewStudentMatricule(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="button" onClick={handleAddStudent}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-indigo-900/30"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter à la classe
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-white text-md flex items-center gap-2">
                    <Users className="text-indigo-400 w-5 h-5" />
                    Élèves inscrits ({activeClass?.eleves.length || 0})
                  </h4>
                  <span className="text-xs text-slate-500">Niveau : {activeClass?.niveau}</span>
                </div>

                {activeClass?.eleves.length === 0 ? (
                  <div className="text-center py-12 space-y-2 border border-dashed border-slate-800 rounded-xl">
                    <p className="text-sm text-slate-400 font-medium">Aucun élève inscrit dans cette classe.</p>
                    <p className="text-xs text-slate-600">Saisissez vos élèves un par un via le formulaire de gauche, ou importez le fichier EducMaster ci-dessus.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-900 text-slate-400 text-xs uppercase font-bold">
                        <tr>
                          <th className="px-4 py-3 rounded-l-xl">Matricule</th>
                          <th className="px-4 py-3">Nom complet</th>
                          <th className="px-4 py-3 text-right rounded-r-xl">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {activeClass?.eleves.map(el => (
                          <tr key={el.id} className="hover:bg-slate-900/30">
                            <td className="px-4 py-3 text-xs font-semibold text-slate-500">{el.matricule}</td>
                            <td className="px-4 py-3 font-semibold text-white">{el.nom} {el.prenoms}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteStudent(el.id)}
                                className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors"
                                title="Retirer cet élève"
                              ><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'parametres' && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <h3 className="font-bold text-xl text-white">Paramètres généraux</h3>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-slate-200 text-sm">Profil Enseignant</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nom d'Enseignant</label>
                  <input
                    type="text" value={user.nom}
                    onChange={(e) => setUser(prev => ({ ...prev, nom: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Téléphone</label>
                  <input
                    type="tel" maxLength="10" value={user.tel}
                    onChange={(e) => setUser(prev => ({ ...prev, tel: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-slate-200 text-sm">Informations de licence</h4>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Statut actuel du compte :</p>
                  <p className="text-md font-black text-white mt-0.5">
                    {user.statut_abonnement === 'demo'
                      ? "Licence d'essai gratuite (Exportations verrouillées)"
                      : `Abonnement Premium Actif — ${user.plan} (expire le ${user.expireLe})`}
                  </p>
                </div>
                {user.statut_abonnement === 'demo' && (
                  <button onClick={() => setPaywallModal(true)} className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shrink-0">S'abonner</button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Library className={`w-5 h-5 ${isPremiumPlan ? 'text-amber-400' : 'text-slate-500'}`} />
                  <div>
                    <p className="text-xs font-semibold text-slate-400">Fiches pédagogiques</p>
                    <p className="text-sm font-bold text-white">{isPremiumPlan ? 'Accès VIP actif' : 'Réservé à la formule 5 Ans VIP'}</p>
                  </div>
                </div>
                <button
                  onClick={handleOpenFiches}
                  className={`text-xs font-black px-4 py-2 rounded-xl shrink-0 ${isPremiumPlan ? 'bg-amber-500 text-slate-950 hover:opacity-95' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >{isPremiumPlan ? 'Ouvrir' : 'Débloquer'}</button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-rose-400 text-sm">Zone de danger</h4>
              <p className="text-xs text-slate-400">En réinitialisant l'application, toutes vos classes enregistrées et les notes associées seront effacées de l'espace de stockage.</p>
              <button
                onClick={() => {
                  if (confirm("Voulez-vous vraiment réinitialiser l'application ? Cette action est irréversible.")) {
                    localStorage.removeItem(STORAGE_KEY);
                    setClasses([{ id: 'class-1', nom: 'CM2 Émeraude', niveau: 'CM2', eleves: ELEVES_INITIAL_CM2 }]);
                    setNotes({});
                    setSelectedClassId('class-1');
                    setCurrentSaisieIndex(0);
                    setUser({ nom: 'Enseignant Bénin', tel: '0197000000', statut_abonnement: 'demo', planId: null, plan: null, expireLe: null });
                    triggerNotif("Application réinitialisée.");
                  }
                }}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs px-4 py-2 rounded-xl border border-rose-500/20"
              >Réinitialiser l'application</button>
            </div>
          </div>
        )}

      </main>

      <footer className="bg-slate-950 border-t border-slate-800/80 px-4 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 MastaNote AI+ - Spécial Primaire Bénin (CI à CM2). Tous droits réservés.</p>
          <div className="flex gap-4">
            <span className="text-[10px] text-slate-500">Fichier de base d'import : Notes - CM2</span>
          </div>
        </div>
      </footer>

    </div>
  );
}