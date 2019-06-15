const request = require('request');
const http = require('http');
const async = require('async');
const {expect} = require('chai');
let ser1, handler, port = 18081;


describe('Smoke Tests', () => {
	
	const login_path = '/login';
	
	beforeEach((done) => {
		let h = require('../index')({
			local: {
				login: {
					loginURL: login_path
				}
			},
			session: {
				secret: 'keyboard cat',
				resave: false,
				saveUninitialized: true,
				//cookie: {secure: true}
			},
			secureNamespace: '/secure',
			passport: {
				authenticate: {
					failureRedirect: '/login'
				}
			},
			authenticate: (cred, cb) => {
				console.debug('Authenticate');
				if (cred.customer === 'fail') {
					cb(null, false, {message: 'Incorrect Login'})
				} else {
					cb(null, {profile: 'Some User'})
				}
			},
			logoutURL: '/logout',
			loginURL: '/loginURL',
			headerName: 'hdx-user'
		});
		
		let handler = (req, res) => {
			h(req, res, (err, req, res) => {
				res.end();
			});
		};
		
		ser1 = require('http').createServer(handler).listen(port, (err) => {
			if (err) return done(err);
			done();
		})
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
					expect(res.headers.location).equal(login_path);
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
					console.log(res.headers);
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
					url: `http://localhost:${port}${login_path}`,
					method: 'POST',
					form: {
						customer: 'fail',
						email: 'email',
						password: 'password'
					}
				}, (err, res, body) => {
					expect(res.statusCode).equal(302);
					expect(res.headers.location).equal(login_path);
					return cb(err);
				});
			},
			(cb) => {
				require('request')({
					url: `http://localhost:${port}/secure`,
					method: 'GET',
					followRedirect: false
				}, (err, res, body) => {
					expect(res.statusCode).equal(302);
					return cb(err);
				});
			},
			(cb) => {
				require('request')({
					url: `http://localhost:${port}/logout`,
					method: 'GET',
					followRedirect: false
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
});