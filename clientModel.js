const { DataTypes } = require('sequelize');

module.exports = (db) => {
  return db.define('clients', {
    // Model attributes are defined here
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    // Other model options go here
  });
} 