const { sequelize, initDatabase, registerRebind } = require('../config/database');
const { Church, initChurchModel } = require('./Church');
const { ScriptureHistory, initScriptureHistoryModel } = require('./ScriptureHistory');

function setupAssociations() {
  Church.hasMany(ScriptureHistory, {
    foreignKey: 'churchId',
    as: 'scriptureHistories',
    onDelete: 'CASCADE'
  });

  ScriptureHistory.belongsTo(Church, {
    foreignKey: 'churchId',
    as: 'church'
  });
}

function bindModels(seqInstance) {
  initChurchModel(seqInstance);
  initScriptureHistoryModel(seqInstance);
  setupAssociations();
}

// Initial binding using the proxy sequelize
bindModels(sequelize);

// Register callback for rebinding when switching dialects (e.g. PG fallback to SQLite)
registerRebind((activeSeq) => {
  bindModels(activeSeq);
});

module.exports = {
  sequelize,
  initDatabase,
  Church,
  ScriptureHistory
};
