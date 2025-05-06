import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { join } from 'path';
import { unlink } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialisation d'Express
const app = express();
const port = 3000;

// Obtenir __dirname dans un environnement ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurer Multer pour les téléversements
const upload = multer({ dest: 'uploads/' });

// Configurer Cloudinary avec vos identifiants
cloudinary.config({
  cloud_name: 'votre_cloud_name', // Remplacez par votre cloud_name
  api_key: 'votre_api_key',       // Remplacez par votre api_key
  api_secret: 'votre_api_secret'  // Remplacez par votre api_secret
});

// Middleware pour servir les fichiers statiques (facultatif, pour un formulaire HTML)
app.use(express.static('public'));

// Route GET pour afficher un formulaire de téléversement (facultatif)
app.get('/', (req, res) => {
  res.send(`
    <h1>Video Segmenter Server</h1>
    <form action="/upload-and-process" method="post" enctype="multipart/form-data">
      <label for="video">Choisissez une vidéo à segmenter :</label>
      <input type="file" id="video" name="video" accept="video/*" required>
      <button type="submit">Téléverser et Segmenter</button>
    </form>
  `);
});

// Route POST pour téléverser et segmenter une vidéo
app.post('/upload-and-process', upload.single('video'), async (req, res) => {
  // Vérifier si un fichier a été téléversé
  if (!req.file) {
    return res.status(400).send('Aucune vidéo téléversée. Veuillez sélectionner un fichier.');
  }

  const videoPath = req.file.path;

  try {
    // Téléverser la vidéo sur Cloudinary
    const result = await cloudinary.uploader.upload(videoPath, { resource_type: 'video' });

    // Supprimer le fichier temporaire après le téléversement
    await unlink(videoPath).catch((err) => {
      console.error('Erreur lors de la suppression du fichier temporaire :', err);
    });

    console.log('Vidéo téléversée :', result.secure_url);
    console.log('Public ID :', result.public_id);

    // Segmenter la vidéo (par exemple, de 6,5 à 10 secondes)
    const transformedUrl = cloudinary.url(result.public_id, {
      resource_type: 'video',
      start_offset: 6.5,  // Début à 6,5 secondes
      end_offset: 10,     // Fin à 10 secondes
      width: 640,         // Redimensionner à 640px de largeur
      height: 360,        // Redimensionner à 360px de hauteur
      crop: 'fill'        // Remplir l'espace (peut couper les bords si nécessaire)
    });

    console.log('URL de la vidéo segmentée :', transformedUrl);

    // Répondre avec un lien vers la vidéo segmentée
    res.send(`
      <h1>Vidéo segmentée avec succès !</h1>
      <p>URL de la vidéo segmentée : <a href="${transformedUrl}">${transformedUrl}</a></p>
      <video controls>
        <source src="${transformedUrl}" type="video/mp4">
        Votre navigateur ne prend pas en charge la balise vidéo.
      </video>
      <p><a href="/">Retourner au formulaire</a></p>
    `);
  } catch (error) {
    console.error('Erreur lors du téléversement sur Cloudinary :', error);
    await unlink(videoPath).catch((err) => {
      console.error('Erreur lors de la suppression du fichier temporaire :', err);
    });
    res.status(500).send('Erreur lors du téléversement de la vidéo sur Cloudinary.');
  }
});

// Route GET pour traiter une vidéo statique (optionnel, pour tester avec un fichier local)
app.get('/process-static-video', async (req, res) => {
  const staticVideoPath = join(__dirname, 'input.mp4'); // Chemin vers une vidéo statique

  // Vérifier si le fichier existe
  try {
    await fs.access(staticVideoPath);
  } catch (error) {
    return res.status(404).send('Fichier vidéo statique (input.mp4) non trouvé. Assurez-vous qu\'il est dans le répertoire du projet.');
  }

  try {
    // Téléverser la vidéo statique sur Cloudinary
    const result = await cloudinary.uploader.upload(staticVideoPath, { resource_type: 'video' });

    console.log('Vidéo statique téléversée :', result.secure_url);
    console.log('Public ID :', result.public_id);

    // Segmenter la vidéo
    const transformedUrl = cloudinary.url(result.public_id, {
      resource_type: 'video',
      start_offset: 6.5,
      end_offset: 10,
      width: 640,
      height: 360,
      crop: 'fill'
    });

    console.log('URL de la vidéo segmentée :', transformedUrl);

    // Répondre avec un lien vers la vidéo segmentée
    res.send(`
      <h1>Vidéo statique segmentée avec succès !</h1>
      <p>URL de la vidéo segmentée : <a href="${transformedUrl}">${transformedUrl}</a></p>
      <video controls>
        <source src="${transformedUrl}" type="video/mp4">
        Votre navigateur ne prend pas en charge la balise vidéo.
      </video>
      <p><a href="/">Retourner au formulaire</a></p>
    `);
  } catch (error) {
    console.error('Erreur lors du téléversement sur Cloudinary :', error);
    res.status(500).send('Erreur lors du téléversement de la vidéo statique sur Cloudinary.');
  }
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Serveur de segmentation vidéo exécuté sur le port ${port}`);
});
