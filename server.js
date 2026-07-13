import express from 'express';
import cors from 'cors';
import { Anthropic } from '@anthropic-ai/sdk';

const app = express();

// Render injectera automatiquement le bon port dans process.env.PORT en production
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialisation du client Anthropic avec la clé stockée sur Render
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/scan', async (req, res) => {
  try {
    const { image, students } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Aucune image fournie." });
    }

    // Appel à l'API Claude pour analyser la copie
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Tu es un enseignant expert. Analyse cette image de copie d'élève et extrait les notes. Voici la liste des élèves pour t'aider : ${JSON.stringify(students)}`
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: image
              }
            }
          ]
        }
      ]
    });

    res.json({ result: response.content[0].text });
  } catch (error) {
    console.error("Erreur lors du scan :", error);
    res.status(500).json({ error: "Erreur interne du serveur proxy." });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur proxy Anthropic actif sur le port ${PORT}`);
});