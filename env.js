module.exports = (function(){
  var env = {};

  // The port for the server to listen on.
  env.port = process.env.PORT || process.argv[3] || 3000;

  //connection to mongo
  env.mongodb_connection_string = process.env.MONGO_CONNECTION_STRING || null;

  //Debuging set
  env.debug = process.env.DEBUG || false;

  return env;
})();
