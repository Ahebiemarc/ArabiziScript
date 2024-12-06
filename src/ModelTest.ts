import {Schema, model} from 'mongoose';

// Définition du schéma pour une phrase

const phraseSchema = new Schema({
    Arabizi : {type: String, required: true, unique: true},
    French: {type: String, default: ""},
})

// Création du modèlePhrase

const Phrase = model("PhraseTest", phraseSchema);

export default Phrase;