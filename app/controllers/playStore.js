/*!
 * Module dependencies.
 */

const mongoose = require('mongoose');
const App = mongoose.model('App');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { wrap: async } = require('co');

const groupBy = function(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

function wait (ms) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

exports.fetchNewApps = function(req, res) {
  const url = 'https://play.google.com/store/apps/top';
  puppeteer
    .launch()
    .then(browser => browser.newPage())
    .then(page => {
      return page.goto(url, {waitUntil: 'load'}).then(async function() {
        // Get the height of the rendered page
        const bodyHandle = await page.$('body');
        const { height } = await bodyHandle.boundingBox();
        await bodyHandle.dispose();
        console.log(height);
        // Scroll one viewport at a time, pausing to let content load
        const viewportHeight = page.viewport().height;
        let viewportIncr = 0;
        while (viewportIncr + viewportHeight < height) {
          await page.evaluate(_viewportHeight => {
            window.scrollBy(0, _viewportHeight);
          }, viewportHeight);
          await wait(20);
          viewportIncr = viewportIncr + viewportHeight;
        }

        // Scroll back to top
        await page.evaluate(_ => {
          window.scrollTo(0, 0);
        });

        // Some extra delay to let images load
        await wait(100);

        return await page.content();
      });
    })
    .then(html => {
      const $ = cheerio.load(html);
      const newApps = [];
      $('c-wiz > c-wiz > div').each(function() {
        const category = $(this).find('a[href*="/store/apps/collection/cluster"] > h2').text();
        if (category) {
          $(this).find('div:nth-child(1)').each(function() {
            const name = $(this).find('a[href*="/store/apps/details"] > div').text();
            const storeUrl = $(this).find('a[href*="/store/apps/details"]').attr('href');
            const package = storeUrl ? storeUrl.replace('/store/apps/details?id=', '') : '';
            const icon = $(this).find('span > span > img').attr('src') || $(this).find('span > span > img').attr('data-src');
            const developer_name = $(this).find('a[href*="/store/apps/dev"] > div').text();
            const match = newApps.filter((a) => {
              return a.package === package;
            });
            if (name && developer_name && match.length === 0) {
              newApps.push({
                name,
                icon,
                package,
                developer_name,
                category,
              });
            }

          });
        }
      });

      App.insertMany(newApps, {
        ordered: false
      }, function(err, apps) {
        if (err) console.log(err);
        exports.getApps(req, res);
      });

    })
    .catch(console.error);
};

exports.getAppByPkg = async(function*(req, res) {
  try {
    req.app = yield App.load(req.query.package);
    if (!req.app) exports.fetchSingleApp(req, res, true);

    if (req.app.description) {
      // If data already scraped, sent it back to user
      res.json(req.app);
    } else {
      // Scrape detailed data if not available
      exports.fetchSingleApp(req, res);
    }

  } catch (err) {
    res.status(404);
    res.send(err);
  }
});


exports.getApps = async(function*(req, res) {
  const page = (req.query.page > 0 ? req.query.page : 1) - 1;
  const _id = req.query.item;
  const limit = 3;
  const options = {
    limit: limit,
    page: page
  };

 if (_id) options.criteria = { _id };
 const apps = yield App.list(options);
 const count = yield App.countDocuments();

  res.json({
    title: 'Apps',
    apps: groupBy(apps, 'category'),
    page: page + 1,
    pages: Math.ceil(count / limit)
  });
});

exports.fetchSingleApp = async(function*(req, res, newApp) {
  const url = `https://play.google.com/store/apps/details?id=${req.query.package}`;
  puppeteer
    .launch()
    .then(browser => browser.newPage())
    .then(page => {
      return page.goto(url).then(function() {
        return page.content();
      });
    })
    .then(html => {
      const $ = cheerio.load(html);
      const newValues = {
        screenshots: [],
      };
      newValues.developer_name = $('a[href*="/store/apps/dev"]').text();
      newValues.reviews = $('span[aria-label*="*ratings"]').text();
      newValues.description = $('div[itemprop="description"] > span > div').html();
      newValues.icon = $('span > span > img').attr('src') || $('span > span > img').attr('data-src');

      $('button > img').each(function() {
        console.log($(this).attr('src'));
        newValues.screenshots.push($(this).attr('src'));
      });

      if (newApp) {
        newValues.category = 'Others';
        newValues.name = $('h1 > span').text();
        const storeUrl = $('a[href*="/store/apps/details"]').attr('href');
        newValues.package = storeUrl ? storeUrl.replace('/store/apps/details?id=', '') : '';

        App.insertMany([newValues], {
          ordered: false,
        }, function(err, apps) {
          if (err) {
            console.log(err);
            res.status(400);
            res.send(err.errmsg || 'Bad request.');
          } else {
            exports.getAppByPkg(req, res);
          }
        });
      } else {
        App.updateOne({ package: req.query.package }, {
          $set: newValues
        }, function(err, updateApp) {
          if (err) {
            console.log(err);
            res.status(400);
            res.send(err.errmsg || 'Bad request.');
          } else {
            exports.getAppByPkg(req, res);
          }

        });
      }
    })
    .catch(console.error);
});
