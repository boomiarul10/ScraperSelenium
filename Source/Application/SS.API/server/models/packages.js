/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('packages', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        filepath: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    }, {
            tableName: 'packages'
        });
};
