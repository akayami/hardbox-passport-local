const request = require('request');
const http = require('http');
const async = require('async');
const {expect} = require('chai');
const {Console} = require('console');
let ser1, handler, port = 18081;


console = new Console({stdout: process.stdout, stderr: process.stderr});

console = require('@akayami/console-level')(console);


describe('BDD Tests', () => {

	const login_path = '/login';
	const failed_path = '/login-failed'

	const config = {
		local: {
			login: {
				loginURL: login_path // This is where authentication is posted using POST
			}
		},

		strategy: {
			config: {
				fields: ['customer', 'email', 'password']
			},
			authenticate: function (cred, done) {
				config.authenticate(cred, (err, result) => {
					if (err) {
						return done(err);
					} else if (result) {
						return done(null, result);
					} else {
						return done(null, false, {message: 'Incorrect Login'});
					}
				});
			}
		},
		// session: {
		// 	secret: 'keyboard cat',
		// 	resave: false,
		// 	saveUninitialized: true,
		// 	//cookie: {secure: true}
		// },
		// secureNamespace: '/secure', 		// This is the secured namespace for which login is checked
		passport: {
			authenticate: {
				failureRedirect: failed_path	// This is where user is redirected when login fails
			}
		},
		authenticate: (cred, cb) => {			// This is a plugable authentication function
			if (cred.customer === 'fail') {
				cb(null, false, {message: 'Incorrect Login'});
			} else {
				cb(null, {profile: 'Some User'});
			}
		},
		// logoutURL: '/logout',			// Triggers logout sequence
		// loginInterfaceURL: '/loginURL',			// Provides Login inteface
		// headerName: 'hdx-user'			// header name
	};

	beforeEach((done) => {
		//const h = require('../index')(config);

		const handler = (req, res) => {
			require('hardbox-session')({
				secret: 'keyboard cat',
				resave: false,
				saveUninitialized: true
			})(req, res, (err, req, res) => {
				require('../../hardbox-passport')({

					serializer: (user, done) => {
						console.debug('Serialize');
						done(null, user);
					},
					deserializer: (obj, done) => {
						console.debug('Deserialize');
						done(null, obj);
					},
					secureNamespace: '/secure',
					passport: {
						authenticate: {
							failureRedirect: '/login'	// This is where user is redirected when login fails
						}
					},
					logoutURL: '/logout',			// Triggers logout sequence
					loginURL: '/loginURL',			// Provides Login interface
					headerName: 'hdx-user',			// header name
					strategies: [
						{
							name: __dirname + '/../index',
							config: config
						}
					]

				})(req, res, (err, req, res) => {
					//h(req, res, (err, req, res) => {
						res.end();
					//});
				});
			});
		};

		ser1 = require('http').createServer(handler).listen(port, (err) => {
			if (err) return done(err);
			done();
		});
	});

	afterEach(() => {
		if (ser1) ser1.close();
	});


	it('Login Success', (done) => {
		async.series([
			(cb) => {
				require('request')({
					url: `http://localhost:${port}${login_path}`,
					method: 'POST',
					form: {
						customer: 'user',
						email: 'email',
						password: 'password'
					}
				}, (err, res, body) => {
					expect(res.statusCode).equal(200);
					//expect(res.headers.location).equal(login_path);
					return cb(err);
				});
			}
		], (err, res) => {
			if (err) return done(err);
			done();
		});
	});

	it('Login Failed', (done) => {
		async.series([
			(cb) => {
				require('request')({
					url: `http://localhost:${port}${login_path}`,
					method: 'POST',
					form: {
						customer: 'fail',
						email: 'email',
						password: 'password'
					}
				}, (err, res, body) => {
					expect(res.statusCode).equal(302);
					expect(res.headers.location).equal(failed_path);
					return cb(err);
				});
			}
		], (err, res) => {
			if (err) return done(err);
			done();
		});
	});

	it('No Login', (done) => {
		async.series([
			(cb) => {
				require('request')({
					url: `http://localhost:${port}/secure`,
					method: 'GET',
					followRedirect: false
				}, (err, res, body) => {
					expect(res.statusCode).equal(302);
					return cb(err);
				});
			}
		], (err, res) => {
			if (err) return done(err);
			done();
		});
	});

	it('Access Secure When Authorized', (done) => {
		const j = require('request').jar();
		const request = require('request').defaults({jar: j});
		async.series([
			(cb) => {
				request({
					url: `http://localhost:${port}${login_path}`,
					method: 'POST',
					form: {
						customer: 'user',
						email: 'email',
						password: 'password'
					}
				}, (err, res, body) => {
					expect(res.statusCode).equal(200);
					//expect(res.headers.location).equal(login_path);
					return cb(err);
				});
			},
			(cb) => {
				request({
					url: `http://localhost:${port}/secure`,
					method: 'GET',
					followRedirect: false,
					headers: {
						Cookie: j.getCookieString(`http://localhost:${port}`)
					}
				}, (err, res, body) => {
					expect(res.statusCode).equal(200);
					return cb(err);
				});
			}
		], (err, res) => {
			if (err) return done(err);
			done();
		});
	});

	it('Login Failed Full Chain', (done) => {
		async.series([
			(cb) => {
				require('request')({
					url: `http://localhost:${port}${config.local.login.loginURL}`,
					method: 'POST',
					form: {
						customer: 'fail',
						email: 'email',
						password: 'password'
					}
				}, (err, res, body) => {
					expect(res.statusCode).equal(302);
					expect(res.headers.location).equal(failed_path);
					return cb(err);
				});
			},
			(cb) => {
				require('request')({
					url: `http://localhost:${port}${config.secureNamespace}`,
					method: 'GET',
					followRedirect: false



				}, (err, res, body) => {
					expect(res.statusCode).equal(302);
					return cb(err);
				});
			},
			(cb) => {
				require('request')({
					url: `http://localhost:${port}${config.logoutURL}`,
					method: 'GET',
					followRedirect: false
				}, (err, res, body) => {
					expect(res.statusCode).equal(302);
					expect(res.headers.location).equal(config.loginInterfaceURL);
					return cb(err);
				});
			}
		], (err, res) => {
			if (err) return done(err);
			done();
		});
	});
});