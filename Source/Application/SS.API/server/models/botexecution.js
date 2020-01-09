/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('botexecution', {
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
    botconfigid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'botconfiguration',
        key: 'id'
      }
    },
    botexecutionstatusid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'botexecutionstatus',
        key: 'id'
      }
    },
    scheduleexecutionid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'scheduleexecution',
        key: 'id'
      }
    },
    jobcount: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    atsjobcount: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    failedjobcount: {
        type: DataTypes.INTEGER,
        allowNull: true
    }, 
    isretry: {
      type: DataTypes.BOOLEAN,
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
    tableName: 'botexecution'
  });
};
