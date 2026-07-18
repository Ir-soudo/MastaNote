const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());

// 1. Sécurité CORS : Autoriser uniquement votre domaine de production et local
const allowedOrigins = [
  'https://mastanote-ai.onrender.com', // Votre nouvelle URL de déploiement Frontend
  'http://localhost:5173',
  'https://stackblitz.com'
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

// Récupération sécurisée de la clé API Chariow depuis les variables d'environnement de Render
// En local, vous pouvez la définir ou utiliser une valeur par défaut pour les tests
const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY || 'sk_live_votre_cle_ici';
const CHARIOW_BASE_URL = 'https://api.chariow.com/v1';

// 2. ROUTE MISE À JOUR : Validation et Activation via Chariow API
app.post('/api/validate-license', async (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ 
      success: false, 
      message: "La clé de licence est requise." 
    });
  }

  try {
    // Étape A : On récupère les détails de la licence auprès de Chariow
    const checkResponse = await fetch(`${CHARIOW_BASE_URL}/licenses/${licenseKey.trim()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CHARIOW_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!checkResponse.ok) {
      return res.status(404).json({ 
        success: false, 
        message: "Clé de licence invalide ou introuvable sur Chariow." 
      });
    }

    const checkResult = await checkResponse.json();
    const licenseData = checkResult.data;

    // Étape B : Vérification des statuts de validité
    if (!licenseData.is_active && licenseData.status !== 'pending_activation') {
      return res.status(400).json({ 
        success: false, 
        message: "Cette licence n'est plus active ou a été révoquée." 
      });
    }

    if (licenseData.is_expired) {
      return res.status(400).json({ 
        success: false, 
        message: "Cette licence a expiré." 
      });
    }

    // Étape C : Si la licence est neuve ou valide, on procède à l'activation de l'appareil
    if (licenseData.can_activate) {
      const activateResponse = await fetch(`${CHARIOW_BASE_URL}/licenses/${licenseKey.trim()}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CHARIOW_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_identifier: req.headers['user-agent'] || 'MastaNote_User_Device'
        })
      });

      if (!activateResponse.ok) {
        const actError = await activateResponse.json().catch(() => ({}));
        return res.status(400).json({
          success: false,
          message: actError.message || "La limite d'activation d'appareils a été atteinte."
        });
      }
    }

    // Étape D : Tout est bon ! On renvoie les infos au Frontend
    return res.json({
      success: true,
      message: "Licence Chariow validée et activée !",
      productId: licenseData.product.id, // Correspondra à prd_z2kjla30, prd_6duiuhl1, ou prd_s877x4vl
      expiresAt: licenseData.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // Date de repli si à vie
    });

  } catch (error) {
    console.error("Erreur d'appel API Chariow:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Une erreur réseau est survenue lors de la validation avec Chariow." 
    });
  }
});

// Route d'analyse de scan
app.post('/api/scan', (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Aucune image fournie." });
  }
  return res.json({ success: true, content: "[]" });
});

// Route d'accueil
app.get('/', (req, res) => {
  res.send('Serveur API MastaNote AI+ connecté à Chariow 🚀');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT}`);
});