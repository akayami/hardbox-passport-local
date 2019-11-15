const express = require('express');
const app = express();


app.get('/', (req, res) => res.send('Backend Site'));

app.use((req, res, next) => {
	res.statusCode = 404;
	res.end();
});

app.use((err,req, res) => {
	res.statusCode = 500;
	res.end();
});

module.exports = app;