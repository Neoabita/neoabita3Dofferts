module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, firstName, lastName, phone, source } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requis' });
  }

  // Formater le numéro de téléphone en format international
  let formattedPhone = '';
  if (phone) {
    // Enlever espaces, points, tirets, parenthèses
    let cleaned = phone.replace(/[\s.\-\(\)]/g, '');
    
    // Gérer le +33 ou 0033 déjà présent
    if (cleaned.startsWith('+33')) {
      formattedPhone = cleaned;
    } else if (cleaned.startsWith('0033')) {
      formattedPhone = '+33' + cleaned.substring(4);
    } else if (cleaned.startsWith('33') && cleaned.length === 11) {
      formattedPhone = '+' + cleaned;
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
      formattedPhone = '+33' + cleaned.substring(1);
    } else if (cleaned.length === 9 && !cleaned.startsWith('0')) {
      formattedPhone = '+33' + cleaned;
    } else if (cleaned.length > 0) {
      formattedPhone = cleaned.startsWith('+') ? cleaned : '+' + cleaned;
    }
  }

  // Liste Neoabita Plans 3D = 67
  const listId = 67;

  try {
    // Créer ou mettre à jour le contact
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        attributes: {
          FIRSTNAME: firstName || '',
          LASTNAME: lastName || '',
          SMS: formattedPhone,
          SOURCE: source || 'neoabita-plans-3d'
        },
        listIds: [listId],
        updateEnabled: true
      })
    });

    if (response.ok || response.status === 201) {
      return res.status(200).json({ success: true, message: 'Contact créé', email });
    }

    // Si le contact existe déjà (204), c'est OK
    if (response.status === 204) {
      return res.status(200).json({ success: true, message: 'Contact mis à jour', email });
    }

    const errorData = await response.text();
    console.error('Brevo error:', response.status, errorData);
    return res.status(500).json({ error: 'Erreur Brevo', details: errorData });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
