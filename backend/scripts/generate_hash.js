const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'ClubLeaders';
  const saltRounds = 12;  // Same as in utils/auth.js
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash verification:', isValid);
    
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generateHash();