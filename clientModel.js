const { DataTypes, Sequelize } = require('sequelize');
const db = require('./db')

module.exports = () => {
  return db.Sequelize.define('testTable', {
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