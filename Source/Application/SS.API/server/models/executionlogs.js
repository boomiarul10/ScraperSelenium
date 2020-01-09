/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize
        .define('executionlogs',
        {
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
            logtypeid: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'logtype',
                    key: 'id'
                }
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
        },
        {
            timestamps: true,
            updatedAt: 'updated_at',
            createdAt: 'created_at',
            tableName: 'executionlogs'
        });
};
