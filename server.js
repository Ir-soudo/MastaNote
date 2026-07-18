const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. Sécurité CORS : On autorise ton frontend à dialoguer avec l'API
const allowedOrigins = [
  'https://mastanote.onrender.com', // Remplace par ton URL finale frontend sur Render
  'http://localhost:5173',          // Pour les tests locaux
  'https://stackblitz.com'          // Pour tes tests StackBlitz
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('stackblitz')) {
      callback(null, true);
    } else {
      callback(new Error('Bloqué par la sécurité CORS de MastaNote'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Simulation de base de données de clés d'activation générées via Chariow webhook
// Note : En production, ces clés proviendront de MongoDB ou PostgreSQL.
const LICENSES_DB = {
  "MN-2026-PREM-XYZ89": { productId: "prd_z2kjla30", durationMonths: 12 }, // Formule 1 An
  "MN-2026-SERE-ABC12": { productId: "prd_6duiuhl1", durationMonths: 36 }, // Formule 3 Ans
  "MN-2026-VIPX-VIP77": { productId: "prd_s877x4vl", durationMonths: 60 }  // Formule 5 Ans VIP
};

// 2. LA ROUTE MANQUANTE : Validation des licences
app.post('/api/validate-license', (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ 
      success: false, 
      message: "La clé de licence est requise." 
    });
  }

  const foundLicense = LICENSES_DB[licenseKey.trim()];

  if (!foundLicense) {
    return res.status(404).json({ 
      success: false, 
      message: "Clé invalide ou inexistante. Vérifiez votre e-mail." 
    });
  }

  // Calculer la date d'expiration
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + foundLicense.durationMonths);

  return res.json({
    success: true,
    message: "Licence validée avec succès !",
    productId: foundLicense.productId,
    expiresAt: expiresAt.toISOString()
  });
});

// 3. Route d'analyse de scan (Pour éviter les crashs)
app.post('/api/scan', (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Aucune image fournie." });
  }
  // Ta logique d'intégration avec l'API Gemini ou Vision ici...
  return res.json({ success: true, content: "[]" });
});

// Route d'accueil de l'API
app.get('/', (req, res) => {
  res.send('Serveur API MastaNote AI+ opérationnel 🚀');
});

// Écoute du port dynamique de Render
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Le serveur MastaNote tourne sur le port ${PORT}`);
});