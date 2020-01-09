/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('botexecutionserverdetails', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        botexecutionid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'botexecution',
                key: 'id'
            }
        },
        processid: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        servername: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        created_at: {
            type: DataTypes.TIME,
            allowNull: false
        },
        updated_at: {
            type: DataTypes.TIME,
            allowNull: false
        }
    }, {
        timestamps: true,
        updatedAt: 'updated_at',
        createdAt: 'created_at',
        tableName: 'botexecutionserverdetails'
    });
};
