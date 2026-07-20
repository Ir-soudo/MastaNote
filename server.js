import express from 'express';
import cors from 'cors';

const app = express();

// Autorise votre frontend à appeler ce backend.
// En production, remplacez '*' par l'URL exacte de votre frontend
// (ex: 'https://mastanote-ai.onrender.com') pour plus de sécurité.
app.use(cors({ origin: '*' }));

// Les images encodées en base64 peuvent facilement dépasser la limite
// par défaut d'Express (100kb) — on l'augmente à 15 Mo.
app.use(express.json({ limit: '15mb' }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CHARIOW_SECRET_KEY = process.env.CHARIOW_SECRET_KEY; // clé secrète Chariow (sk_live_...), jamais côté client
const CHARIOW_API_BASE = 'https://api.chariow.com/v1';
const PORT = process.env.PORT || 3000;

// Route de contrôle simple pour vérifier que le service tourne
app.get('/', (req, res) => {
  res.send('MastaNote AI+ backend — OK');
});

// ==================================================================
// SCANNER IA — proxy sécurisé vers l'API Anthropic (clé jamais exposée)
// Appelé par SCAN_API_URL dans App.tsx : https://.../api/scan
// ==================================================================
app.post('/api/scan', async (req, res) => {
  try {
    const { imageBase64, mediaType, promptText } = req.body;

    if (!imageBase64 || !mediaType || !promptText) {
      return res.status(400).json({
        error: 'Champs manquants : imageBase64, mediaType et promptText sont requis.'
      });
    }

    if (!ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY manquante dans les variables d\'environnement.');
      return res.status(500).json({
        error: "Clé API Anthropic non configurée sur le serveur."
      });
    }

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: imageBase64 }
              },
              { type: 'text', text: promptText }
            ]
          }
        ]
      })
    });

    if (!anthropicResponse.ok) {
      const errBody = await anthropicResponse.text();
      console.error('Erreur API Anthropic:', anthropicResponse.status, errBody);
      return res.status(502).json({
        error: `Erreur de l'API Anthropic (code ${anthropicResponse.status}). Réessayez dans un instant.`
      });
    }

    const data = await anthropicResponse.json();

    const textBlock = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    return res.json({ content: textBlock });
  } catch (err) {
    console.error('Erreur /api/scan:', err);
    return res.status(500).json({
      error: "Erreur interne du serveur lors de l'analyse de l'image."
    });
  }
});

// ==================================================================
// VALIDATION DE LICENCE — intégration réelle de l'API Chariow
// Appelé par LICENSE_API_URL dans App.tsx : https://.../api/validate-license
//
// Contrat vérifié contre la documentation officielle (chariow.dev) :
//   GET  /v1/licenses/{licenseKey}          → détails + statut de la licence
//   POST /v1/licenses/{licenseKey}/activate → active la licence sur un appareil
// Toutes les réponses Chariow suivent le format { message, data, errors }.
// ==================================================================
app.post('/api/validate-license', async (req, res) => {
  try {
    const { licenseKey } = req.body;

    if (!licenseKey || typeof licenseKey !== 'string' || !licenseKey.trim()) {
      return res.status(400).json({ success: false, message: 'Clé de licence manquante.' });
    }

    if (!CHARIOW_SECRET_KEY) {
      console.error('CHARIOW_SECRET_KEY manquante dans les variables d\'environnement.');
      return res.status(500).json({ success: false, message: 'Configuration serveur incomplète.' });
    }

    const cleanKey = licenseKey.trim();
    const authHeaders = {
      'Authorization': `Bearer ${CHARIOW_SECRET_KEY}`,
      'Content-Type': 'application/json'
    };

    // --- 1. Récupération de la licence par sa clé ---
    const licenseResponse = await fetch(`${CHARIOW_API_BASE}/licenses/${encodeURIComponent(cleanKey)}`, {
      method: 'GET',
      headers: authHeaders
    });

    if (!licenseResponse.ok) {
      return res.status(200).json({
        success: false,
        message: 'Clé de licence introuvable. Vérifiez votre e-mail de confirmation Chariow.'
      });
    }

    const licenseBody = await licenseResponse.json();
    let license = licenseBody.data;

    if (!license) {
      return res.status(200).json({ success: false, message: 'Réponse Chariow invalide.' });
    }

    // --- 2. Statuts bloquants ---
    if (license.status === 'revoked') {
      return res.status(200).json({ success: false, message: 'Cette licence a été révoquée.' });
    }
    if (license.is_expired) {
      return res.status(200).json({ success: false, message: 'Cette licence a expiré.' });
    }

    // --- 3. Si pas encore active mais activable, on l'active sur cet "appareil" ---
    // L'application étant une PWA web (pas d'appareil physique unique fiable),
    // on utilise un identifiant logique fixe. Chaque enseignant n'active sa
    // licence qu'une seule fois, lors de sa toute première saisie de clé.
    if (!license.is_active) {
      if (!license.can_activate) {
        return res.status(200).json({
          success: false,
          message: "Cette licence a atteint son nombre maximal d'activations."
        });
      }

      const activateResponse = await fetch(
        `${CHARIOW_API_BASE}/licenses/${encodeURIComponent(cleanKey)}/activate`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ device_identifier: 'mastanote-ai-web-app' })
        }
      );

      if (!activateResponse.ok) {
        const errBody = await activateResponse.json().catch(() => ({}));
        console.error('Erreur activation Chariow:', activateResponse.status, errBody);
        return res.status(200).json({
          success: false,
          message: errBody.message || "Impossible d'activer cette licence."
        });
      }

      // Re-vérification après activation pour récupérer le statut à jour
      const refreshed = await fetch(`${CHARIOW_API_BASE}/licenses/${encodeURIComponent(cleanKey)}`, {
        method: 'GET',
        headers: authHeaders
      });
      const refreshedBody = await refreshed.json().catch(() => ({}));
      if (refreshedBody.data) {
        license = refreshedBody.data;
      }
    }

    // --- 4. Succès : on renvoie les infos utiles au frontend ---
    return res.json({
      success: true,
      productId: license.product?.id || null,
      expiresAt: license.expires_at || null,
      message: 'Licence activée avec succès.'
    });
  } catch (err) {
    console.error('Erreur /api/validate-license:', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur lors de la validation de la licence.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur MastaNote AI+ démarré sur le port ${PORT}`);
});