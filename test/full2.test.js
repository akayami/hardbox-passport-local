const {expect} = require('chai');
const testConfig = {
	port: 32123
};

const config = {};

config.morgan = 'tiny'; // tiny/combined etc.
config.workers = 1;
config.controller = {
	endpoint: [{
		server: require('http'),
		listen: {
			path: '/tmp/hardbox.sock'
		}
	}],
	vhost: {
		path: __dirname + '/vhost/'
	}
};
config.node = {
	//global_path: '/usr/lib/node_modules'
	global_path: '../'
};


let server;
let backend;

describe('Full System Test with backend', () => {
	
	beforeEach((done) => {
		const hardbox = require('hardbox/index.js');
		server = hardbox(config);
		const app = require('./lib/target');
		backend = app.listen(32124, (...arg) => {
			console.log('args', arg);
			done();
		});
	});
	
	afterEach((done) => {
		server.close((e) => {
			console.error('Server', e);
		});
		backend.close((e) => {
			console.error('backend', e);
		});
		done();
	});
	
	it('Needs to fail (404) on unsupported path', (done) => {
		require('request')({
			url: `http://localhost:${testConfig.port}/FailedPath`,
			method: 'GET'
		}, (err, res, body) => {
			console.log(body);
			expect(err).to.be.null;
			expect(res.statusCode).equal(404);
			done();
		});
	});
	
	it('Needs to work on supported path', (done) => {
		require('request')({
			url: `http://localhost:${testConfig.port}/`,
			method: 'GET'
		}, (err, res, body) => {
			console.log(body);
			expect(err).to.be.null;
			expect(res.statusCode).equal(200);
			done();
		});
	});
	
	it('Needs to work on login path which intercepted by the login module', (done) => {
		require('request')({
			url: `http://localhost:${testConfig.port}/auth/login`,
			method: 'POST',
			form: {
				customer: 'user',
				email: 'email',
				password: 'password'
			}
		}, (err, res, body) => {
			console.log(res.headers);
		//	console.log(body);
			expect(err).to.be.null;
			expect(res.statusCode).equal(200);
			//console.log('Location', res.headers.location);
			expect(res.headers.location).equal('/secure');
			console.log(body);
			done();
		});
	});
	
	// it('Needs To Fail', (done) => {
	// 	require('request')({
	// 		url: `http://login.test:${testConfig.port}/auth/login`,
	// 		method: 'POST',
	// 		form: {
	// 			customer: 'fail',
	// 			email: 'email',
	// 			password: 'password'
	// 		}
	// 	}, (err, res, body) => {
	// 		expect(err).to.be.null;
	// 		expect(res.statusCode).equal(200);
	// 		expect(res.headers.location).equal(testConfig.failed_path);
	// 		done();
	// 	});
	// });
});