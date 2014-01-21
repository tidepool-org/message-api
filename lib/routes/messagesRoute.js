/*
 * Copyright (c) 2014, Tidepool Project
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this
 * list of conditions and the following disclaimer in the documentation and/or other
 * materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 * IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 * NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
 
'use strict';

var log = require('../log.js')('messagesRoute.js');

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
        
        res.send(501);

        return next();
    };

    /*
        API STANDARD END-POINTS
    */

    var findById = function(req, res, next) {
        log.debug('findById: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
        
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
        log.debug('findAllById: params[%j], url[%s], method[%s]', req.params, req.url, req.method);
        res.setHeader('content-type', 'application/json');

        var groupId = req.params.groupid;
        var start = req.params.starttime;
        var end = req.params.endtime;

        crudHandler.getAllMessages(groupId, start, end, function(error,messages){
            if (error){
                log.error(error, 'Error getting messages for group[%s] from[%s] to[%s]', groupId, start, end);
                res.send(500);
            } else if(messages.length > 0) {
                res.send(200,{messages : messages});
            }else{
                log.info('messages not found for id[%s]',groupId);
                res.send(204);
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
        status: status,
        add: add,
        findAllById: findAllById,
        findById: findById
    };
};

