/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('bottype', {
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
            timestamps: false,            
            tableName: 'bottype'           
        });
};
