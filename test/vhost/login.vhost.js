const testConfig = {
	login_ui_path: '/login',
	login_path: '/auth/login',
	failed_path: '/auth/failed',
	secure_path: '/secure',
	logout_path: '/auth/logout',
};

module.exports = {
	name: 'login.test',
	vhost: {
		protocol: 'http',
		domain: 'localhost',
		port: '32123',
		pathname: '/'
	},
	morgan: {
		format: 'tiny',
		options: {}
	},
	modules: [
		{
			name: 'hardbox-session',
			config: {
				secret: 'keyboard cat',
				resave: false,
				saveUninitialized: true,
				storeConf: {
					//class: session.MemoryStore,
					type: 'connect-redis',
					config: {
						client: require('redis-mock').createClient({})
					}
				}
			}
		},
		{
			name: 'hardbox-passport',
			config: {
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
					{
						//object: require('hardbox-passport-local'),
						name: __dirname + '/../../index.js',
						config: {
							strategy: {
								config: {
									name: 'hardbox-passport-local',
									fields: ['customer', 'email', 'password']
								}
							},
							authenticate: (credentials, cb) => {
								//console.log(credentials);
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
			}
		},
		{
			name: 'hardbox-proxy',
			config: {
				proxy: {
					target: 'http://localhost:32124',
					xfwd: true
				},
				headers: [
					['x-powered-by', 'Hardbox Reverse Proxy']
				]
			}
		}
	]
};
