/* jshint indent: 2 */

module.exports = function (sequelize, DataTypes) {
    return sequelize.define('botconfiguration', {
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
        bottypeid: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'bottype',
                key: 'id'
            }
        },
        variancelimit: {
            type: DataTypes.INTEGER,
            allowNull: false            
        },
        spikelimit: {
            type: DataTypes.INTEGER,
            allowNull: false           
        },
        name: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        browsertype: {
            type: DataTypes.TEXT,
            allowNull: false
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
        isdeleted: {
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
            tableName: 'botconfiguration'
            //classMethods: {
            //    associate: function (models) {
            //        models.botconfiguration.hasOne(models.userdetail, { foreignKey: 'id' });
            //    }
            //}
        });
};
