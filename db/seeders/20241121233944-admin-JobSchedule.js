require('dotenv').config()
const bcrypt = require('bcrypt')

module.exports = {
  up: (queryInterface, Sequelize) => {
    const password = process.env.ADMIN_PASSWORD || 'password'
    const hashPassword = bcrypt.hashSync(password, 10);
    return queryInterface.bulkInsert('jobSchedule', [{
      job_schedule: 'Daily',
      time: new Date(),
      max_record: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('jobSchedule', null, {});
  },
};