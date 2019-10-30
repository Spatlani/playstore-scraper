/*!
 * Module dependencies
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * App schema
 */

const AppSchema = new Schema({
  name: { type: String, default: '', trim: true, maxlength: 4000 },
  package: { type: String, default: '', trim: true, maxlength: 1000, unique: true },
  category: { type: String, default: '', trim: true, maxlength: 100 },
  icon: { type: String, default: '' },
  developer_name: { type: String, default: '', trim: true, maxlength: 1000 },
  screenshots: { type: [] },
  price: { type: String, default: '', trim: true, maxlength: 10 },
  screenshots: { type: [] },
  rating: { type: String, default: '' },
  description: { type: String, default: '' },
  reviews: { type: String, default: '' }
});

/**
 * Add your
 * - pre-save hooks
 * - validations
 * - virtuals
 */

/**
 * Validations
 */

AppSchema.path('name').required(true, 'App name cannot be blank');
AppSchema.path('developer_name').required(true, 'App developer name cannot be blank');

/**
 * Methods
 */

AppSchema.method = {};

/**
 * Statics
 */

AppSchema.static({

  /**
   * Find app by id
   *
   * @param {ObjectId} id
   * @api private
   */

  load: function(_id) {
    return this.findOne({ package: _id.trim().toLowerCase() })
      // .populate('user', 'name email username')
      // .populate('comments.user')
      .exec();
  },

  /**
   * List apps
   *
   * @param {Object} options
   * @api private
   */

  list: function(options) {
    const criteria = options.criteria || {};
    const page = options.page || 0;
    const limit = options.limit || 30;
    return this.find(criteria)
      // .populate('user', 'name username')
      // .sort({ createdAt: -1 })
      // .limit(limit)
      // .skip(limit * page)
      .exec();
  }
});

/**
 * Register
 */

mongoose.model('App', AppSchema);
