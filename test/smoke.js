const request = require('request');
const http = require('http');
const async = require('async');
let ser1, handler;


describe('Smoke Tests', () => {
	
	
	it('test 1', (done) => {
		
		let port = 18081;
		let h = require('../index')({
			local: {
				login: {
					loginURL: '/login'
				}
			},
			session: {
				secret: 'keyboard cat',
				resave: false,
				saveUninitialized: true,
				cookie: {secure: true}
			},
			secureNamespace: '/secure',
			passport: {
				authenticate: {
					failureRedirect: '/login'
				}
			},
			authenticate: (cred, cb) => {
				if (cred.customer === 'fail') {
					cb(null, false, {message: 'Incorrect Login'})
				} else {
					cb(null, {res: 'res'})
				}
			},
			logoutURL: '/logout',
			loginURL: '/loggedIn',
			headerName: 'hdx-user'
		});
		
		let handler = (req, res) => {
			h(req, res, () => {
				res.end();
			});
		};
		
		after(() => {
			if (ser1) ser1.close();
		});
		
		ser1 = require('http').createServer(handler).listen(port, (err) => {
			if (err) return done(err);
			async.series([
				(cb) => {
					require('request')({
						url: `http://localhost:${port}/login`,
						method: 'POST',
						form: {
							customer: 'customer',
							email: 'email',
							password: 'password'
						}
					}, (err, res, body) => {
						console.log('1')
						return cb(err);
					});
				},
				(cb) => {
					require('request')({
						url: `http://localhost:${port}/secure`,
						method: 'GET'
					}, (err, res, body) => {
						console.log('2');

						return cb(err);
					});
				},
				(cb) => {
					require('request')({
						url: `http://localhost:${port}/logout`,
						method: 'GET'
					}, (err, res, body) => {
						console.log('3');

						return cb(err);
					});
				}
			], (err, res) => {
				if (err) return done(err);
				done();
			});
		});
	});
});