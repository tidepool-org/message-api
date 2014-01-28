var restify = require('restify'), 
	sessiontoken = '99406ced-8052-49c5-97ee-547cc3347da6',
	mockUserApi,
	user;

user = {
	userid: 'a3d6a658-6e6a-401b-bcb3-c99268ba1804',
  	username: 'realname',
  	emails: ['foo@bar.com','myfoo@bar.org'],
  	password: 'R6LvLQ$=aTBgfj&4jqAq'
};

mockUserApi = restify.createServer({name: 'TidepoolUserMock'});
mockUserApi.use(restify.queryParser());
mockUserApi.use(restify.bodyParser());

mockUserApi.post('/serverlogin', function(req, res, next) {

	var server = req.headers['x-tidepool-server-name'];
    var pw = req.headers['x-tidepool-server-secret'];

    if((server && pw)){
		res.header('x-tidepool-session-token', sessiontoken);
		res.send(200,'machine login');
		return next();    	
    }

    res.send(401, 'Server identity not validated!');
    return next();
  
});

mockUserApi.get('/token/:usertoken', function(req, res, next) {

	var token = req.params.usertoken;

	if(token){
		res.send(200,{userid: user.userid});
		return next();
	}

	res.send(401, 'Unauthorized');
	return next();
  
});

module.exports = mockUserApi;
