/**
 * Script pour vérifier la clé de service Supabase
 * Exécutez avec: node scripts/check-service-key.js
 */

const fs = require('fs');
const path = require('path');

// Chemin du fichier .env.local
const envPath = path.join(__dirname, '..', '.env.local');

// Lire le fichier .env.local
console.log('Lecture du fichier .env.local...');
const envContent = fs.readFileSync(envPath, 'utf8');

// Vérifier si la clé de service est présente
const serviceKeyLine = envContent.split('\n').find(line => 
  line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')
);

if (!serviceKeyLine) {
  console.log('SUPABASE_SERVICE_ROLE_KEY non trouvée dans .env.local');
  process.exit(1);
}

console.log('Clé de service trouvée');

// Extraire la valeur de la clé
const serviceKey = serviceKeyLine.split('=')[1];

// Vérifier si c'est un JWT (contient des points)
if (serviceKey.includes('.') && serviceKey.split('.').length === 3) {
  try {
    // Décoder la partie payload (2ème partie du JWT)
    const payload = Buffer.from(serviceKey.split('.')[1], 'base64').toString();
    const parsedPayload = JSON.parse(payload);
    console.log('Payload du JWT:', parsedPayload);
    
    // Vérifier si le payload contient "role" ou "rose"
    if (parsedPayload.role) {
      console.log('✅ La clé contient "role" - CORRECT');
    } else if (parsedPayload.rose) {
      console.log('❌ ERREUR: La clé contient "rose" au lieu de "role".');
      console.log('Corrigez cela en modifiant le JWT dans .env.local');
    } else {
      console.log('⚠️ La clé ne contient ni "role" ni "rose". Format inattendu.');
    }
    
    // Vérifier la date d'expiration
    if (parsedPayload.exp) {
      const expDate = new Date(parsedPayload.exp * 1000);
      const now = new Date();
      if (expDate > now) {
        console.log(`✅ La clé est valide jusqu'au ${expDate.toLocaleString()}`);
      } else {
        console.log(`❌ ERREUR: La clé a expiré le ${expDate.toLocaleString()}`);
      }
    }
    
    // Vérifier si la clé est formatée correctement pour Supabase
    console.log('\nPour tester la clé:');
    console.log('1. Accédez à la console Supabase');
    console.log('2. Vérifiez que le "ref" dans le JWT correspond à votre ID de projet');
    console.log('3. Assurez-vous que le champ contient "role" et NON "rose"');
    
  } catch (e) {
    console.error('Erreur lors du décodage du JWT:', e);
  }
} else {
  console.log('La clé de service n\'est pas un JWT valide. Elle doit contenir trois parties séparées par des points.');
}
