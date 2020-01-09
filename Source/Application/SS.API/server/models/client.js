/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('client', {
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
        retry: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        intreval: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        isconcurrent: {
            type: DataTypes.BOOLEAN,
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
            tableName: 'client'
        });
};
