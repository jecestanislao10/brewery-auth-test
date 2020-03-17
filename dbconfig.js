const { Sequelize } = require('sequelize');

module.exports = async (config) => {
    const sequelize = new Sequelize(config.databaseName, config.username, config.password, {
        dialect: config.dialect,
        host: config.host
      });
    return sequelize;  
};