/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('variabletypehistory', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        variabletypeid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'variabletype',
                key: 'id'
            }
        },
        active: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        variabletypename: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        script: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        description: {
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
            tableName: 'variabletypehistory'
        });
};
