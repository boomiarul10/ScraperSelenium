/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('scheduleexecution', {
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
        clientid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'client',
                key: 'id'
            }
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
            tableName: 'scheduleexecution'
        });
};
