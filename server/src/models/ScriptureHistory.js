const { Model, DataTypes } = require('sequelize');

class ScriptureHistory extends Model {}

const scriptureHistoryAttributes = {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  churchId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Churches',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  reference: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Reference is required' }
    }
  },
  translation: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'KJV'
  },
  verseText: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Verse text is required' }
    }
  },
  speechText: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  confidence: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 1.0
  },
  detectedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
};

/**
 * Initialize ScriptureHistory model on a given Sequelize instance.
 */
function initScriptureHistoryModel(sequelize) {
  ScriptureHistory.init(scriptureHistoryAttributes, {
    sequelize,
    modelName: 'ScriptureHistory',
    tableName: 'ScriptureHistories',
    timestamps: true
  });

  return ScriptureHistory;
}

module.exports = {
  ScriptureHistory,
  scriptureHistoryAttributes,
  initScriptureHistoryModel
};
