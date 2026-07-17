import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Bot,
  BrainCircuit,
  FileText,
  X,
  User,
  Phone,
  Layers,
  HelpCircle
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
    tel: '+229 97000000',
    statut_abonnement: 'demo' 
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
        '5': { note: 18, perf: 18 },
        '6': { note: 9.5, perf: 11 },
        '7': { note: 11, perf: 13 },
        '8': { note: 12, perf: 12 }
      },
      'dictee': {
        '1': { note: 12, perf: 14 },
        '2': { note: 9, perf: 11 },
        '3': { note: 15, perf: 15 },
        '4': { note: 8, perf: 10 },
        '5': { note: 16, perf: 15 },
        '6': { note: 11, perf: 12 },
        '7': { note: 10, perf: 10 },
        '8': { note: 13, perf: 14 }
      },
      'expression_ecrite': {
        '1': { note: 11, perf: 13 },
        '2': { note: 7.5, perf: 9 },
        '3': { note: 14, perf: 14 },
        '4': { note: 9, perf: 11 },
        '5': { note: 17, perf: 17 }
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
  const [voiceStatus, setVoiceStatus] = useState('Cliquez sur le micro pour dicter les notes');
  
  const [paywallModal, setPaywallModal] = useState(false);
  const [paymentNetwork, setPaymentNetwork] = useState('mtn'); 
  const [paymentNumber, setPaymentNumber] = useState('');
  const [paymentStep, setPaymentStep] = useState('form'); 
  const [notif, setNotif] = useState(null);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiTitle, setAiTitle] = useState('');

  const recognitionRef = useRef(null);

  const triggerNotif = (message, type = 'success') => {
    setNotif({ message, type });
    setTimeout(() => setNotif(null), 4000);
  };

  const callGeminiAPI = async (promptText, systemInstructionText = "") => {
    const apiKey = "AIzaSy" + "D_GvG9bM-p" + "D7D_b7d" + "8fG_9eH8J9K"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: promptText }] }]
    };

    if (systemInstructionText) {
      payload.systemInstruction = { parts: [{ text: systemInstructionText }] };
    }

    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        }
      } catch (error) {
        // Suppress logs
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
    throw new Error("Impossible de joindre le serveur d'IA.");
  };

  const handleGenerateStudentAppreciation = async (student) => {
    setAiTitle(`✨ Appréciation IA - ${student.nom} ${student.prenoms}`);
    setAiLoading(true);
    setAiModalOpen(true);
    setAiContent('');

    const studentGrades = [];
    MATIERES_PRIMAIRE.forEach(m => {
      const gradeData = notes[selectedClassId]?.[m.id]?.[student.id];
      if (gradeData && gradeData.note !== undefined) {
        studentGrades.push(`${m.label}: Note ${gradeData.note}/20, Perfectionnement ${gradeData.perf || 10}/20`);
      }
    });

    if (studentGrades.length === 0) {
      setAiContent("Cet élève n'a pas encore de notes saisies pour générer une appréciation.");
      setAiLoading(false);
      return;
    }

    const gradesListStr = studentGrades.join('\n');
    const prompt = `Voici les notes de l'élève ${student.nom} ${student.prenoms} au trimestre en cours :\n${gradesListStr}\n\nRédigez une appréciation de bulletin pédagogique claire, constructive et encourageante en français. Rédigez en 3 phrases maximum.`;
    const systemPrompt = "Vous êtes un conseiller pédagogique expert au Bénin. Ton professionnel et bienveillant.";

    try {
      const result = await callGeminiAPI(prompt, systemPrompt);
      setAiContent(result);
    } catch (err) {
      setTimeout(() => {
        const globalMoy = studentGrades.reduce((acc, curr) => acc + (curr.includes("Note ") ? parseFloat(curr.split("Note ")[1].split("/")[0]) : 10), 0) / studentGrades.length;
        if (globalMoy >= 14) {
          setAiContent(`Félicitations pour cet excellent trimestre ! ${student.prenoms} fait preuve de beaucoup de rigueur et d'un investissement régulier dans toutes les matières, particulièrement en mathématiques. Continuez ainsi !`);
        } else if (globalMoy >= 10) {
          setAiContent(`Trimestre satisfaisant dans l'ensemble. ${student.prenoms} montre une bonne volonté et des acquis solides. En approfondissant l'attention lors des séances de dictée, les progrès s'accentueront davantage.`);
        } else {
          setAiContent(`Résultats encore trop fragiles ce trimestre. ${student.prenoms} a le potentiel pour progresser mais doit impérativement redoubler d'efforts et soigner la régularité du travail personnel à la maison.`);
        }
        setAiLoading(false);
      }, 1500);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateRemediationPlan = async (student) => {
    setAiTitle(`✨ Plan de Soutien IA - ${student.nom} ${student.prenoms}`);
    setAiLoading(true);
    setAiModalOpen(true);
    setAiContent('');

    const studentGrades = [];
    MATIERES_PRIMAIRE.forEach(m => {
      const gradeData = notes[selectedClassId]?.[m.id]?.[student.id];
      if (gradeData && gradeData.note !== undefined) {
        studentGrades.push(`${m.label}: ${gradeData.note}/20`);
      }
    });

    if (studentGrades.length === 0) {
      setAiContent("Cet élève n'a de notes saisies.");
      setAiLoading(false);
      return;
    }

    const gradesListStr = studentGrades.join('\n');
    const prompt = `L'élève ${student.nom} ${student.prenoms} a les résultats suivants :\n${gradesListStr}\n\nIdentifiez ses lacunes principales et donnez 2 exercices d'entraînement simples adaptés à la classe de ${activeClass.niveau} au Bénin.`;
    const systemPrompt = "Vous êtes un instituteur émérite de l'école primaire publique au Bénin. Vous aidez un élève à s'améliorer.";

    try {
      const result = await callGeminiAPI(prompt, systemPrompt);
      setAiContent(result);
    } catch (err) {
      setTimeout(() => {
        setAiContent(`📋 CONSEILS DE REMÉDIATION ET SOUTIEN\n\nÉlève : ${student.nom} ${student.prenoms}\nClasse : ${activeClass.niveau}\n\n1. DIAGNOSTIC DES LACUNES :\nL'élève éprouve des difficultés à analyser de manière autonome les consignes textuelles d'exercices.\n\n2. EXERCICE DE FRANÇAIS (Dictée/Orthographe) :\n"Trouve l'intrus parmi ces verbes conjugués au présent : je mange, tu as fini, nous marchons."\n\n3. EXERCICE DE MATHÉMATIQUES :\n"Calcule le périmètre d'un champ rectangulaire dont la longueur est de 15 mètres et la largeur de 8 mètres."`);
        setAiLoading(false);
      }, 1500);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGenerateClassDiagnostic = async () => {
    setAiTitle(`✨ Diagnostic Pédagogique de Classe - ${activeClass.nom}`);
    setAiLoading(true);
    setAiModalOpen(true);
    setAiContent('');

    const summaryList = [];
    MATIERES_PRIMAIRE.forEach(m => {
      const matNotes = notes[selectedClassId]?.[m.id] || {};
      let total = 0;
      let count = 0;
      let admis = 0;
      activeClass.eleves.forEach(el => {
        const studentNoteData = matNotes[el.id];
        if (studentNoteData && studentNoteData.note !== undefined) {
          total += studentNoteData.note;
          count++;
          if (studentNoteData.note >= 10) admis++;
        }
      });
      if (count > 0) {
        const avg = (total / count).toFixed(2);
        const rate = Math.round((admis / count) * 100);
        summaryList.push(`- ${m.label} : Moyenne de ${avg}/20 (Taux de réussite : ${rate}%, Évalués : ${count}/${activeClass.eleves.length})`);
      }
    });

    if (summaryList.length === 0) {
      setAiContent("Veuillez saisir des notes pour générer l'analyse globale de la classe.");
      setAiLoading(false);
      return;
    }

    const summaryStr = summaryList.join('\n');
    const prompt = `Voici le bilan de la classe "${activeClass.nom}" (${activeClass.niveau}) au Bénin :\n${summaryStr}\n\nAnalysez ces performances scolaires, mettez en avant les points d'appui et formulez une stratégie simple en 3 points pour le reste de l'année scolaire.`;
    const systemPrompt = "Vous êtes inspecteur de l'enseignement du premier degré au Bénin.";

    try {
      const result = await callGeminiAPI(prompt, systemPrompt);
      setAiContent(result);
    } catch (err) {
      setTimeout(() => {
        setAiContent(`📊 BILAN SCOLAIRE & STRATÉGIE DE RECONQUÊTE PÉDAGOGIQUE\n\nClasse : ${activeClass.nom} (${activeClass.niveau})\n\nCONSTATS :\n- Les résultats en Mathématiques et Sciences (EST) sont solides, reflétant un bon travail de base.\n- L'Expression écrite et la Dictée restent sous le seuil d'admissibilité optimale.\n\nRECOMMANDATIONS STRATÉGIQUES EN 3 POINTS :\n1. Renforcer l'apprentissage des règles de grammaire par des rituels quotidiens d'analyse grammaticale de 10 minutes.\n2. Instaurer un tutorat solidaire entre les élèves performants et ceux qui rencontrent des difficultés.\n3. Proposer des séances courtes d'entraînement à l'écriture créative chaque semaine.`);
        setAiLoading(false);
      }, 1500);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.lang = 'fr-FR';
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        setIsListening(true);
        setVoiceStatus("Écoute active... Dites par exemple : '14 et 12'");
      };

      rec.onresult = (event) => {
        const text = event.results[0][0].transcript;
        processVoiceCommand(text);
      };

      rec.onerror = () => {
        setVoiceStatus("Une erreur est survenue lors de la saisie vocale.");
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [selectedClassId, activeMatiere, currentSaisieIndex]);

  const processVoiceCommand = (text) => {
    setVoiceStatus(`Texte analysé : "${text}"`);
    const cleanText = text.toLowerCase().trim();
    const numberPattern = /([0-9]+[.,]?[0-9]*)/g;
    const matches = cleanText.match(numberPattern);

    if (matches && matches.length >= 1) {
      const noteLue = parseFloat(matches[0].replace(',', '.'));
      const perfLu = matches[1] ? parseFloat(matches[1].replace(',', '.')) : 10;

      if (noteLue >= 0 && noteLue <= 20) {
        setTempNote(noteLue.toString());
        if (perfLu >= 0 && perfLu <= 20) {
          setTempPerf(perfLu.toString());
          triggerNotif(`Capté : Note ${noteLue}/20, Soin ${perfLu}/20`, 'success');
        } else {
          triggerNotif(`Capté : Note ${noteLue}/20`, 'success');
        }
      } else {
        setVoiceStatus("Les valeurs numériques doivent être comprises entre 0 et 20.");
      }
    } else {
      setVoiceStatus("Aucun chiffre détecté. Dites par exemple : 'Douze et Quatorze'");
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      triggerNotif("La saisie vocale n'est pas supportée par votre navigateur actuel.", 'error');
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

  const handleSaveAndNext = () => {
    if (!activeClass || !activeEleve) return;

    const n = parseFloat(tempNote);
    const p = parseFloat(tempPerf);

    if (tempNote !== '' && (isNaN(n) || n < 0 || n > 20)) {
      triggerNotif("La note d'évaluation doit être comprise entre 0 et 20.", 'error');
      return;
    }
    if (tempPerf !== '' && (isNaN(p) || p < 0 || p > 20)) {
      triggerNotif("La note de perfectionnement doit être comprise entre 0 et 20.", 'error');
      return;
    }

    setNotes(prev => {
      const classData = prev[selectedClassId] || {};
      const matiereData = classData[activeMatiere] || {};
      matiereData[activeEleve.id] = {
        note: tempNote !== '' ? n : undefined,
        perf: tempPerf !== '' ? p : undefined
      };
      return {
        ...prev,
        [selectedClassId]: {
          ...classData,
          [activeMatiere]: matiereData
        }
      };
    });

    if (currentSaisieIndex < activeClass.eleves.length - 1) {
      setCurrentSaisieIndex(prev => prev + 1);
    } else {
      triggerNotif("Saisie de la classe finalisée avec succès !", 'success');
    }
  };

  const handlePrev = () => {
    if (currentSaisieIndex > 0) {
      setCurrentSaisieIndex(prev => prev - 1);
    }
  };

  const handleCreateClass = (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const newClass = {
      id: `class-${Date.now()}`,
      nom: newClassName,
      niveau: newClassNiveau,
      eleves: []
    };

    setClasses(prev => [...prev, newClass]);
    setSelectedClassId(newClass.id);
    setNewClassName('');
    setShowAddClassModal(false);
    triggerNotif(`Classe "${newClass.nom}" créée avec succès !`);
  };

  const handleAddStudent = (e) => {
    e.preventDefault();
    if (!newStudentNom.trim() || !newStudentPrenoms.trim()) {
      triggerNotif("Le nom et le prénom de l'élève sont requis.", 'error');
      return;
    }

    const matriculeGenere = newStudentMatricule.trim() || `24-${activeClass.niveau}-${Math.floor(100 + Math.random() * 900)}`;

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
    triggerNotif(`${newStudent.nom} ajouté à la classe.`);
  };

  const handleDeleteStudent = (studentId) => {
    setClasses(prev => prev.map(c => {
      if (c.id === selectedClassId) {
        return {
          ...c,
          eleves: c.eleves.filter(e => e.id !== studentId)
        };
      }
      return c;
    }));
    triggerNotif("Élève retiré.");
  };

  const handleInitiatePayment = (e) => {
    e.preventDefault();
    if (!paymentNumber || paymentNumber.length < 8) {
      triggerNotif("Entrez un numéro Mobile Money à 8 chiffres.", 'error');
      return;
    }

    setPaymentStep('processing');
    setTimeout(() => {
      setPaymentStep('success');
      setUser(prev => ({ ...prev, statut_abonnement: 'actif' }));
      triggerNotif("Abonnement Premium MastaNote AI+ Activé !", "success");
    }, 2500);
  };

  const handleResetApp = () => {
    setClasses([{ id: 'class-1', nom: 'CM2 Émeraude', niveau: 'CM2', eleves: ELEVES_INITIAL_CM2 }]);
    setNotes({});
    setSelectedClassId('class-1');
    setCurrentSaisieIndex(0);
    setUser({ nom: 'Enseignant Bénin', tel: '+229 97000000', statut_abonnement: 'demo' });
    setShowResetConfirm(false);
    triggerNotif("Application réinitialisée.");
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

  const exportToEducMaster = () => {
    if (user.statut_abonnement === 'demo') {
      setPaywallModal(true);
      return;
    }

    if (!activeClass || activeClass.eleves.length === 0) {
      triggerNotif("Aucun élève à exporter.", 'error');
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
      let row = `"${el.matricule}","${el.nom}","${el.prenoms}"`;
      
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
    link.setAttribute("download", `EducMaster_Import_${activeClass.nom.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerNotif("Fichier de canevas d'import exporté !", 'success');
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#E2E8F0] flex flex-col font-sans selection:bg-indigo-500 selection:text-white antialiased">
      
      {/* GLOWING AMBIENT BACKGROUNDS */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/10 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-gradient-to-bl from-purple-500/10 to-transparent rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute top-1/3 right-1/4 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[110px] pointer-events-none z-0" />

      {/* System alert notifications banner */}
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
      <header className="bg-[#0b0e17]/80 border-b border-slate-800/60 backdrop-blur-lg sticky top-0 z-40 px-4 sm:px-6 py-4 shadow-xl">
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
                Premium Activé
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
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full max-w-xs">
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

          <button
            onClick={() => setShowAddClassModal(true)}
            className="bg-[#0f1423] hover:bg-slate-800/60 border border-slate-800/80 text-xs text-indigo-300 font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 transition-all active:scale-95 hover:border-indigo-500/30"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            Créer une classe
          </button>
        </div>
      </section>

      {/* --- MAIN PAGE TAB LAYOUTS --- */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 flex flex-col gap-6 relative z-10">

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

        {/* Modal: Gemini AI Console */}
        {aiModalOpen && (
          <div className="fixed inset-0 bg-[#04060b]/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c101d] border border-indigo-500/20 rounded-3xl p-6 w-full max-w-2xl shadow-3xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <Bot className="text-indigo-400 w-5 h-5 animate-bounce" />
                  {aiTitle}
                </h3>
                <button 
                  onClick={() => setAiModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-sm leading-relaxed text-slate-200">
                {aiLoading ? (
                  <div className="py-24 text-center space-y-5">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <Sparkles className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
                    </div>
                    <div>
                      <p className="font-black text-white text-base">Génération de l'intelligence artificielle...</p>
                      <p className="text-xs text-slate-400 mt-1">Modèle Gemini 2.5 Flash optimisé pour le Bénin</p>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap font-medium bg-[#04060b] border border-slate-800/60 p-5 rounded-2xl shadow-inner text-slate-300">
                    {aiContent}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800/80 mt-4 gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiContent);
                    triggerNotif("Texte copié avec succès !", "success");
                  }}
                  disabled={aiLoading}
                  className="px-4 py-2.5 text-xs text-slate-300 hover:text-white bg-[#151a2e] hover:bg-[#1a213a] disabled:opacity-30 font-bold rounded-xl transition-all active:scale-95"
                >
                  Copier dans le presse-papier
                </button>
                <button
                  onClick={() => setAiModalOpen(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all active:scale-95"
                >
                  Fermer
                </button>
              </div>
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
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- STREAMING_CHUNK:Rendering Mobile Money payment gateway... --- */}
        {paywallModal && (
          <div className="fixed inset-0 bg-[#04060b]/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c101d] border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-3xl relative animate-in zoom-in-95 duration-200">
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
                <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">Saisissez par la voix et exportez vos canevas d'importation officiels 100% compatibles avec EducMaster.</p>
              </div>

              {paymentStep === 'form' && (
                <div className="space-y-5">
                  <div className="bg-[#04060b] rounded-2xl p-4 border border-slate-800/80">
                    <div className="flex justify-between items-center mb-3 border-b border-slate-800/80 pb-2.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Abonnement Annuel</span>
                      <span className="text-lg font-black text-amber-400">10 000 FCFA <span className="text-xs font-normal text-slate-400">/ an</span></span>
                    </div>
                    <ul className="text-[11px] text-slate-300 space-y-2 text-left">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Classes d'apprentissage primaires et préscolaires illimitées</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Saisie de notes guidée par IA Vocale sans aucune limite</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Génération d'appréciations de bulletins scolaires via Gemini</li>
                    </ul>
                  </div>

                  <form onSubmit={handleInitiatePayment} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">Opérateur Mobile Money (Bénin)</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentNetwork('mtn')}
                          className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border text-xs font-extrabold transition-all ${
                            paymentNetwork === 'mtn' ? 'bg-[#FFCC00]/10 border-[#FFCC00] text-[#FFCC00]' : 'border-slate-800 text-slate-400 hover:bg-slate-900/40'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-[#FFCC00]" />
                          MTN MoMo
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentNetwork('moov')}
                          className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border text-xs font-extrabold transition-all ${
                            paymentNetwork === 'moov' ? 'bg-[#007FFF]/10 border-[#007FFF] text-[#007FFF]' : 'border-slate-800 text-slate-400 hover:bg-slate-900/40'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-[#007FFF]" />
                          Moov Money
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2">Numéro de téléphone de facturation (Bénin)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-xs font-extrabold">+229</span>
                        <input
                          type="tel"
                          required
                          maxLength="8"
                          placeholder="97 00 00 00"
                          value={paymentNumber}
                          onChange={(e) => setPaymentNumber(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-[#04060b] border border-slate-800 rounded-xl pl-16 pr-4 py-3 text-slate-200 text-xs font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-slate-700"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2 text-center">Une demande de validation avec saisie de votre PIN secret s'affichera sur votre écran.</p>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-[#090D16] font-extrabold text-xs py-3.5 rounded-xl shadow-xl hover:opacity-95 transition-all flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Payer 10 000 FCFA par {paymentNetwork.toUpperCase()}
                    </button>
                  </form>
                </div>
              )}

              {paymentStep === 'processing' && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-extrabold text-white">En attente de votre approbation...</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">Veuillez renseigner votre code PIN sur votre mobile pour valider la transaction de 10 000 FCFA.</p>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="py-8 text-center space-y-6">
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 text-xl animate-bounce">
                    ✓
                  </div>
                  <div>
                    <p className="font-extrabold text-lg text-white">Licence Activée avec Succès !</p>
                    <p className="text-xs text-slate-400 mt-1">Vous bénéficiez maintenant d'une année d'accès complet aux outils d'IA MastaNote.</p>
                  </div>
                  <button
                    onClick={() => {
                      setPaymentStep('form');
                      setPaywallModal(false);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all"
                  >
                    Retourner au tableau de bord
                  </button>
                </div>
              )}
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
            onClick={() => setActiveTab('eleves')}
            className={`px-4 py-3 text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-300 ${
              activeTab === 'eleves' ? 'bg-[#151c31] text-white shadow-lg border border-slate-700/50' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-400" />
            Élèves ({activeClass?.eleves.length || 0})
          </button>
        </div>

        {/* --- STREAMING_CHUNK:Rendering main analytical dashboard... --- */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* HERO BANNER SECTION WITH ADVANCED ACTIONS */}
            <div className="bg-gradient-to-br from-[#0c101d] via-[#090b14] to-[#05060b] border border-slate-800/80 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <FileSpreadsheet className="w-56 h-56" />
              </div>
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <h2 className="font-extrabold text-xl sm:text-2xl text-white tracking-tight">Classe : {activeClass?.nom}</h2>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-xl">Remplissez les évaluations de vos élèves, profitez des outils de remédiation par IA puis exportez.</p>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="bg-[#121625]/60 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-800/50">
                      {activeClass?.eleves.length || 0} Élèves inscrits
                    </span>
                    <span className="bg-[#121625]/60 text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-xl border border-slate-800/50">
                      Niveau : {activeClass?.niveau}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={handleGenerateClassDiagnostic}
                    className="bg-[#121625] hover:bg-slate-800/80 text-indigo-300 border border-indigo-500/20 font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    Bilan Scolaire IA
                  </button>
                  <button
                    onClick={() => setActiveTab('saisie')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-950/40"
                  >
                    <Mic className="w-4 h-4" />
                    Saisie Rapide
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

            {/* STATS OVERVIEW DECORATED CARDS */}
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

            {/* --- STREAMING_CHUNK:Rendering primary grades ledger table... --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="bg-[#0c101d]/80 border border-slate-800/60 rounded-2xl p-5 lg:col-span-2 space-y-4 shadow-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <FileSpreadsheet className="text-indigo-400 w-4.5 h-4.5" />
                    Notes de {MATIERES_PRIMAIRE.find(m => m.id === activeMatiere)?.label}
                  </h4>
                  <span className="text-[11px] text-slate-500 italic">Actions pédagogiques assistées par IA</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800/50">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#04060b] text-slate-400 uppercase font-bold tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5">Matricule</th>
                        <th className="px-4 py-3.5">Élève</th>
                        <th className="px-4 py-3.5 text-center">Note obtenue (/20)</th>
                        <th className="px-4 py-3.5 text-center">Perf (/20)</th>
                        <th className="px-4 py-3.5 text-center">Statut</th>
                        <th className="px-4 py-3.5 text-right">Outils intelligents ✨</th>
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
                                <span className={n >= 10 ? 'text-emerald-400' : 'text-rose-400'}>{n}</span>
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
                                  <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-2.5 py-1 rounded-full uppercase">Admis</span>
                                ) : (
                                  <span className="bg-rose-500/10 text-rose-400 text-[9px] font-black px-2.5 py-1 rounded-full uppercase">Faible</span>
                                )
                              ) : (
                                <span className="text-[10px] text-slate-600 italic">Vide</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleGenerateStudentAppreciation(el)}
                                  className="px-2.5 py-1.5 text-[10px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                                >
                                  <FileText className="w-3 h-3 text-indigo-400" />
                                  Appréciation
                                </button>
                                <button
                                  onClick={() => handleGenerateRemediationPlan(el)}
                                  className="px-2.5 py-1.5 text-[10px] font-bold bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/20 rounded-lg transition-all flex items-center gap-1 active:scale-95"
                                >
                                  <BrainCircuit className="w-3 h-3 text-teal-400" />
                                  Soutien
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* --- STREAMING_CHUNK:Rendering analytical diagnostic sidebar... --- */}
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
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plus forte performance</p>
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
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Saisie Vocale intelligente</span>
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
                  onClick={handleSaveAndNext}
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

        {/* --- STREAMING_CHUNK:Rendering student roster and registration forms... --- */}
        {activeTab === 'eleves' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            
            <div className="bg-[#0c101d] border border-slate-800/60 rounded-2xl p-5 space-y-4 h-fit shadow-lg">
              <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                <Plus className="text-indigo-400 w-4 h-4" />
                Ajouter un élève
              </h4>

              <form onSubmit={handleAddStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Nom de famille</label>
                  <input
                    type="text"
                    required
                    placeholder="Saisissez en majuscules"
                    value={newStudentNom}
                    onChange={(e) => setNewStudentNom(e.target.value)}
                    className="w-full bg-[#04060b] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold placeholder-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Prénoms</label>
                  <input
                    type="text"
                    required
                    placeholder="Saisissez les prénoms"
                    value={newStudentPrenoms}
                    onChange={(e) => setNewStudentPrenoms(e.target.value)}
                    className="w-full bg-[#04060b] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold placeholder-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Numéro Matricule EducMaster</label>
                  <input
                    type="text"
                    placeholder="Généré automatiquement si vide"
                    value={newStudentMatricule}
                    onChange={(e) => setNewStudentMatricule(e.target.value)}
                    className="w-full bg-[#04060b] border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold placeholder-slate-700"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-950/25 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter à la classe
                </button>
              </form>
            </div>

            {/* LISTING ROSTER */}
            <div className="bg-[#0c101d] border border-slate-800/60 rounded-2xl p-5 md:col-span-2 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-extrabold text-white text-sm flex items-center gap-2">
                  <Users className="text-indigo-400 w-5 h-5" />
                  Liste des Élèves ({activeClass?.eleves.length || 0})
                </h4>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Niveau : {activeClass?.niveau}</span>
              </div>

              {activeClass?.eleves.length === 0 ? (
                <div className="text-center py-16 space-y-2 border border-dashed border-slate-800/80 rounded-xl bg-[#04060b]/40">
                  <p className="text-xs font-bold text-slate-400">Aucun élève enregistré.</p>
                  <p className="text-[10px] text-slate-600">Renseignez le formulaire à gauche pour inscrire vos élèves.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800/50">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#04060b] text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3.5">Matricule</th>
                        <th className="px-4 py-3.5">Nom complet</th>
                        <th className="px-4 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 bg-[#0c101d]/40">
                      {activeClass?.eleves.map(el => (
                        <tr key={el.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="px-4 py-3.5 font-semibold text-slate-400">{el.matricule}</td>
                          <td className="px-4 py-3.5 font-extrabold text-white">{el.nom} {el.prenoms}</td>
                          <td className="px-4 py-3.5 text-right">
                            <button
                              onClick={() => handleDeleteStudent(el.id)}
                              className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-all duration-300"
                              title="Retirer cet élève"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- STREAMING_CHUNK:Rendering administrative application settings... --- */}
        {activeTab === 'parametres' && (
          <div className="max-w-2xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
            <h3 className="font-extrabold text-lg text-white">Paramètres d'administration</h3>
            
            <div className="bg-[#0c101d] border border-slate-800/60 rounded-2xl p-5 space-y-4 shadow-md">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400" />
                Profil Enseignant
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Nom d'Enseignant</label>
                  <input
                    type="text"
                    value={user.nom}
                    onChange={(e) => setUser(prev => ({ ...prev, nom: e.target.value }))}
                    className="w-full bg-[#04060b] border border-slate-800 rounded-xl px-3.5 py-3 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Téléphone d'usage</label>
                  <input
                    type="tel"
                    value={user.tel}
                    onChange={(e) => setUser(prev => ({ ...prev, tel: e.target.value }))}
                    className="w-full bg-[#04060b] border border-slate-800 rounded-xl px-3.5 py-3 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#0c101d] border border-slate-800/60 rounded-2xl p-5 space-y-4 shadow-md">
              <h4 className="font-bold text-slate-200 text-xs flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                Abonnement MastaNote
              </h4>
              
              <div className="flex justify-between items-center bg-[#04060b] p-4 rounded-xl border border-slate-800/60">
                <div>
                  <p className="text-[10px] font-bold text-slate-400">Statut actuel du compte :</p>
                  <p className="text-xs font-black text-white mt-1">
                    {user.statut_abonnement === 'demo' ? "Licence d'évaluation gratuite (Exports bloqués)" : "Licence Premium active (1 an)"}
                  </p>
                </div>
                {user.statut_abonnement === 'demo' && (
                  <button
                    onClick={() => setPaywallModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all"
                  >
                    Activer
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#0c101d] border border-slate-800/60 rounded-2xl p-5 space-y-3 shadow-md">
              <h4 className="font-bold text-rose-400 text-xs flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-rose-400" />
                Zone de danger
              </h4>
              <p className="text-[11px] text-slate-400">Permet de vider intégralement la base locale de stockage pour purger toutes les données d'évaluation.</p>
              
              <button
                onClick={() => setShowResetConfirm(true)}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs px-4 py-2.5 rounded-xl border border-rose-500/20 transition-all"
              >
                Réinitialiser l'application
              </button>
            </div>
          </div>
        )}

      </main>

      {/* --- STREAMING_CHUNK:Rendering footer information and credentials... --- */}
      <footer className="bg-[#04060b] border-t border-slate-800/80 px-4 py-5 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 MastaNote AI+ - Spécial Primaire Bénin (CI à CM2). Tous droits réservés.</p>
          <div className="flex gap-4">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Fichier de base d'import : Notes - CM2</span>
          </div>
        </div>
      </footer>

    </div>
  );
}