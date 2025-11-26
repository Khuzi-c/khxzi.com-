const bcrypt = require('bcryptjs');
const fs = require('fs');
bcrypt.hash('Khuzaima@2010', 12).then(h => fs.writeFileSync('hash.txt', h));
