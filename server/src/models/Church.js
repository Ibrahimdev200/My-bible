const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

class Church extends Model {
  /**
   * Validates a candidate password against the stored bcrypt hash.
   * @param {string} password - Plain text password
   * @returns {Promise<boolean>}
   */
  async validatePassword(password) {
    if (!password || !this.passwordHash) {
      return false;
    }
    return bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Custom JSON serialization to avoid exposing passwordHash.
   */
  toJSON() {
    const values = { ...this.get() };
    delete values.passwordHash;
    delete values.password;
    return values;
  }
}

const churchAttributes = {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Church name is required' }
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Must be a valid email address' },
      notEmpty: { msg: 'Email is required' }
    }
  },
  pastorName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  country: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  logoPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  brandingConfig: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {
      primaryColor: '#1e40af',
      secondaryColor: '#3b82f6',
      backgroundColor: '#0f172a',
      textColor: '#ffffff',
      template: 'classic',
      displayDuration: 15,
      fontSize: 'large'
    }
  },
  selectedTranslation: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'KJV'
  }
};

/**
 * Initialize Church model on a given Sequelize instance.
 */
function initChurchModel(sequelize) {
  Church.init(churchAttributes, {
    sequelize,
    modelName: 'Church',
    tableName: 'Churches',
    timestamps: true,
    hooks: {
      beforeValidate: async (church) => {
        // If a plain password was supplied on create or update
        if (church.password) {
          church.passwordHash = await bcrypt.hash(church.password, 12);
        }
      },
      beforeSave: async (church) => {
        // Double-check if passwordHash needs hashing
        if (church.password && !church.passwordHash.startsWith('$2')) {
          church.passwordHash = await bcrypt.hash(church.password, 12);
        }
      }
    }
  });

  return Church;
}

module.exports = {
  Church,
  churchAttributes,
  initChurchModel
};
