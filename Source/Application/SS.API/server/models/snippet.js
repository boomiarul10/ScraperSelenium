/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('snippet', {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        userdetailid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'userdetail',
                key: 'id'
            }
        },
        name: {
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
        description: {
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
            tableName: 'snippet'
        });
};
