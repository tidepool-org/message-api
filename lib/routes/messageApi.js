// == BSD2 LICENSE ==
// Copyright (c) 2014, Tidepool Project
// 
// This program is free software; you can redistribute it and/or modify it under
// the terms of the associated License, which is identical to the BSD 2-Clause
// License as published by the Open Source Initiative at opensource.org.
// 
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
// FOR A PARTICULAR PURPOSE. See the License for more details.
// 
// You should have received a copy of the License along with this program; if
// not, you can obtain one from Tidepool Project at tidepool.org.
// == BSD2 LICENSE ==
 
'use strict';

var log = require('../log.js')('messageApi.js');

/*
    Mongo instance of messaging-api CRUD operations
*/
module.exports = function(crudHandler) {


    /*
        HELPER METHODS
    */

    //Ensure all the details are valid before we save a new message
    var messageToSaveIsValid = function(message){

        if (message.userid !== '' &&
            message.groupid !== '' &&
            message.timestamp !== '' &&
            message.messagetext !== ''){
            return true;
        } else {
            log.warn('message format[%j] is invalid.',message);
            return false;
        }
    };

    /*
       API HEALTH CHECK END-POINTS
    */

    //status check for the API to let us know all is good or if not what is down
    var status = function(req, res, next) {
        log.debug('status: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

        if (req.params.status) {
            console.log('we have a status ',parseInt(req.params.status));
            res.send(parseInt(req.params.status));
        } else {

            console.log('via the handler ');
            crudHandler.status(function(error,result){
                log.info('returning status ' + result.statuscode);
                res.send(result.statuscode, result.deps);
            });
        }
        return next();
    };

    /*
        API STANDARD END-POINTS
    */

    var findById = function(req, res, next) {
        log.debug('findById: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

        res.setHeader('content-type', 'application/json');
        var messageId = req.params.msgid;

        crudHandler.getMessage(messageId, function(error,foundMessage){
            if (error){
                log.error(error, 'Error getting message[%s]', messageId);
                res.send(500);
            } else {

                if(foundMessage) {   
                    res.send(200, {message : foundMessage});
                }else{
                    log.info('message not found for id[%s]',messageId);
                    res.send(204);
                }
            }
        });

        return next();
        
    };

    var findAllById = function(req, res, next) {
        log.debug('findAllById: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

        res.setHeader('content-type', 'application/json');

        var groupId = req.params.groupid;
        var start = req.params.starttime;
        var end = req.params.endtime;

        crudHandler.getAllMessages(groupId, start, end, function(error,messages){
            if (error){
                log.error(error, 'Error getting messages for group[%s] from[%s] to[%s]', groupId, start, end);
                res.send(500);
            }else{
                if (messages && messages.length>0){
                    res.send(200,{messages : messages});
                }else{
                    res.send(204);
                }
            }
        });

        return next();
        
    };

    var add = function(req, res, next) {
        log.debug('add: params[%j], url[%s], method[%s]', req.params, req.url, req.method);

        var message = req.params.message;

        if(messageToSaveIsValid(message)){

            crudHandler.createMessage(message,function(error,messageId){
                if(error){
                    log.error(error, 'Error adding message[%j]', message);
                    res.send(500);
                } else {
                    res.send(201,{id : messageId});
                }
            });

        } else {
            res.send(400);
        }

        return next();
    };

    return {
        status: status,
        add: add,
        findAllById: findAllById,
        findById: findById
    };
};

