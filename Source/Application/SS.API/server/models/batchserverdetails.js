module.exports = function (sequelize, DataTypes) {
    return sequelize.define('batchserverdetails', {
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
        tableName: 'batchserverdetails'
    });
};
