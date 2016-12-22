// == BSD2 LICENSE ==
// Copyright (c) 2016, Tidepool Project
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
var _ = require('lodash');
var sundial = require('sundial');

module.exports = function() {
  return {
    /*
     * get the date as an ISO 8601 string from any valid datetime YYYY-MM-DDTHH:mm:ss.sssZ string
     *
     * @param {string} datetime
     * @return {string} ISO 8601 string or null
     */
    getISODate: function(datetime) {
      if (_.isEmpty(datetime)) {
        return null;
      }
      return sundial.formatDeviceTime(datetime);
    },
    /*
     * get the date as an ISO 8601 string from any valid datetime formatted string
     *
     * @param {string} datetime
     * @return {string} ISO 8601 string or null
     */
    getDateFromParam : function(datetime) {
      if (_.isEmpty(datetime)) {
        return null;
      }
      return sundial.formatFromOffset(datetime, sundial.getOffsetFromTime(datetime) ,'YYYY-MM-DDTHH:mm:ss.sssZ');
    }
  };
};
