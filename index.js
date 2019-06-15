const morgan = require('morgan');
const express = require('express');
const session = require('express-session');
//const ejs = require('ejs');
const passport = require('passport');
const LocalStrategy = require('passport-local-generic').Strategy;
const HttpForbidden = require('./lib/error/http/forbidden');
const bodyParser = require("body-parser");
const app = express();

module.exports = function (config) {

	//return function (req, res, cb) {

	passport.use(new LocalStrategy({
			fields: ['customer', 'email', 'password']
		},
		function (cred, done) {
			config.authenticate(cred, (err, result) => {
				if (err) {
					return done(err)
				} else if (result) {
					return done(null, result);
				} else {
					return done(null, false, {message: 'Incorrect Login'});
				}
			});
		}
	));

	passport.serializeUser(function (user, done) {
		console.debug('Serialize');
		done(null, user);
	});

	passport.deserializeUser(function (obj, done) {
		console.debug('Deserialize');
		done(null, obj);
		// if (!config.allowedDomains || config.allowedDomains.includes(obj.domain)) {
		// 	done(null, obj);
		// } else {
		// 	done(new HttpForbidden('Domain mismatch: ' + obj.domain + ' not in ' + config.allowedDomains))
		// }
	});

	app.set('trust proxy', 1);
	// app.use(require('cookie-parser')());
	// app.set('view engine', 'ejs');
	if (config.morgan) {
		app.use(morgan(config.morgan.format, config.morgan.options));
	}
	app.use(config.local.login.loginURL, bodyParser.urlencoded({extended: false}));


	// This needs to be initialized before session (fugly)
	if (config.session.storeConf) {
		console.debug('Initializing custom store');
		const sessionStore = require(config.session.storeConf.type)(session);
		config.session.store = new sessionStore(config.session.storeConf.config);
	}

	// Session must always start before passport.session
	app.use(session(config.session));

	app.use(config.secureNamespace, passport.initialize());
	app.use(config.secureNamespace, passport.session());

	app.use(config.local.login.loginURL, passport.initialize());
	app.use(config.local.login.loginURL, passport.session());

	// app.use(config.secureNamespace, (req, res, next) => {
	// 	console.debug('Secure Passport Initialize');
	// 	passport.initialize()(req, res, );
	// 	passport.session()(req, res);
	// 	next();
	// });
	//
	// app.use(config.local.login.loginURL, (req, res, next) => {
	// 	console.debug('Login Passport Initialize');
	// 	passport.initialize()(req, res);
	// 	console.debug('* Login Passport Initialize')
	// 	passport.session()(req, res);
	// 	console.debug('*** Login Passport Initialize')
	// 	next();
	// });


	app.use((req, res, next) => {
		req.session.views = (req.session.views || 0) + 1;
		res.append('session-view-count', req.session.views);
		next();
	});


	//return function (req, res, cb) {

	if (config.forwardLogin === false) {
		app.get(config.loginURL, function (req, res, next) {
			req.internalURL = true;
			res.render('login');
		})
	}


	app.post(config.local.login.loginURL, passport.authenticate('local-generic', config.passport.authenticate));

	// app.post(
	// 	config.local.login.loginURL, (req, res) => {
	// 		console.debug('Running Passport Authenticate');
	// 		passport.authenticate('local-generic', config.passport.authenticate)(req, res);
	// 	}
	// );

	app.get(config.logoutURL, function (req, res, next) {
		console.debug('Logout Handler');
		req.internalURL = true;
		req.session.destroy();
		req.logout();
		res.redirect(config.loginURL);
	});

	app.use(config.secureNamespace, function (req, res, next) {
		if (!req.user) {
			console.debug('No User Session');
			console.debug('Unauthorized allowed: ', !config.allowUnauthorized !== true);
			console.debug('Internal URL: ', !req.internalURL !== true);
			if (config.allowUnauthorized !== true && req.internalURL !== true) {
				console.debug('Redirecting...' + config.loginURL);
				res.redirect(config.loginURL);
			} else {
				console.debug('Allow unauthorized access on - Letting through');
				next();
			}
		} else {
			next();
		}
	});

	return function (req, res, cb) {

		app.use(function (err, req, res, next) {
			if (err instanceof HttpForbidden) {
				req.session.destroy();
				req.logout();
			}
			cb(err, req, res);
		});

		app.use(function (req, res, next) {
			console.log('here');
			if (req.user) {
				res.setHeader(config.headerName, JSON.stringify(req.user));
				//res.proxyHeaders.push([config.headerName, JSON.stringify(req.user)]);
			}
			cb(null, req, res);
		});

		app(req, res)
	}
};