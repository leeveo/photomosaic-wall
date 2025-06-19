/**
 * Script pour vérifier et corriger la clé de service Supabase
 * Exécutez avec: node scripts/fix-service-key.js
 */

const fs = require('fs');
const path = require('path');

// Chemin du fichier .env.local
const envPath = path.join(__dirname, '..', '.env.local');

try {
  // Lire le fichier .env.local
  console.log('Lecture du fichier .env.local...');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Vérifier si la clé contient "rose" au lieu de "role"
  const serviceKeyLine = envContent.split('\n').find(line => 
    line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')
  );
  
  if (!serviceKeyLine) {
    console.log('SUPABASE_SERVICE_ROLE_KEY non trouvé dans .env.local');
    process.exit(1);
  }
  
  console.log('Clé de service trouvée:', serviceKeyLine.substring(0, 50) + '...');
  
  // Extraire la valeur de la clé
  const serviceKey = serviceKeyLine.split('=')[1];
  
  // Vérifier si c'est un JWT (contient des points)
  if (serviceKey.includes('.') && serviceKey.split('.').length === 3) {
    try {
      // Décoder la partie payload (2ème partie du JWT)
      const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString());
      console.log('Payload du JWT:', payload);
      
      // Vérifier si le payload contient "rose" au lieu de "role"
      if (payload.rose && !payload.role) {
        console.log('ERREUR: La clé contient "rose" au lieu de "role".');
        
        // Créer un nouveau payload avec "role" au lieu de "rose"
        const correctedPayload = { ...payload, role: payload.rose };
        delete correctedPayload.rose;
        
        console.log('Payload corrigé:', correctedPayload);
        
        // Encoder le nouveau payload
        const header = serviceKey.split('.')[0];
        const signature = serviceKey.split('.')[2];
        const correctedPayloadBase64 = Buffer.from(JSON.stringify(correctedPayload)).toString('base64')
          .replace(/=/g, '')
          .replace(/\+/g, '-')
          .replace(/\//g, '_');
        
        const correctedJWT = `${header}.${correctedPayloadBase64}.${signature}`;
        
        // Remplacer la clé dans le fichier .env.local
        const newEnvContent = envContent.replace(
          serviceKeyLine,
          `SUPABASE_SERVICE_ROLE_KEY=${correctedJWT}`
        );
        
        // Écrire le nouveau contenu dans .env.local
        fs.writeFileSync(envPath, newEnvContent, 'utf8');
        
        console.log('Clé de service corrigée et enregistrée dans .env.local');
        console.log('Redémarrez votre serveur pour appliquer les changements.');
        
        return;
      } else if (payload.role) {
        console.log('La clé est correcte, elle contient déjà "role".');
      } else {
        console.log('La clé ne contient ni "role" ni "rose". Format inattendu.');
      }
    } catch (e) {
      console.error('Erreur lors du décodage du JWT:', e);
    }
  } else {
    console.log('La clé de service n\'est pas un JWT valide.');
  }
  
} catch (error) {
  console.error('Erreur:', error);
}
