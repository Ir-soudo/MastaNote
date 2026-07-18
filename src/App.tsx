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

// --- CONFIGURATION BACKEND SCANNER IA (Render) ---
const SCAN_API_URL = 'https://mastanote-backend.onrender.com/api/scan';

// --- CONFIGURATION BACKEND VALIDATION DE LICENCE (Render) ---
const LICENSE_API_URL = 'https://mastanote-backend.onrender.com/api/validate-license';

// Lien vers la bibliothèque de fiches pédagogiques (réservée à la formule 5 Ans VIP).
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

  const handleDeleteStudent = (studentId) => {
    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return { ...c, eleves: c.eleves.filter(e => e.id !== studentId) };
      }
      return c;
    }));
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
        onClick={() => {
          updateInfo.activateUpdate();
          setUpdateInfo(null);
        }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl shrink-0 transition-colors"
      >
        Mettre à jour
      </button>
      // ... reste du bouton et du message
    </div>
  )}
</div>)};
