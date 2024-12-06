import * as fs from "fs";
import * as path from "path";
import csvParser from "csv-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Phrase from "./src/Model";
import PhraseTest from "./src/ModelTest";


// Charger les variables d'environnement
dotenv.config();


// Chemin du fichier de sortie
const outputFilePath = path.resolve(__dirname, "output.txt");

// Expression régulière pour détecter les émojis
const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{1F400}-\u{1F7FF}]|[\u{200D}]|[\u{1F90D}-\u{1F93A}]|[\u{1F980}-\u{1F9E0}]/gu;


// Fonction pour lire un fichier .txt et extraire les phrases
const readTxtFile = (filePath: string): string[] => {
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .map((line) => line.split(";")[0].trim()) // Récupérer uniquement le texte avant le `;`
    .filter((line) => line); // Supprimer les lignes vides
};

// Fonction pour lire un fichier .csv et extraire les phrases
const readCsvFile = (filePath: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const phrases: string[] = [];
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (row) => {
        // Vérifier si les colonnes "text" ou "InputText" existent
        const phrase = row.text || row.InputText;
        if (phrase) {
          phrases.push(phrase.trim());
        }
      })
      .on("end", () => resolve(phrases))
      .on("error", (err) => reject(err));
  });
};

// Fonction pour ajouter des phrases uniques dans un fichier .txt
const writeUniquePhrases = (phrases: string[]): void => {
  const existingPhrases = new Set<string>();

  // Charger les phrases existantes dans le fichier de sortie
  if (fs.existsSync(outputFilePath)) {
    const content = fs.readFileSync(outputFilePath, "utf-8");
    content.split("\n").forEach((line) => existingPhrases.add(line.trim()));
  }

  // Ajouter les nouvelles phrases uniques
  const newPhrases = phrases.filter((phrase) => !existingPhrases.has(phrase));
  if (newPhrases.length > 0) {
    fs.appendFileSync(outputFilePath, newPhrases.join("\n") + "\n");
    console.log(`${newPhrases.length} nouvelles phrases ajoutées.`);
  } else {
    console.log("Aucune nouvelle phrase à ajouter.");
  }
};

// Fonction principale pour traiter les fichiers
const processFiles = async (): Promise<void> => {
  try {
    const inputDir = path.resolve(__dirname, "input");
    const files = fs.readdirSync(inputDir);

    let allPhrases: string[] = [];

    for (const file of files) {
      const filePath = path.join(inputDir, file);
      if (file.endsWith(".txt")) {
        console.log(`Traitement du fichier .txt : ${file}`);
        allPhrases = allPhrases.concat(readTxtFile(filePath));
      } else if (file.endsWith(".csv")) {
        console.log(`Traitement du fichier .csv : ${file}`);
        const phrasesFromCsv = await readCsvFile(filePath);
        allPhrases = allPhrases.concat(phrasesFromCsv);
      }
    }

    // Écrire les phrases uniques dans le fichier de sortie
    writeUniquePhrases(allPhrases);
  } catch (error) {
    console.error("Erreur lors du traitement des fichiers :", error);
  }
};

// Fonction pour supprimer les émojis d'une chaîne
const removeEmojis = (text: string): string => {
    return text.replace(emojiRegex, "").trim();
};



// Fonction principale pour nettoyer le fichier output.txt
const cleanOutputFile = (): void => {
    if (fs.existsSync(outputFilePath)) {
      // Lire le contenu du fichier
      const content = fs.readFileSync(outputFilePath, "utf-8");
      const lines = content.split("\n");
  
      // Supprimer les émojis de chaque ligne
      const cleanedLines = lines.map((line) => removeEmojis(line));
  
      // Réécrire le fichier avec les lignes nettoyées
      fs.writeFileSync(outputFilePath, cleanedLines.join("\n") + "\n");
      console.log("Fichier output.txt nettoyé des émojis.");
    } else {
      console.log("Le fichier output.txt n'existe pas.");
    }
};



// Connexion à MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL!);
    console.log("Connecté à MongoDB !");
  } catch (error) {
    console.error("Erreur de connexion à MongoDB :", error);
    process.exit(1);
  }
};


// Fonction pour ajouter les phrases

const addPhrasesToDB = async ()  =>{
  try {
    const filePath = outputFilePath;
    
    if (!fs.existsSync(filePath)) {
      throw new Error("Le fichier output.txt n'existe pas");
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const phrases = content.split("\n").filter((line) => line.trim());
    let i = 0;
    for(const text of phrases){
      try{
        await PhraseTest.create({Arabizi: text});
        console.log(`Phrase ajouté ${i}`);
        i += 1;

      } catch (err : any){
        if (err.code === 11000) {
          console.log(`Phrase déjà existante : ${text} ::: ${i}`);
        } else {
          console.error(`Erreur pour la phrase "${text}":`, err);
        }
        //console.error(`Erreur pour la phrase "${text}":`, err.message);
      }
    }

    console.log("Toutes les phrases ont été traitées." + i.toString());
  } catch (err) {
    console.error("Erreur :", err);

  }finally {
    mongoose.disconnect();
  }
}

// Fonction pour exporter les phrases
const exportPhrasesToFile = async () => {
  try {
    const phrases = await Phrase.find({}, { text: 1, _id: 0 }); // Récupérer uniquement le champ `text`
    const filePath = path.resolve(__dirname, "exported_phrases.txt");

    // Écrire les phrases dans le fichier
    const content = phrases.map((phrase) => phrase.Arabizi).join("\n");
    fs.writeFileSync(filePath, content, "utf-8");

    console.log(`Phrases exportées avec succès dans : ${filePath}`);
  } catch (error) {
    console.error("Erreur lors de l'exportation :", error);
  } finally {
    mongoose.disconnect();
  }
};


// Fonction pour importer les données depuis le fichier JSON
const importPhrasesFromJson = async () => {
  try {
    const filePath = path.resolve(__dirname, "updated_standardized_dataset.json"); // Met à jour le chemin selon où se trouve ton fichier JSON

    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      throw new Error("Le fichier JSON n'existe pas !");
    }

    // Lire et analyser le fichier JSON
    const jsonData = fs.readFileSync(filePath, "utf-8");
    const phrases = JSON.parse(jsonData);

    // Insérer chaque phrase dans la base de données
    for (const phrase of phrases) {
      const { Arabizi, French } = phrase;

      try {
        // Créer un nouveau document dans MongoDB
        await Phrase.create({
          Arabizi,
          French,
        });

        console.log(`Phrase ajoutée : ${Arabizi}`);
      } catch (err: any) {
        // Gérer les erreurs, par exemple si la phrase existe déjà
        if (err.code === 11000) {
          console.log(`Phrase déjà existante : ${Arabizi}`);
        } else {
          console.error(`Erreur pour la phrase "${Arabizi}":`, err);
        }
      }
    }

    console.log("Toutes les phrases ont été importées.");
  } catch (error) {
    console.error("Erreur lors de l'importation :", error);
  } finally {
    mongoose.disconnect();
  }
};

// Exécution du script
(async () => {
  await connectDB();
  //await importPhrasesFromJson();
  //await exportPhrasesToFile();
  await addPhrasesToDB();
})();




//cleanOutputFile();

// Lancer le traitement
//processFiles();
