// js/firebase-config.js

// TODO: REMPLACER PAR VOS CLES FIREBASE (Allez sur console.firebase.google.com)
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "votre-projet.firebaseapp.com",
  projectId: "votre-projet",
  storageBucket: "votre-projet.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

let db = null;
let auth = null;

// On initialise seulement si Firebase est configuré
if (firebaseConfig.apiKey !== "VOTRE_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
}
