'use strict';

var log = require('../log.js')('messagesRoute.js');

/*
    Mongo instance of messaging-api CRUD operations
*/
module.exports = function(crudHandler) {


    /*
        Does this message have all the fields we require?
    */
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

    var findById = function(req, res, next) {
        log.debug('Request came in!  params[%j], url[%s], method[%s]', req.params, req.url, req.method);
        
        res.setHeader('content-type', 'application/json');
        var messageId = req.params.msgid;

        crudHandler.getMessage(messageId, function(error,message){
            if (error){
                log.error(error, 'Error getting message[%s]', messageId);
                res.send(500);
            } else if(message) {   
                res.send(200, {message : message});
            }else{
                log.info('message not found for id[%s]',messageId);
                res.send(204);
            }
        });

        return next();
        
    };

    var findAllById = function(req, res, next) {
        log.debug('Request came in!  params[%j], url[%s], method[%s]', req.params, req.url, req.method);
        res.setHeader('content-type', 'application/json');
        var groupId,
            start,
            end;

        groupId = req.params.groupid;
        start = req.params.starttime;
        end = req.params.endtime;

        crudHandler.getAllMessages(groupId, start, end, function(error,messages){
            if (error){
                log.error(error, 'Error getting messages for group[%s] from[%s] to[%s]', groupId, start, end);
                res.send(500);
            } else if(messages) {
                res.send(200,{messages : messages});
            }else{
                log.info('message not found for id[%s]',groupId);
                res.send(204);
            }
        });

        return next();
        
    };

    var add = function(req, res, next) {
        log.debug('Request came in!  params[%j], url[%s], method[%s]', req.params, req.url, req.method);

        var message = req.params.message;

        if(messageToSaveIsValid(message)){

            crudHandler.createMessage(message,function(error,messageId){
                if(error){
                    log.error(error, 'Error adding message[%j]', message);
                    res.send(500);
                }else{
                    res.send(201,{Id : messageId});
                }

            });

        }else{
            res.send(400);
        }
        return next();
    };

    return {
        add: add,
        findAllById: findAllById,
        findById: findById
    };
};

