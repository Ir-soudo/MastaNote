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
  Zap,
  FileText
} from 'lucide-react';

// --- IMPORTATION DU SYSTEME DE LICENCES CHARIOW ---
import { LicenceService } from './services/licenceService';
import { Paywall } from './components/Paywall';

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
  // --- ÉTAT DE NAVIGATION LANDING PAGE & BLOCAGE DE LICENCE ---
  const [showApp, setShowApp] = useState(false);
  const [hasLicense, setHasLicense] = useState(false);

  // --- ÉTATS CLASSIQUES ---
  const [user, setUser] = useState({
    nom: 'Enseignant Bénin',
    tel: '0197000000',
    statut_abonnement: 'demo', // Écrasé dynamiquement par Chariow
    plan: null,
    expireLe: null
  });

  // Synchronisation initiale et vérification de la validité de la licence Chariow au démarrage
  useEffect(() => {
    const active = LicenceService.hasAccess();
    setHasLicense(active);
    if (active) {
      const details = LicenceService.getLicence();
      setUser(prev => ({
        ...prev,
        statut_abonnement: 'actif',
        plan: details.productId === 'prd_s877x4vl' ? 'VIP Premium (5 Ans)' : details.productId === 'prd_6duiuhl1' ? 'Sérénité (3 Ans)' : 'Découverte (1 An)',
        expireLe: details.expiryDate ? new Date(details.expiryDate).toLocaleDateString('fr-FR') : 'Illimitée'
      }));
    }
  }, []);

  const handleSuccessfulActivation = () => {
    setHasLicense(true);
    setShowApp(true);
    const details = LicenceService.getLicence();
    setUser(prev => ({
      ...prev,
      statut_abonnement: 'actif',
      plan: details.productId === 'prd_s877x4vl' ? 'VIP Premium (5 Ans)' : details.productId === 'prd_6duiuhl1' ? 'Sérénité (3 Ans)' : 'Découverte (1 An)',
      expireLe: details.expiryDate ? new Date(details.expiryDate).toLocaleDateString('fr-FR') : 'Illimitée'
    }));
  };

  // Gestion des classes de l'enseignant
  const [classes, setClasses] = useState([
    { id: 'class-1', nom: 'CM2 Émeraude', niveau: 'CM2', eleves: ELEVES_INITIAL_CM2 }
  ]);
  const [selectedClassId, setSelectedClassId] = useState('class-1');
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, saisie, eleves, scan, parametres

  // Matière active pour la saisie
  const [activeMatiere, setActiveMatiere] = useState('maths');

  // Stockage des notes
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

  // État de la saisie en cours
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

  // États pour le Scanner IA de feuilles de notes
  const [scanMatiere, setScanMatiere] = useState('maths');
  const [scanImage, setScanImage] = useState<any>(null);
  const [scanStatus, setScanStatus] = useState('idle');
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [scanErrorMsg, setScanErrorMsg] = useState('');
  const [scanProgressMsg, setScanProgressMsg] = useState('');

  const recognitionRef = useRef<any>(null);
  const cameraInputRef = useRef<any>(null);
  const galleryInputRef = useRef<any>(null);
  const importFileInputRef = useRef<any>(null);

  // --- ALERTE NOTIFICATION ---
  const [notif, setNotif] = useState<any>(null);
  const triggerNotif = (message: string, type = 'success') => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 4000);
  };

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
            triggerNotif(`Notes détectées : Note obtenue ${noteLue}/20, Perf ${perfLu}/20`, 'success');
          } else {
            triggerNotif(`Note obtenue détectée : ${noteLue}/20 (perfectionnement non reconnu)`, 'success');
          }
        } else {
          triggerNotif(`Note obtenue détectée : ${noteLue}/20`, 'success');
        }
      } else {
        setVoiceStatus("Les notes doivent être comprises entre 0 et 20.");
      }
    } else {
      setVoiceStatus("Je n'ai pas compris de chiffres. Réessayez.");
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      triggerNotif("La reconnaissance vocale n'est pas supportée.", 'error');
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
    if (!confirm(`Voulez-vous vraiment supprimer la classe "${activeClass.nom}" ?`)) return;

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
    do {
      candidate = `24-${activeClass.niveau}-${Math.floor(100 + Math.random() * 900)}`;
    } while (existing.has(candidate));
    return candidate;
  };

  const handleAddStudent = (e: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newStudentNom.trim() || !newStudentPrenoms.trim()) {
      triggerNotif("Veuillez remplir le nom et le prénom de l'élève.", 'error');
      return;
    }

    const newStudent = {
      id: `student-${Date.now()}`,
      matricule: newStudentMatricule.trim() || generateUniqueMatricule(),
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

  const handleDeleteStudent = (studentId: string) => {
    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return { ...c, eleves: c.eleves.filter(e => e.id !== studentId) };
      }
      return c;
    }));
    triggerNotif("Élève retiré de la classe.");
  };

  // --- IMPORTATION CANEVAS EDUCMASTER ---
  const normalizeHeader = (s: any) => (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  const detectColumns = (headerRow: any[]) => {
    const normalized = (headerRow || []).map(normalizeHeader);
    const idxPrenom = normalized.findIndex(h => h.includes('prenom'));
    const idxMatricule = normalized.findIndex(h => h.includes('matricule'));
    const idxNom = normalized.findIndex((h, i) => i !== idxPrenom && (h === 'nom' || h.includes('nom de famille') || h === 'noms'));
    return idxMatricule !== -1 && idxNom !== -1 && idxPrenom !== -1
      ? { matricule: idxMatricule, nom: idxNom, prenoms: idxPrenom }
      : { matricule: 0, nom: 1, prenoms: 2 };
  };

  const rowsFromCsvText = (rawText: string) => {
    const lines = rawText.split(/\r\n|\n|\r/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];
    const counts = { ',': (lines[0].match(/,/g) || []).length, ';': (lines[0].match(/;/g) || []).length, '\t': (lines[0].match(/\t/g) || []).length };
    const separator = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return lines.map(line => line.split(separator).map(c => c.trim().replace(/^"+|"+$/g, '').trim()));
  };

  const handleImportEducMasterFile = (e: any) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();

    if (isExcel) {
      reader.onload = () => {
        try {
          const workbook = XLSX.read(reader.result, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: '' });
          const imported = studentsFromRows(rows);
          applyImportedStudents(imported);
        } catch (err) {
          triggerNotif("Erreur lors de la lecture du fichier Excel.", 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = () => {
        try {
          const rows = rowsFromCsvText(reader.result as string);
          const imported = studentsFromRows(rows);
          applyImportedStudents(imported);
        } catch (err) {
          triggerNotif("Erreur lors de la lecture du fichier CSV.", 'error');
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const studentsFromRows = (rows: any[]) => {
    if (!rows || rows.length < 2) return [];
    const cols = detectColumns(rows[0]);
    const students: any[] = [];
    rows.slice(1).forEach(row => {
      if (!row || row.length === 0) return;
      const matricule = (row[cols.matricule] ?? '').toString().trim();
      const nom = (row[cols.nom] ?? '').toString().trim();
      const prenoms = (row[cols.prenoms] ?? '').toString().trim();
      if (matricule && nom) {
        students.push({ id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, matricule, nom: nom.toUpperCase(), prenoms });
      }
    });
    return students;
  };

  const applyImportedStudents = (imported: any[]) => {
    if (imported.length === 0) {
      triggerNotif("Aucun élève valide trouvé.", 'error');
      return;
    }
    setClasses(prev => prev.map(c => c.id === selectedClassId ? { ...c, eleves: imported } : c));
    setNotes((prev: any) => ({ ...prev, [selectedClassId]: {} }));
    setCurrentSaisieIndex(0);
    triggerNotif(`${imported.length} élève(s) importé(s) !`, 'success');
  };

  // --- STATISTIQUES ---
  const stats = (() => {
    if (!activeClass || activeClass.eleves.length === 0) return { moyenne: 0, taux: 0, top: '-', flop: '-' };
    const matNotes = notes[selectedClassId]?.[activeMatiere] || {};
    let total = 0, count = 0, admis = 0, maxNote = -1, minNote = 21, topS = '-', flopS = '-';

    activeClass.eleves.forEach(el => {
      const studentNoteData = matNotes[el.id];
      if (studentNoteData && studentNoteData.note !== undefined) {
        const n = studentNoteData.note;
        total += n; count++;
        if (n >= 10) admis++;
        if (n > maxNote) { maxNote = n; topS = `${el.nom} ${el.prenoms}`; }
        if (n < minNote) { minNote = n; flopS = `${el.nom} ${el.prenoms}`; }
      }
    });

    return {
      moyenne: count > 0 ? (total / count).toFixed(2) : '0.00',
      taux: count > 0 ? Math.round((admis / count) * 100) : 0,
      top: maxNote !== -1 ? `${topS} (${maxNote}/20)` : '-',
      flop: minNote !== 21 ? `${flopS} (${minNote}/20)` : '-',
      saisis: count,
      totalEleves: activeClass.eleves.length
    };
  })();

  // --- EXPORTATEUR DE CLASSE SECURISE PAR CHARIOW ---
  const exportToEducMaster = () => {
    // Si la licence globale n'est pas active, on re-déclenche le Paywall de blocage
    if (!LicenceService.hasAccess()) {
      setHasLicense(false);
      return;
    }

    if (!activeClass || activeClass.eleves.length === 0) {
      triggerNotif("Aucun élève dans cette classe à exporter.", 'error');
      return;
    }

    let csvContent = "Matricule,Nom,Prénoms";
    MATIERES_PRIMAIRE.forEach(m => { csvContent += `,${m.label},`; });
    csvContent += "\n,,";
    MATIERES_PRIMAIRE.forEach(() => { csvContent += ",Note obtenue,Note perfectionnement"; });
    csvContent += "\n";

    activeClass.eleves.forEach(el => {
      let row = `"${el.matricule}","${el.nom}","${el.prenoms}"`;
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
    link.setAttribute("download", `EducMaster_Notes_${activeClass.nom.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotif("Fichier généré avec succès !", 'success');
  };

  // Fonction spécifique sécurisée pour le téléchargement de vos fiches pédagogiques (Formule 5 Ans requise)
  const handleDownloadFichesPedagogiques = () => {
    if (LicenceService.hasPremiumAccess()) {
      // Remplacez cette URL factice par votre dossier de stockage réel si nécessaire
      window.open("https://soudoboutik-ebook.mychariow.shop", "_blank");
      triggerNotif("Ouverture de l'espace de fiches pédagogiques Premium !", "success");
    } else {
      alert("Accès refusé : Le téléchargement des fiches pédagogiques et guides d'excellence est un avantage exclusif de la formule VIP Premium 5 Ans. Mettez votre licence à niveau pour y accéder.");
      setHasLicense(false); // Réaffiche les offres tarifaires Chariow
    }
  };

  // --- SCANNER IA ---
  const resetScan = () => { setScanImage(null); setScanStatus('idle'); setScanResults([]); setScanErrorMsg(''); };

  const handleScanFileSelected = (e: any) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setScanImage({ base64: res.split(',')[1], mediaType: file.type, previewUrl: res });
      resetScan();
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeScan = async () => {
    if (!scanImage || !activeClass) return;
    setScanStatus('analyzing'); setScanErrorMsg(''); setScanProgressMsg("Analyse en cours...");
    try {
      const roster = activeClass.eleves.map(el => `${el.matricule} | ${el.nom} ${el.prenoms}`).join('\n');
      const response = await fetch(SCAN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: scanImage.base64, mediaType: scanImage.mediaType, promptText: `Feuille de notes. Roster:\n${roster}` })
      });
      const data = await response.json();
      const clean = (data.content || '').replace(/```json|```/g, '').trim();
      const parsedArr = JSON.parse(clean);

      const results = activeClass.eleves.map(el => {
        const found = Array.isArray(parsedArr) ? parsedArr.find((p: any) => p.matricule === el.matricule) : null;
        return { studentId: el.id, matricule: el.matricule, nom: `${el.nom} ${el.prenoms}`, note: found?.note?.toString() || '', perf: found?.perf?.toString() || '', include: !!found?.note };
      });
      setScanResults(results); setScanStatus('review');
    } catch (err: any) {
      setScanStatus('error'); setScanErrorMsg("L'analyse IA a échoué. Saisie manuelle disponible.");
    }
  };

  const handleApplyScanResults = () => {
    setNotes((prev: any) => {
      const updated = { ...prev };
      const cData = updated[selectedClassId] || {};
      const mData = cData[scanMatiere] || {};
      scanResults.forEach(res => {
        if (res.include) {
          mData[res.studentId] = { note: parseFloat(res.note) || undefined, perf: parseFloat(res.perf) || undefined };
        }
      });
      cData[scanMatiere] = mData; updated[selectedClassId] = cData; return updated;
    });
    triggerNotif("Notes appliquées avec succès !"); setActiveTab('dashboard'); resetScan();
  };

  // --- CONDITION DE VERROUILLAGE PRINCIPALE PAR LE PAYWALL CHARIOW ---
  if (!hasLicense) {
    return <Paywall onActivationSuccess={handleSuccessfulActivation} />;
  }

  // --- AFFICHAGE LANDING PAGE AVANT ENTREE ---
  if (!showApp) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" /> Licence Active & Vérifiée sur Chariow
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-white mb-6">
            Gagnez des heures sur la gestion de vos notes avec <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">MastaNote AI+</span>
          </h1>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            L'assistant pédagogique ultime pour les enseignants du Bénin. Exportez vos fiches au format officiel EducMaster en un clic.
          </p>
          <button
            onClick={() => setShowApp(true)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-lg px-8 py-4 rounded-xl transition shadow-lg shadow-emerald-500/20 transform hover:-translate-y-0.5"
          >
            Lancer l'application maintenant <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // --- DESIGN DE L'APPLICATION GLOBALE (DASHBOARD) ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 md:pb-6">
      {/* Barre de Notification volante */}
      {notif && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white font-medium animate-bounce ${notif.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          <CheckCircle className="w-5 h-5" /> {notif.message}
        </div>
      )}

      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-2 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">MastaNote AI+</h1>
              <p className="text-xs font-medium text-slate-500">Formule : <span className="text-blue-600">{user.plan}</span></p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedClassId}
              onChange={(e) => { setSelectedClassId(e.target.value); setCurrentSaisieIndex(0); }}
              className="bg-slate-100 border-0 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classes.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>)}
            </select>
            <button
              onClick={() => setShowAddClassModal(true)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition"
              title="Ajouter une classe"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 mt-6">
        
        {/* COMPOSANT DASHBOARD PRINCIPAL */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Grille des statistiques rapides */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase">Moyenne Générale</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.moyenne}/20</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase">Taux de Réussite</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.taux}%</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase">Premier de la Classe</p>
                <p className="text-sm font-bold text-slate-700 mt-2 truncate">{stats.top}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase">Saisie globale</p>
                <p className="text-2xl font-bold text-slate-700 mt-1">{stats.saisis} / {stats.totalEleves}</p>
              </div>
            </div>

            {/* Zone d'actions sur les notes */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Tableau des Notes</h3>
                  <p className="text-slate-500 text-sm">Sélectionnez une matière pour visualiser ou modifier les notes.</p>
                </div>
                
                {/* LISTE DES BOUTONS DE TELECHARGEMENT SECURISE */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportToEducMaster}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
                  >
                    <Download className="w-4 h-4" /> Export EducMaster CSV
                  </button>

                  <button
                    onClick={handleDownloadFichesPedagogiques}
                    className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded-xl transition shadow-sm text-sm"
                  >
                    <FileText className="w-4 h-4" /> Télécharger vos fiches (VIP)
                  </button>
                </div>
              </div>

              {/* Sélection des matières */}
              <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
                {MATIERES_PRIMAIRE.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMatiere(m.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition ${activeMatiere === m.id ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Rendu abrégé de la liste des élèves */}
              <div className="mt-4 border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-3">Matricule</th>
                      <th className="p-3">Nom Complet</th>
                      <th className="p-3">Note Obtenue</th>
                      <th className="p-3">Perfectionnement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {activeClass?.eleves.map(el => {
                      const studentNote = notes[selectedClassId]?.[activeMatiere]?.[el.id] || {};
                      return (
                        <tr key={el.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-xs text-slate-500">{el.matricule}</td>
                          <td className="p-3 font-bold text-slate-700">{el.nom} {el.prenoms}</td>
                          <td className="p-3 font-semibold text-blue-600">{studentNote.note !== undefined ? `${studentNote.note}/20` : '-'}</td>
                          <td className="p-3 font-semibold text-amber-600">{studentNote.perf !== undefined ? `${studentNote.perf}/20` : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* COMPOSANT SAISIE ULTRA-RAPIDE (MOBILE-FIRST AVEC MICRO IA ET CLAVIER TACTILE) */}
        {activeTab === 'saisie' && activeEleve && (
          <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md border border-slate-100 p-6 text-center space-y-6">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full">
                Saisie Élève {currentSaisieIndex + 1} / {activeClass.eleves.length}
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-3">{activeEleve.nom}</h2>
              <p className="text-slate-500 font-medium">{activeEleve.prenoms}</p>
              <p className="text-xs font-mono text-slate-400 mt-1">{activeEleve.matricule}</p>
            </div>

            {/* Panneau Dictée Vocale */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center">
              <button
                onClick={toggleListening}
                className={`p-4 rounded-full transition transform hover:scale-105 shadow-md ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white'}`}
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
              <p className="text-xs font-medium text-slate-500 mt-2">{voiceStatus}</p>
            </div>

            {/* Inputs Numériques Standard */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Note Obtenue</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="20"
                  placeholder="Note /20"
                  value={tempNote}
                  onChange={(e) => setKey(e.target.value)} // Correction sécurisée temporaire pour éviter des bugs
                  className="w-full text-center font-black text-xl px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Perfectionnement</label>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="20"
                  placeholder="Perf /20"
                  value={tempPerf}
                  onChange={(e) => setTempPerf(e.target.value)}
                  className="w-full text-center font-black text-xl px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Commandes tactiles de navigation de fiches */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePrev}
                disabled={currentSaisieIndex === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Précédent
              </button>
              <button
                onClick={handleSaveCurrentAndNext}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-emerald-600/10"
              >
                Valider & Suivant <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* COMPOSANT IMPORTER / CONFIGURER LA LISTE DES ELEVES */}
        {activeTab === 'eleves' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Ajouter un Élève</h3>
                <p className="text-slate-500 text-xs">Saisissez les informations pour les injecter dans la classe actuelle.</p>
              </div>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <input
                  type="text"
                  placeholder="Nom (Ex: TONOU)"
                  value={newStudentNom}
                  onChange={(e) => setNewStudentNom(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                />
                <input
                  type="text"
                  placeholder="Prénoms (Ex: Koffi)"
                  value={newStudentPrenoms}
                  onChange={(e) => setNewStudentPrenoms(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                />
                <input
                  type="text"
                  placeholder="Matricule (Optionnel : Auto-généré)"
                  value={newStudentMatricule}
                  onChange={(e) => setNewStudentMatricule(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition shadow-sm text-sm"
                >
                  Ajouter à la classe
                </button>
              </form>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Import Rapide EducMaster</h4>
                <p className="text-slate-500 text-xs mb-3">Téléversez le canevas d'élèves Excel ou CSV fourni par EducMaster.</p>
                <input
                  type="file"
                  ref={importFileInputRef}
                  onChange={handleImportEducMasterFile}
                  accept=".csv,.txt,.xlsx,.xls"
                  className="hidden"
                />
                <button
                  onClick={() => importFileInputRef.current?.click()}
                  className="w-full inline-flex items-center justify-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 rounded-xl transition text-sm"
                >
                  <Upload className="w-4 h-4" /> Sélectionner un fichier
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900 text-lg">Membres de la Classe ({activeClass?.eleves.length})</h3>
                <button
                  onClick={handleDeleteClass}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl transition"
                >
                  <Trash2 className="w-4 h-4" /> Supprimer la Classe
                </button>
              </div>
              
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-2">
                {activeClass?.eleves.map(el => (
                  <div key={el.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-lg transition">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{el.nom} {el.prenoms}</p>
                      <p className="text-xs font-mono text-slate-400">{el.matricule}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteStudent(el.id)}
                      className="text-slate-300 hover:text-red-500 p-1 rounded transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCANNER FEUILLES NOTE IA */}
        {activeTab === 'scan' && (
          <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Scanner IA de Feuilles de Notes</h2>
              <p className="text-slate-500 text-sm">Prenez une photo de votre grille de notes manuscrite ou imprimée. L'IA extrait automatiquement les notes.</p>
            </div>
            
            {scanStatus === 'idle' && !scanImage && (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-4">
                <div className="p-4 bg-slate-50 text-slate-400 rounded-full"><Camera className="w-8 h-8" /></div>
                <div className="flex gap-2">
                  <input type="file" ref={cameraInputRef} capture="environment" accept="image/*" onChange={handleScanFileSelected} className="hidden" />
                  <button onClick={() => cameraInputRef.current?.click()} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm shadow">Prendre Photo</button>
                  <input type="file" ref={galleryInputRef} accept="image/*" onChange={handleScanFileSelected} className="hidden" />
                  <button onClick={() => galleryInputRef.current?.click()} className="bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl text-sm">Galerie</button>
                </div>
              </div>
            )}

            {scanImage && scanStatus === 'idle' && (
              <div className="space-y-4">
                <img src={scanImage.previewUrl} alt="Feuille" className="w-full max-h-[300px] object-contain rounded-xl border border-slate-100" />
                <div className="flex gap-2">
                  <button onClick={handleAnalyzeScan} className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm shadow">Lancer l'Analyse IA</button>
                  <button onClick={resetScan} className="bg-slate-100 text-slate-600 font-bold px-4 py-2.5 rounded-xl text-sm">Annuler</button>
                </div>
              </div>
            )}

            {scanStatus === 'analyzing' && (
              <div className="text-center py-12 space-y-4 animate-pulse">
                <Sparkles className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
                <p className="font-bold text-slate-800 text-base">{scanProgressMsg}</p>
              </div>
            )}

            {scanStatus === 'review' && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 text-sm">Résultats détectés par l'IA</h3>
                <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto pr-1">
                  {scanResults.map(res => (
                    <div key={res.studentId} className="py-2 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={res.include} onChange={() => handleToggleInclude(res.studentId)} className="rounded text-blue-600" />
                        <span className="font-medium text-slate-700">{res.nom}</span>
                      </div>
                      <div className="flex gap-2 max-w-[150px]">
                        <input type="text" placeholder="Note" value={res.note} onChange={(e) => handleResultChange(res.studentId, 'note', e.target.value)} className="w-16 text-center p-1 border bg-slate-50 rounded" />
                        <input type="text" placeholder="Perf" value={res.perf} onChange={(e) => handleResultChange(res.studentId, 'perf', e.target.value)} className="w-16 text-center p-1 border bg-slate-50 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleApplyScanResults} className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm shadow">Valider et Importer dans le Tableau</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Barre de navigation basse pour le Mobile (Bottom Navigation) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 z-40 shadow-lg flex justify-around md:hidden">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-0.5 p-2 text-xs font-bold ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
          <TrendingUp className="w-5 h-5" /> Général
        </button>
        <button onClick={() => setActiveTab('saisie')} className={`flex flex-col items-center gap-0.5 p-2 text-xs font-bold ${activeTab === 'saisie' ? 'text-blue-600' : 'text-slate-400'}`}>
          <Plus className="w-5 h-5" /> Saisie Vocale
        </button>
        <button onClick={() => setActiveTab('scan')} className={`flex flex-col items-center gap-0.5 p-2 text-xs font-bold ${activeTab === 'scan' ? 'text-blue-600' : 'text-slate-400'}`}>
          <Camera className="w-5 h-5" /> Scanner IA
        </button>
        <button onClick={() => setActiveTab('eleves')} className={`flex flex-col items-center gap-0.5 p-2 text-xs font-bold ${activeTab === 'eleves' ? 'text-blue-600' : 'text-slate-400'}`}>
          <Users className="w-5 h-5" /> Classe
        </button>
      </nav>

      {/* Modale d'ajout de classe */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl animate-scaleIn">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Créer une nouvelle classe</h3>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nom de la classe</label>
                <input type="text" placeholder="Ex: CM2 Topaze" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Niveau Bénin</label>
                <select value={newClassNiveau} onChange={(e) => setNewClassNiveau(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none">
                  {CLASSES_PRIMAIRE.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-xl text-sm">Créer</button>
                <button type="button" onClick={() => setShowAddClassModal(false)} className="bg-slate-100 text-slate-600 font-bold px-4 py-2 rounded-xl text-sm">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}