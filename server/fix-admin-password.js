const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function fixAdminPassword() {
  try {
    // Generate hash for admin123
    const hash = await bcrypt.hash('admin123', 10);
    console.log('Generated hash:', hash);
    
    // Verify it works
    const isValid = await bcrypt.compare('admin123', hash);
    console.log('Hash verification:', isValid);
    
    if (!isValid) {
      console.error('ERROR: Generated hash does not match password!');
      return;
    }
    
    // Read database
    const dbPath = path.join(__dirname, 'data', 'database.json');
    const dbContent = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(dbContent);
    
    // Find admin user
    const adminUser = db.users.find(u => u.id === 999);
    
    if (!adminUser) {
      console.error('Admin user not found!');
      return;
    }
    
    // Update password
    adminUser.password = hash;
    
    // Save database
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    
    console.log('✅ Admin password updated successfully!');
    console.log('Email: admin@peerlearning.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixAdminPassword();
