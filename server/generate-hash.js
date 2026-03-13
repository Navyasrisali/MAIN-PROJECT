const bcrypt = require('bcryptjs');

bcrypt.hash('admin123', 10).then(hash => {
  console.log('Hash for admin123:', hash);
}).catch(err => {
  console.error('Error:', err);
});
