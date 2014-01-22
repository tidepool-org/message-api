/*
== BSD2 LICENSE ==
Copyright (c) 2014, Tidepool Project

This program is free software; you can redistribute it and/or modify it under
the terms of the associated License, which is identical to the BSD 2-Clause
License as published by the Open Source Initiative at opensource.org.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the License for more details.

You should have received a copy of the License along with this program; if
not, you can obtain one from Tidepool Project at tidepool.org.
== BSD2 LICENSE ==
 */

'use strict';

var messagesService = require('../../lib/messagesService'),
    mongojs = require('mongojs'),
    testDbInstance,
    servicePort,
    isIntegration,
    service,
    testConfig;

/*
    Setup for testing
*/
var testingHelper = function(settings) {

    isIntegration = settings.integrationTest;

    testConfig = {
        httpPort : 10002,
        mongoDbConnectionString : 'mongodb://localhost/tidepool-platform' 
    };

    servicePort = testConfig.httpPort;

    if(isIntegration){
        testDbInstance = mongojs(testConfig.mongoDbConnectionString, ['messages']);
    }

    return {
        initAndStartService : initAndStartService,
        stopService : stopService,
        mongoTestInstance : getMongoInstance,
        testConfig: getTestConfig,
        createMongoId : getMongoId,
        validateId : isValidId,
        serviceEndpoint : getServiceEndpoint
    };
    
};

function getTestConfig(){
    return testConfig;
}

function initAndStartService(crudHandler){
    service = new messagesService(crudHandler,testConfig);
    service.start();
}

function stopService(){
    service.stop();
}

function getMongoId(){
    if(isIntegration){
        return mongojs.ObjectId().toString();
    }
    return false;
}

//is the id valid given we are using mongo?
function isValidId(idString){
    try{
        mongojs.ObjectId(String(idString));
        return true;
    }
    catch(error){
        console.log('error with id string ',error);
        return false;
    }
}

function getMongoInstance(){
    if(isIntegration){
        return testDbInstance;
    }
    return false;
}

function getServiceEndpoint(){
    return 'http://localhost:'+servicePort;
}

testingHelper.sessionToken = 'afd09fe8-eebf-49fd-99b5-665571d078e2';

module.exports = testingHelper;
