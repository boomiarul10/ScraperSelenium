exports.index = function (req, res) {
    res.render('index');
};

exports.partials = function (req, res) {
    var name = req.params.name;
    res.render('partials/' + name);
};


exports.client = function (req, res) {
    var name = req.params.name;
    res.render('client/view/' + name);
};


exports.bot = function (req, res) {
    var name = req.params.name;
    res.render('bot/view/' + name);
};

exports.schedule = function (req, res) {
    var name = req.params.name;
    res.render('schedule/view/' + name);
};

exports.history = function (req, res) {
    var name = req.params.name;
    res.render('history/view/' + name);
};

exports.globalSettings = function (req, res) {
    var name = req.params.name;
    res.render('globalSettings/view/' + name);
};

exports.dashboard = function (req, res) {
    var name = req.params.name;
    res.render('dashboard/view/' + name);
};