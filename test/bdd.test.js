const request = require('request');
const http = require('http');
const async = require('async');
const {expect} = require('chai');
const {Console} = require('console');
const express = require('express');
let ser1, handler, port = 18081;


console = new Console({stdout: process.stdout, stderr: process.stderr});

console = require('@akayami/console-level')(console);


describe('BDD Tests', () => {
	
	const testConfig = {
		port: port,
		login_path: '/auth/login',
		failed_path: '/auth/failed',
		secure_path: '/secure',
		logout_path: '/auth/logout',
		cred_valid: true,
	};
	
	beforeEach((done) => {
		
		const app = express();
		
		require('hardbox-session')(app, {
			secret: 'keyboard cat',
			resave: false,
			saveUninitialized: true
		});
		
		
		require('hardbox-passport')(app, {
			serializer: (user, done) => {
				done(null, user);
			},
			deserializer: (obj, done) => {
				done(null, obj);
			},
			secureNamespace: testConfig.secure_path,
			passport: {
				authenticate: {
					failureRedirect: '/login'	// This is where user is redirected when login fails
				}
			},
			logoutURL: testConfig.logout_path,			// Triggers logout sequence
			loginURL: '/loginURL',			// Provides Login interface
			headerName: 'hdx-user',			// header name
			strategies: [
				// {
				// 	object: require('./lib/hardbox-passport-mock'),
				// 	config: {
				// 		strategy: {
				// 			config: {
				// 				name: 'mock',
				// 				user: {
				// 					customer: 'ok'
				// 				}
				// 			},
				// 		},
				// 		authenticate: (cred, cb) => {			// This is a plugable authentication function
				// 			//cb(null, false, {message: 'Incorrect Login'})
				// 			if(testConfig.cred_valid !== true) {
				// 				//if (cred.customer === 'fail') {
				// 				cb(null, false, {message: 'Incorrect Login'});
				// 			} else {
				// 				cb(null, cred);
				// 			}
				// 		},
				// 		handlerURL: testConfig.login_path,
				// 		auth_options: {
				// 			failureRedirect: testConfig.failed_path
				// 		}
				// 	}
				// },
				{
					object: require('../index'),
					//name: 'hardbox-passport-local',
					config: {
						strategy: {
							config:	{
								fields: ['customer', 'email', 'password']
							}
						},
						// strategyConfig: {
						// 	fields: ['customer', 'email', 'password']
						// },
						authenticate: (credentials, cb) => {
							if (credentials.customer === 'fail') {
								cb(null, false, {message: 'Incorrect Login'});
							} else {
								cb(null, {profile: 'Some User'});
							}
						},
						local: {
							login: {
								loginURL: testConfig.login_path
							}
						},
						auth_options: {
							failureRedirect: testConfig.failed_path
						}
					},
				}
			]
		});
		
		app.use((req, res, next) => {
			res.status(200).end();
			next();
		});
		
		app.use((err, req, res, next) => {
			if(err.code) res.status(err.code);
			res.write(err.message);
			res.end();
			next();
		});
		
		const handler = (req, res) => {
			app(req, res);
		};
		
		ser1 = require('http').createServer(handler).listen(port, (err) => {
			if (err) return done(err);
			done();
		});
	});
	
	afterEach(() => {
		if (ser1) ser1.close();
	});
	
	require('hardbox-passport/test/shared/shared.test')(testConfig);
});