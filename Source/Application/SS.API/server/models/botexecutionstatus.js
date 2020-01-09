/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('botexecutionstatus', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    }
    }, {
        timestamps: true,
        updatedAt: 'updated_at',
        createdAt: 'created_at',
    tableName: 'botexecutionstatus'
  });
};
