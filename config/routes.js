'use strict';

/**
 * Module dependencies.
 */

const home = require('../app/controllers/home');
const playStore = require('../app/controllers/playStore');

/**
 * Expose
 */

module.exports = function(app) {
  app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
  });

  app.get('/', home.index);
  app.get('/fetch-new-apps', playStore.fetchNewApps);
  app.get('/get-apps', playStore.getApps);
  app.get('/get-app-by-pkg', playStore.getAppByPkg);

  /**
   * Error handling
   */

  app.use(function(err, req, res, next) {
    // treat as 404
    if (
      err.message &&
      (~err.message.indexOf('not found') ||
        ~err.message.indexOf('Cast to ObjectId failed'))
    ) {
      return next();
    }
    console.error(err.stack);
    // error page
    res.status(500).render('500', { error: err.stack });
  });

  // assume 404 since no middleware responded
  app.use(function(req, res) {
    res.status(404).render('404', {
      url: req.originalUrl,
      error: 'Not found'
    });
  });
};
