/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('bothistory', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        botconfigid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'botconfiguration',
                key: 'id'
            }
        },
        browsertype: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        botname: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        outputpath: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        script: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        filepath: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true
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
            tableName: 'bothistory'
        });
};
