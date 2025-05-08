require('dotenv').config()
const bcrypt = require('bcrypt')

module.exports = {
  up: (queryInterface, Sequelize) => {
    const password = process.env.ADMIN_PASSWORD || 'password'
    const hashPassword = bcrypt.hashSync(password, 10);
    return queryInterface.bulkInsert('user', [{
      userType: '1',
      name: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: hashPassword,
      last_activity: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('user', null, {});
  },
};