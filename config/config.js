require('dotenv').config({ path: `${process.cwd()}/.env` });

module.exports = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: "mysql",
    // Uncomment if you want to use sequelize for seeder storage
    // seederStorage: "sequelize",
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",

    // Uncomment to disable logging or set to a custom logging function
    // logging: false,

    dialectOptions: {
      connectTimeout: 60000, // Connection timeout in milliseconds (60 seconds)
      ssl: {
        require: true,
        rejectUnauthorized: false, // Adjust based on your SSL setup
      },
    },

    pool: {
      max: 10, // Maximum number of connections in the pool
      min: 0, // Minimum number of connections in the pool
      acquire: 60000, // Maximum time Sequelize will wait to acquire a connection (ms)
      idle: 10000, // Maximum time a connection can remain idle before being released (ms)
    },

    timezone: "+07:00", // Adjust timezone to match your server settings
  },
};
