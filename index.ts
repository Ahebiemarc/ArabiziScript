import * as fs from "fs";
import * as path from "path";
import csvParser from "csv-parser";

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

//cleanOutputFile();

// Lancer le traitement
//processFiles();
