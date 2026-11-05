const path = require('path');
const pageViews = require('../config/pageViews');
const { pageFile } = require('../config/publicPaths');

function configureViews(app) {
    app.set('views', path.join(__dirname, '..', 'views'));
    app.set('view engine', 'ejs');
}

function sendPage(res, name) {
    // Only names from server-owned route definitions can select a template.
    if (Object.hasOwn(pageViews, name)) {
        return res.render('layouts/base', { page: { ...pageViews[name], name } });
    }
    return res.sendFile(pageFile(name));
}

module.exports = { configureViews, sendPage };
