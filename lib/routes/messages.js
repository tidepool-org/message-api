'use strict';

exports.findById = function(req, res, next) {
    console.log('request', req.params, req.url, req.method);
    res.setHeader('content-type', 'application/json');
    res.send({message:['one message']});
    return next();
};

exports.findAllById = function(req, res, next) {
    console.log('request', req.params, req.url, req.method);
	res.setHeader('content-type', 'application/json');
    res.send({messages:['one message', 'two message']});
    return next();
};

exports.add = function(req, res, next) {
    console.log('request', req.params, req.url, req.method);
    
    res.send(201);
    return next();
};