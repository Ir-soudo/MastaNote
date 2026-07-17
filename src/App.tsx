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
  Library,
  X,
  User,
  Phone,
  Layers,
  HelpCircle,
  Bot,
  BrainCircuit,
  FileText
} from 'lucide-react';


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

const SCAN_API_URL = 'https://mastanote-backend.onrender.com/api/scan';
const LICENSE_API_URL = 'https://mastanote-backend.onrender.com/api/validate-license';
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

  // States for scanner module
  const [scanMatiere, setScanMatiere] = useState('maths');
  const [scanImage, setScanImage] = useState(null);
  const [scanStatus, setScanStatus] = useState('idle');
  const [scanResults, setScanResults] = useState([]);
  const [scanErrorMsg, setScanErrorMsg] = useState('');
  const [scanProgressMsg, setScanProgressMsg] = useState('');

  // Custom modals replacing native alert() & confirm()
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteClassConfirm, setShowDeleteClassConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportStudents, setPendingImportStudents] = useState([]);
  const [studentToDelete, setStudentToDelete] = useState(null);

  const recognitionRef = useRef(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const importFileInputRef = useRef(null);

  const isPremiumPlan = user.statut_abonnement === 'actif' && user.planId === '5ans';

  const triggerNotif = (message, type = 'success') => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 4000);
  };

  useEffect(() => {
    const handleUpdateAvailable = (e) => {
      setUpdateInfo({ activateUpdate: e.detail.activateUpdate });
    };
    window.addEventListener('mastanote-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('mastanote-update-available', handleUpdateAvailable);
  }, []);

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
            triggerNotif(`Note obtenue détectée : ${noteLue}/20 (perfectionnement non reconnu)`, 'success');
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
    if (currentSaisieIndex > 0) {
      setCurrentSaisieIndex(prev => prev - 1);
    }
  };

  const handleCreateClass = (e) => {
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

  const executeDeleteClass = () => {
    if (classes.length <= 1) {
      triggerNotif("Vous devez conserver au moins une classe.", 'error');
      setShowDeleteClassConfirm(false);
      return;
    }
    if (!activeClass) return;

    const remaining = classes.filter(c => c.id !== activeClass.id);
    setClasses(remaining);
    setNotes(prev => {
      const updated = { ...prev };
      delete updated[activeClass.id];
      return updated;
    });
    setSelectedClassId(remaining[0].id);
    setCurrentSaisieIndex(0);
    setShowDeleteClassConfirm(false);
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
      id: `student-${Date.now()}`,
      matricule: matriculeGenere,
      nom: newStudentNom.toUpperCase(),
      prenoms: newStudentPrenoms
    };

    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return { ...c, eleves: [...c.eleves, newStudent] };
      }
      return c;
    }));

    setNewStudentNom('');
    setNewStudentPrenoms('');
    setNewStudentMatricule('');
    triggerNotif(`${newStudent.nom} ajouté à la classe !`);
  };

  const executeDeleteStudent = () => {
    if (!studentToDelete) return;
    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return { ...c, eleves: c.eleves.filter(e => e.id !== studentToDelete.id) };
      }
      return c;
    }));
    setStudentToDelete(null);
    triggerNotif("Élève retiré de la classe.");
  };

  const normalizeHeader = (s) => (s ?? '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();

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
        matricule,
        nom: nom.toUpperCase(),
        prenoms
      });
    });
    return students;
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

    reader.onerror = () => {
      triggerNotif("Impossible de lire ce fichier.", 'error');
    };

    if (isExcel) {
      reader.onload = () => {
        try {
          const rows = rowsFromWorkbook(reader.result);
          const imported = studentsFromRows(rows);
          triggerImportConfirmation(imported);
        } catch (err) {
          triggerNotif("Erreur lors de la lecture du fichier Excel.", 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        try {
          const text = typeof reader.result === 'string' ? reader.result : '';
          const rows = rowsFromCsvText(text);
          const imported = studentsFromRows(rows);
          triggerImportConfirmation(imported);
        } catch (err) {
          triggerNotif("Erreur lors de la lecture du fichier.", 'error');
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const triggerImportConfirmation = (imported) => {
    if (imported.length === 0) {
      triggerNotif("Aucun élève valide trouvé dans ce fichier. Vérifiez les colonnes.", 'error');
      return;
    }
    if (activeClass && activeClass.eleves.length > 0) {
      setPendingImportStudents(imported);
      setShowImportConfirm(true);
    } else {
      applyStudentsImport(imported, true);
    }
  };

  const applyStudentsImport = (imported, replaceExisting) => {
    let finalStudents = imported;
    if (!replaceExisting && activeClass) {
      const existingMatricules = new Set(activeClass.eleves.map(el => el.matricule));
      const toAdd = imported.filter(s => !existingMatricules.has(s.matricule));
      finalStudents = [...activeClass.eleves, ...toAdd];
    }

    setClasses(prev => prev.map(c => c.id === selectedClassId ? { ...c, eleves: finalStudents } : c));

    if (replaceExisting) {
      setNotes(prev => ({ ...prev, [selectedClassId]: {} }));
      setCurrentSaisieIndex(0);
    }

    setShowImportConfirm(false);
    setPendingImportStudents([]);
    triggerNotif(`${imported.length} élève(s) traité(s) avec succès !`, 'success');
  };

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
      setActivationStatus('error');
      setActivationMessage("Erreur réseau. Vérifiez votre connexion internet et réessayez.");
    }
  };

  const handleResetApp = () => {
    setClasses([{ id: 'class-1', nom: 'CM2 Émeraude', niveau: 'CM2', eleves: ELEVES_INITIAL_CM2 }]);
    setNotes({});
    setSelectedClassId('class-1');
    setCurrentSaisieIndex(0);
    setUser({ nom: 'Enseignant Bénin', tel: '0197000000', statut_abonnement: 'demo', planId: null, plan: null, expireLe: null });
    setShowResetConfirm(false);
    triggerNotif("Application réinitialisée.");
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
      setScanProgressMsg("Le serveur de reconnaissance se réveille (jusqu'à 60 secondes après inactivité)... Merci de patienter.");
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
        triggerNotif("Aucune note n'a pu être identifiée automatiquement. Saisie manuelle possible.", 'error');
      } else {
        triggerNotif(`${detectedCount} note(s) détectée(s).`, 'success');
      }
    } catch (err) {
      console.error(err);
      setScanStatus('error');
      if (err && err.name === 'AbortError') {
        setScanErrorMsg("Le serveur met trop de temps à répondre. Réessayez.");
      } else {
        setScanErrorMsg(err?.message || "L'analyse a échoué. Vérifiez l'éclairage de la photo.");
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
    <div className="min-h-screen bg-[#07090e] text-[#E2E8F0] flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased relative">
      
      {/* GLOWING AMBIENT BACKGROUNDS */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/10 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[110px] pointer-events-none z-0" />

      {/* SYSTEM ALERTS AND NOTIFICATIONS */}
      {notif && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.65)] flex items-center gap-3 border backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-top-6 ${
          notif.type === 'success' ? 'bg-[#0b1b14]/90 border-emerald-500/30 text-emerald-300' : 'bg-[#1b0a0d]/90 border-rose-500/30 text-rose-300'
        }`}>
          <div className={`p-1 rounded-full ${notif.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <CheckCircle className="w-5 h-5 shrink-0" />
          </div>
          <span className="font-semibold text-sm tracking-wide">{notif.message}</span>
        </div>
      )}

      {/* --- STREAMING_CHUNK:Rendering premium application header... --- */}
      <header className="bg-[#0b0e17]/80 border-b border-slate-800/60 backdrop-blur-lg sticky top-0 z-40 px-4 sm:px-6 py-4 shadow-xl relative">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 p-2.5 rounded-2xl shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all duration-300">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                <h1 className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  MastaNote AI+
                </h1>
                <span className="w-fit text-[9px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest">
                  PRÉ-SCOLAIRE & PRIMAIRE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide mt-0.5">Interface Pédagogique Nationale Bénin</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user.statut_abonnement === 'demo' ? (
              <button 
                onClick={() => setPaywallModal(true)}
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 hover:shadow-lg hover:shadow-orange-500/20 hover:scale-[1.03] transition-all duration-300 active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                Débloquer l'Export
              </button>
            ) : (
              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-emerald-500/5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Premium: {user.plan || 'Activé'}
              </span>
            )}
            
            <button 
              onClick={() => setActiveTab('parametres')}
              className={`p-2.5 rounded-xl border transition-all duration-300 ${activeTab === 'parametres' ? 'bg-slate-800/80 border-slate-700 text-white' : 'border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/50 hover:text-slate-200 text-slate-400'}`}
              title="Paramètres"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* --- STREAMING_CHUNK:Rendering level selector and class manager... --- */}
      <section className="bg-[#080b12]/50 border-b border-slate-800/40 px-4 py-3 backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full max-w-sm">
            <Layers className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setCurrentSaisieIndex(0);
              }}
              className="bg-[#0f1423]/90 border border-slate-800/80 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 w-full font-bold transition-all cursor-pointer hover:border-slate-700/80"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowAddClassModal(true)}
              className="bg-[#0f1423] hover:bg-slate-800/60 border border-slate-800/80 text-xs text-indigo-300 font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95 hover:border-indigo-500/30"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              Créer une classe
            </button>
            <button
              onClick={() => setShowDeleteClassConfirm(true)}
              className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs text-rose-400 font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer classe
            </button>
          </div>
        </div>
      </section>

      {/* --- MAIN PAGE TAB LAYOUTS --- */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col gap-6 relative z-10">

        {/* --- STREAMING_CHUNK:Rendering custom confirmation modals... --- */}
        {/* Custom Confirmation Modals replacing standard alert() & confirm() */}
        {showDeleteClassConfirm && (
          <div className="fixed inset-0 bg-[#04060b]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c101d] border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-rose-400 mb-3">
                <AlertTriangle className="w-7 h-7 animate-pulse" />
                <h3 className="font-extrabold text-lg text-white">Supprimer la classe ?</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Voulez-vous vraiment supprimer la classe <strong className="text-white">"{activeClass?.nom}"</strong> et toutes ses notes enregistrées ? Cette action est définitive.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteClassConfirm(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={executeDeleteClass}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-rose-950/20"
                >
                  Confirmer la suppression
                </button>
              </div>
            </div>
          </div>
        )}

        {showImportConfirm && (
          <div className="fixed inset-0 bg-[#04060b]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c101d] border border-indigo-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-indigo-400 mb-3">
                <FileSpreadsheet className="w-7 h-7" />
                <h3 className="font-extrabold text-lg text-white">Importer des élèves</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Cette classe contient déjà <strong className="text-white">{activeClass?.eleves.length} élève(s)</strong>.<br />
                Voulez-vous <strong className="text-indigo-400">Remplacer</strong> la liste existante ou <strong className="text-indigo-400">Ajouter</strong> ces {pendingImportStudents.length} nouveaux élèves ?
              </p>
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setShowImportConfirm(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-all text-center"
                >
                  Annuler l'import
                </button>
                <button
                  onClick={() => applyStudentsImport(pendingImportStudents, false)}
                  className="bg-[#121625] hover:bg-[#1a213a] text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  Ajouter (Conserver actuels)
                </button>
                <button
                  onClick={() => applyStudentsImport(pendingImportStudents, true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95"
                >
                  Remplacer (Tout effacer)
                </button>
              </div>
            </div>
          </div>
        )}

        {studentToDelete && (
          <div className="fixed inset-0 bg-[#04060b]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c101d] border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-rose-400 mb-3">
                <AlertTriangle className="w-7 h-7" />
                <h3 className="font-extrabold text-lg text-white">Retirer l'élève ?</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Voulez-vous vraiment retirer l'élève <strong className="text-white">{studentToDelete.nom} {studentToDelete.prenoms}</strong> ? Ses notes individuelles de ce trimestre seront définitivement supprimées.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStudentToDelete(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={executeDeleteStudent}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
                >
                  Retirer l'élève
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Class */}
        {showAddClassModal && (
          <div className="fixed inset-0 bg-[#04060b]/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c101d] border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-lg text-white">
                  Ajouter une nouvelle classe
                </h3>
              </div>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Nom de la classe (ex: CM2 Émeraude)</label>
                  <input
                    type="text"
                    required
                    placeholder="Saisissez un nom unique"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full bg-[#04060b] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium placeholder-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2">Niveau EducMaster d'appartenance</label>
                  <select
                    value={newClassNiveau}
                    onChange={(e) => setNewClassNiveau(e.target.value)}
                    className="w-full bg-[#04060b] border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-semibold"
                  >
                    {CLASSES_PRIMAIRE.map(lvl => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddClassModal(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95"
                  >
                    Enregistrer la classe
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: App reset verification */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-[#04060b]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c101d] border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 text-rose-400 mb-3">
                <AlertTriangle className="w-7 h-7 animate-pulse" />
                <h3 className="font-extrabold text-lg text-white">Réinitialiser l'application ?</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Attention. Cette action détruira définitivement toutes vos classes, les données d'élèves enregistrés ainsi que toutes les notes attribuées au cours du trimestre actuel.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-all"
                >
                  Conserver mes données
                </button>
                <button
                  onClick={handleResetApp}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-rose-950/20"
                >
                  Supprimer tout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- STREAMING_CHUNK:Rendering Mobile Money and Chariow paywall... --- */}
        {paywallModal && (
          <div className="fixed inset-0 bg-[#04060b]/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c101d] border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-3xl relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
              <button 
                onClick={() => setPaywallModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 hover:bg-slate-800/50 rounded-xl transition-all"
              >
                ✕
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex bg-amber-500/10 text-amber-500 border border-amber-500/20 p-3.5 rounded-2xl mb-3">
                  <CreditCard className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-2xl text-white tracking-tight">Activez MastaNote AI+ Premium</h3>
                <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
                  Déverrouillez l'exportation illimitée pour EducMaster, le Scanner IA ainsi que notre bibliothèque de ressources pédagogiques.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {ABONNEMENT_PLANS.map((p) => (
                  <div key={p.id} className="bg-[#04060b] rounded-2xl p-4 border border-slate-800 flex flex-col justify-between hover:border-indigo-500/30 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">{p.label}</span>
                        {p.premiumFiches && <span className="bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">VIP</span>}
                      </div>
                      <p className="text-lg font-black text-white">{p.prix.toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-[10px] text-slate-500 font-semibold mb-3">{p.tagline}</p>
                      <ul className="text-[9px] text-slate-400 space-y-2 mb-4">
                        {p.avantages.map((adv, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{adv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <a
                      href={p.chariowCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#121625] hover:bg-indigo-600 hover:text-white border border-slate-800 hover:border-transparent text-slate-300 font-extrabold text-[10px] py-2 px-3 rounded-xl transition-all text-center flex items-center justify-center gap-1"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      S'abonner via Chariow
                    </a>
                  </div>
                ))}
              </div>

              {/* Activation field */}
              <div className="border-t border-slate-800/80 pt-5 space-y-4">
                <div>
                  <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    Déjà abonné ? Activer ma clé de licence
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1">Saisissez la clé reçue par e-mail après validation de votre achat sur Chariow.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Saisissez votre clé de licence (ex: LIC-XXXX-XXXX)"
                    value={licenseKeyInput}
                    onChange={(e) => setLicenseKeyInput(e.target.value)}
                    className="flex-1 bg-[#04060b] border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-xs font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-slate-700"
                  />
                  <button
                    onClick={handleActivateLicense}
                    disabled={activationStatus === 'validating'}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shrink-0 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {activationStatus === 'validating' ? 'Validation...' : 'Activer la licence'}
                  </button>
                </div>

                {activationMessage && (
                  <div className={`p-3 rounded-xl border text-[11px] font-bold text-center ${
                    activationStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}>
                    {activationMessage}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* --- STREAMING_CHUNK:Rendering responsive tab navigation... --- */}
        <div className="flex border-b border-slate-800/40 overflow-x-auto whitespace-nowrap scrollbar-hide gap-1.5 bg-[#0b0e17]/85 p-1 rounded-2xl border border-slate-800/40 relative z-20 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-3 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'dashboard' ? 'bg-[#151c31] text-white shadow-lg border border-slate-700/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            Tableau de bord
          </button>
          <button
            onClick={() => {
              if (activeClass?.eleves.length > 0) {
                setActiveTab('saisie');
              } else {
                triggerNotif("Veuillez d'abord ajouter des élèves dans l'onglet Liste.", "error");
                setActiveTab('eleves');
              }
            }}
            className={`px-4 py-3 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'saisie' ? 'bg-[#151c31] text-white shadow-lg border border-slate-700/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Mic className="w-4 h-4 text-indigo-400" />
            Saisie Vocale & Express
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-3 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'scanner' ? 'bg-[#151c31] text-white shadow-lg border border-slate-700/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Camera className="w-4 h-4 text-indigo-400" />
            Scanner IA photo
          </button>
          <button
            onClick={() => setActiveTab('eleves')}
            className={`px-4 py-3 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'eleves' ? 'bg-[#151c31] text-white shadow-lg border border-slate-700/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-400" />
            Élèves ({activeClass?.eleves.length || 0})
          </button>
        </div>

        {/* --- STREAMING_CHUNK:Rendering main dashboard layout... --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-350">
            
            {/* HERO BANNER SECTION WITH ADVANCED ACTIONS */}
            <div className="bg-gradient-to-br from-[#0c101d] via-[#090b14] to-[#05060b] border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <FileSpreadsheet className="w-56 h-56" />
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <h2 className="font-extrabold text-xl sm:text-2xl text-white tracking-tight">Classe : {activeClass?.nom}</h2>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xl">
                    Remplissez les évaluations de vos élèves, profitez des outils de remédiation par IA, importez vos listes de canevas et exportez en format officiel EducMaster.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="bg-[#121625]/60 text-indigo-300 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-indigo-500/10">
                      {activeClass?.eleves.length || 0} Élèves inscrits
                    </span>
                    <span className="bg-[#121625]/60 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-800/50">
                      Niveau : {activeClass?.niveau}
                    </span>
                    {user.statut_abonnement === 'actif' && (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-emerald-500/20">
                        Abonnement : {user.plan || 'Premium'} (jusqu'au {user.expireLe})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={handleOpenFiches}
                    className="bg-[#121625] hover:bg-slate-800/80 text-amber-300 border border-amber-500/20 font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Library className="w-4 h-4 text-amber-400" />
                    Fiches Pédagogiques
                  </button>
                  <button
                    onClick={() => setActiveTab('scanner')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-950/40"
                  >
                    <Camera className="w-4 h-4" />
                    Scanner Correction IA
                  </button>
                  <button
                    onClick={exportToEducMaster}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-500/10"
                  >
                    <Download className="w-4 h-4" />
                    Exporter EducMaster
                  </button>
                </div>
              </div>
            </div>

            {/* SUBJECT SELECTOR CHIPS */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Filtre d'affichage matière</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {MATIERES_PRIMAIRE.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMatiere(m.id)}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl border shrink-0 transition-all duration-300 active:scale-95 ${
                      activeMatiere === m.id 
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300 shadow-md shadow-indigo-500/5' 
                        : 'bg-[#080b12]/80 border-slate-800/80 text-slate-400 hover:text-slate-300 hover:bg-[#0c101d]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0c101d] border border-slate-800/60 p-5 rounded-2xl flex items-center gap-4 shadow-md hover:border-slate-700/60 transition-all">
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Moyenne Générale</p>
                  <p className="text-xl font-extrabold text-white mt-1">{stats.moyenne} <span className="text-xs font-medium text-slate-500">/20</span></p>
                </div>
              </div>

              <div className="bg-[#0c101d] border border-slate-800/60 p-5 rounded-2xl flex items-center gap-4 shadow-md hover:border-slate-700/60 transition-all">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taux de passage</p>
                  <p className="text-xl font-extrabold text-white mt-1">{stats.taux}%</p>
                </div>
              </div>

              <div className="bg-[#0c101d] border border-slate-800/60 p-5 rounded-2xl flex items-center gap-4 shadow-md hover:border-slate-700/60 transition-all">
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Évaluations Saisies</p>
                  <p className="text-xl font-extrabold text-white mt-1">{stats.saisis} <span className="text-xs font-medium text-slate-500">/ {stats.totalEleves}</span></p>
                </div>
              </div>

              <div className="bg-[#0c101d] border border-slate-800/60 p-5 rounded-2xl flex items-center gap-4 shadow-md hover:border-slate-700/60 transition-all">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Premier de la classe</p>
                  <p className="text-xs font-extrabold text-white truncate max-w-[140px] mt-1" title={stats.top}>{stats.top}</p>
                </div>
              </div>
            </div>

            {/* --- LEDGER TABLE --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="bg-[#0c101d]/80 border border-slate-800/60 rounded-2xl p-5 lg:col-span-2 space-y-4 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <FileSpreadsheet className="text-indigo-400 w-4.5 h-4.5" />
                    Notes de {MATIERES_PRIMAIRE.find(m => m.id === activeMatiere)?.label}
                  </h4>
                  <span className="text-[11px] text-slate-500 italic">Actions pédagogiques assistées</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800/50">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#04060b] text-slate-400 uppercase font-bold tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5">Matricule</th>
                        <th className="px-4 py-3.5">Élève</th>
                        <th className="px-4 py-3.5 text-center">Note obtenue (/20)</th>
                        <th className="px-4 py-3.5 text-center">Soin/Perf (/20)</th>
                        <th className="px-4 py-3.5 text-center">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 bg-[#0c101d]/40">
                      {activeClass?.eleves.map(el => {
                        const noteData = notes[selectedClassId]?.[activeMatiere]?.[el.id] || {};
                        const n = noteData.note;
                        const p = noteData.perf;
                        return (
                          <tr key={el.id} className="hover:bg-slate-900/30 transition-all duration-150">
                            <td className="px-4 py-3 font-semibold text-slate-400">{el.matricule}</td>
                            <td className="px-4 py-3 font-extrabold text-white">{el.nom} {el.prenoms}</td>
                            <td className="px-4 py-3 text-center font-black">
                              {n !== undefined ? (
                                <span className={n >= 10 ? 'text-[#34d399]' : 'text-[#f87171]'}>{n}</span>
                              ) : (
                                <span className="text-slate-600 font-normal">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">
                              {p !== undefined ? <span className="text-indigo-300">{p}</span> : <span className="text-slate-600 font-normal">-</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {n !== undefined ? (
                                n >= 10 ? (
                                  <span className="bg-emerald-500/10 text-[#34d399] text-[9px] font-black px-2.5 py-1 rounded-full uppercase">Moyen</span>
                                ) : (
                                  <span className="bg-rose-500/10 text-[#f87171] text-[9px] font-black px-2.5 py-1 rounded-full uppercase">Faible</span>
                                )
                              ) : (
                                <span className="text-[10px] text-slate-600 italic">Vide</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SIDEBAR AI RECALL */}
              <div className="bg-[#0c101d]/80 border border-slate-800/60 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-lg">
                <div className="space-y-2">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <AlertTriangle className="text-amber-500 w-4.5 h-4.5" />
                    Aide au diagnostic
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Statistiques de réussite d'évaluation pour la matière active <strong className="text-indigo-300">{MATIERES_PRIMAIRE.find(m => m.id === activeMatiere)?.label}</strong>.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="bg-[#04060b] p-4 rounded-xl border border-slate-800/60">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Meilleure Performance</p>
                    <p className="text-xs font-black text-indigo-400 mt-1.5">{stats.top}</p>
                  </div>

                  <div className="bg-[#04060b] p-4 rounded-xl border border-slate-800/60">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Besoins d'accompagnement</p>
                    <p className="text-xs font-black text-rose-400 mt-1.5">{stats.flop}</p>
                  </div>
                </div>

                <div className="bg-indigo-950/15 border border-indigo-500/10 p-3.5 rounded-xl text-center">
                  <p className="text-[10px] text-indigo-300 font-bold">Consigne d'importation</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal">MastaNote AI+ intègre les exigences de perfectionnement requises par l'EducMaster Béninois.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- STREAMING_CHUNK:Rendering mobile-first vocal dictation terminal... --- */}
        {activeTab === 'saisie' && activeClass?.eleves.length > 0 && (
          <div className="max-w-xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className="text-slate-400 hover:text-white flex items-center gap-1.5 text-xs font-semibold group"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                Tableau de bord
              </button>

              <span className="text-xs text-slate-400 font-bold bg-[#0c101d] border border-slate-800 px-3.5 py-1.5 rounded-full">
                {currentSaisieIndex + 1} / {activeClass.eleves.length} élèves
              </span>
            </div>

            {/* QUICK SUBJECT SELECTOR FOR DICTATION */}
            <div className="bg-[#0c101d] border border-slate-800/60 p-3 rounded-2xl">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1.5 px-1">Matière de saisie</label>
              <select
                value={activeMatiere}
                onChange={(e) => {
                  setActiveMatiere(e.target.value);
                  setCurrentSaisieIndex(0);
                }}
                className="w-full bg-[#04060b] border border-slate-800/80 text-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all cursor-pointer"
              >
                {MATIERES_PRIMAIRE.map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* CENTRAL INPUT BOX */}
            <div className="bg-gradient-to-tr from-[#0c101d] to-[#05060b] border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />

              <div className="text-center space-y-1.5 mb-6">
                <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase bg-[#04060b] border border-slate-800/60 px-3.5 py-1 rounded-full">
                  Matricule : {activeEleve?.matricule || '-'}
                </span>
                <h3 className="text-2xl font-black text-white pt-3">
                  {activeEleve?.nom}
                </h3>
                <p className="text-indigo-400 text-sm font-semibold">
                  {activeEleve?.prenoms}
                </p>
              </div>

              {/* VOICE MODULE CONTROLS */}
              <div className="bg-[#04060b] border border-slate-800/80 rounded-2xl p-5 mb-6 space-y-4 text-center relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Saisie Vocale intelligente</span>
                  {isListening && <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />}
                </div>

                <div className="flex items-center justify-center py-2">
                  <button
                    onClick={toggleListening}
                    className={`p-4 rounded-full shadow-lg transition-all duration-300 transform active:scale-90 ${
                      isListening 
                        ? 'bg-rose-600 text-white animate-pulse shadow-rose-900/25' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/25'
                    }`}
                  >
                    {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </button>
                </div>

                <p className="text-xs font-semibold text-slate-300 leading-normal px-2">
                  {voiceStatus}
                </p>
              </div>

              {/* INPUT FIELDS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Note Obtenue</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    placeholder="Note /20"
                    value={tempNote}
                    onChange={(e) => setTempNote(e.target.value)}
                    className="w-full bg-[#04060b] border border-slate-800 rounded-2xl px-3 py-4 text-center text-xl font-black text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-slate-800"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Perfectionnement</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    placeholder="Soin /20"
                    value={tempPerf}
                    onChange={(e) => setTempPerf(e.target.value)}
                    className="w-full bg-[#04060b] border border-slate-800 rounded-2xl px-3 py-4 text-center text-xl font-black text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-slate-800"
                  />
                </div>
              </div>

              {/* NAVIGATION BUTTONS */}
              <div className="flex items-center justify-between gap-3 mt-6 pt-2">
                <button
                  onClick={handlePrev}
                  disabled={currentSaisieIndex === 0}
                  className="flex-1 bg-[#04060b] hover:bg-slate-900 text-slate-300 text-xs font-bold py-3.5 rounded-xl border border-slate-800/60 disabled:opacity-30 transition-all active:scale-95"
                >
                  Précédent
                </button>

                <button
                  onClick={handleSaveCurrentAndNext}
                  className="flex-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  Enregistrer & Suivant
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>

            <p className="text-center text-[10px] text-slate-500 font-medium">
              Saisie en cours : <strong className="text-slate-400">{MATIERES_PRIMAIRE.find(m => m.id === activeMatiere)?.label}</strong>
            </p>

          </div>
        )}

        {/* --- STREAMING_CHUNK:Rendering photo correction scanner tab... --- */}
        {activeTab === 'scanner' && (
          <div className="max-w-2xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
            <div className="bg-gradient-to-tr from-[#0c101d] to-[#05060b] border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4 mb-5">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Correction & Scanner de notes par Photo</h3>
                  <p className="text-[10px] text-slate-500">Photographiez une liste manuscrite pour y extraire automatiquement les notes.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Matière de l'évaluation</label>
                  <select
                    value={scanMatiere}
                    onChange={(e) => setScanMatiere(e.target.value)}
                    className="w-full bg-[#04060b] border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none"
                  >
                    {MATIERES_PRIMAIRE.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col justify-end gap-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Choisir l'image de la feuille</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="bg-[#121625] hover:bg-[#1a213a] text-slate-200 font-bold text-xs py-2.5 rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4 text-indigo-400" />
                      Appareil Photo
                    </button>
                    <button
                      onClick={() => galleryInputRef.current?.click()}
                      className="bg-[#121625] hover:bg-[#1a213a] text-slate-200 font-bold text-xs py-2.5 rounded-xl border border-slate-800 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <ImageIcon className="w-4 h-4 text-indigo-400" />
                      Galerie Image
                    </button>
                  </div>
                </div>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleScanFileSelected}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                onChange={handleScanFileSelected}
                className="hidden"
              />

              {/* PREVIEW AND ANALYSIS BUTTONS */}
              {scanImage && (
                <div className="space-y-4 border-t border-slate-800/80 pt-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">Aperçu du document :</span>
                    <button
                      onClick={resetScan}
                      className="text-xs font-semibold text-rose-400 flex items-center gap-1 hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Changer de photo
                    </button>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-video max-h-60 bg-[#04060b]">
                    <img src={scanImage.previewUrl} alt="Scan preview" className="object-contain w-full h-full" />
                  </div>

                  {scanStatus === 'idle' && (
                    <button
                      onClick={handleAnalyzeScan}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
                      Lancer l'analyse intelligente par IA
                    </button>
                  )}

                  {scanStatus === 'analyzing' && (
                    <div className="bg-[#04060b] p-6 rounded-2xl border border-slate-800/80 text-center space-y-4">
                      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-bold text-white">Analyse des notes par notre moteur IA...</p>
                      <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-normal">{scanProgressMsg}</p>
                    </div>
                  )}

                  {scanStatus === 'error' && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-xs text-rose-400 font-semibold leading-relaxed space-y-2">
                      <p>{scanErrorMsg}</p>
                      <button
                        onClick={handleAnalyzeScan}
                        className="