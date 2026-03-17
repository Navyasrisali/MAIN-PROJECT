const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// In-Memory Database Configuration (for testing without MongoDB)
class InMemoryDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '..', '..', 'data');
    this.dbFile = path.join(this.dbPath, 'database.json');
    
    this.users = [];
    this.requests = [];
    this.reviews = [];
    this.notifications = [];
    this.nextId = 1;
    
    console.log('🚀 Starting server with persistent in-memory database...');
    console.log('💡 This is for testing only. Use MongoDB for production!');
    
    // Create data directory if it doesn't exist
    this.ensureDataDirectory();
    
    // Load existing data if available
    this.loadData();
    
    // Auto-save data every 30 seconds
    setInterval(() => {
      this.saveData();
    }, 30000);
  }

  // Ensure data directory exists
  ensureDataDirectory() {
    if (!fs.existsSync(this.dbPath)) {
      fs.mkdirSync(this.dbPath, { recursive: true });
      console.log('📁 Created data directory:', this.dbPath);
    }
  }

  // Load data from file
  loadData() {
    try {
      if (fs.existsSync(this.dbFile)) {
        const data = JSON.parse(fs.readFileSync(this.dbFile, 'utf8'));
        
        // Load data as plain objects (not reconstructing as class instances to avoid issues)
        this.users = data.users || [];
        this.requests = data.requests || [];
        this.reviews = data.reviews || [];
        this.notifications = data.notifications || [];
        this.nextId = data.nextId || 1;
        
        // Validate user data integrity and clean up corrupted accounts
        this.users = this.users.filter(user => {
          if (!user.password) {
            console.warn(`⚠️ Removing user ${user.email} - missing password field (corrupted account)`);
            return false; // Remove user without password
          }
          return true; // Keep user with password
        });
        
        // Set all users offline on server startup (since we can't track who was actually online)
        this.users.forEach(user => {
          user.isOnline = false;
        });
        
        console.log(`✅ Loaded existing data: ${this.users.length} users, ${this.requests.length} requests, ${this.reviews.length} reviews`);
        console.log(`🔄 Set all users offline on startup`);
        
        // Save the updated offline status
        this.saveData();
      } else {
        console.log('📝 No existing data file found, starting with empty database');
      }
      
      // Ensure admin account exists
      this.ensureAdminAccount();
    } catch (error) {
      console.error('❌ Error loading data:', error.message);
      console.log('🔄 Starting with empty database');
      // Still ensure admin exists even if loading failed
      this.ensureAdminAccount();
    }
  }

  // Ensure admin account exists with correct credentials
  ensureAdminAccount() {
    const adminEmail = 'admin@peerlearning.com';
    const adminExists = this.users.find(u => u.email === adminEmail);
    
    if (!adminExists) {
      try {
        const adminPassword = bcrypt.hashSync('admin123', 10);
        const adminUser = {
          id: 999,
          name: 'Admin User',
          email: adminEmail,
          role: 'admin',
          subjects: [],
          isOnline: false,
          rating: 0,
          reviewCount: 0,
          createdAt: new Date().toISOString(),
          password: adminPassword,
          isVerified: true,
          verificationStatus: 'approved',
          certificateUrl: null,
          certificateRejectionReason: null
        };
        
        this.users.push(adminUser);
        this.saveData();
        console.log('✅ Admin account created/verified: admin@peerlearning.com');
      } catch (error) {
        console.error('❌ Error creating admin account:', error.message);
      }
    } else {
      console.log('✅ Admin account exists: admin@peerlearning.com');
    }
  }

  // Save data to file
  saveData() {
    try {
      const data = {
        users: this.users,
        requests: this.requests,
        reviews: this.reviews,
        notifications: this.notifications,
        nextId: this.nextId,
        lastSaved: new Date().toISOString()
      };
      
      fs.writeFileSync(this.dbFile, JSON.stringify(data, null, 2));
      console.log('💾 Data saved to file');
    } catch (error) {
      console.error('❌ Error saving data:', error.message);
    }
  }

  // Reset database (for testing)
  reset() {
    this.users = [];
    this.requests = [];
    this.reviews = [];
    this.notifications = [];
    this.nextId = 1;
    this.saveData(); // Save the reset state
  }

  // Generate next ID
  getNextId() {
    const id = this.nextId++;
    // Save immediately when ID changes to prevent duplicate IDs after restart
    this.saveData();
    return id;
  }

  // Manual save method for important operations
  save() {
    this.saveData();
  }
}

// Create singleton instance
const db = new InMemoryDatabase();

module.exports = db;