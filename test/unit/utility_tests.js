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

var salinity = require('salinity');
var expect = salinity.expect;

describe('utility', function() {

  var utility = require('../../lib/routes/utility')();

  describe('getDateFromParam', function() {
    it('date and time', function(done) {
      var returnedDate = utility.getISODate('2015-12-21T15:20:33');
      expect(returnedDate).to.exist;
      expect(returnedDate).to.equal('2015-12-21T15:20:33.000Z');
      done();
    });
    it('date', function(done) {
      var returnedDate = utility.getISODate('2015-12-21');
      expect(returnedDate).to.exist;
      expect(returnedDate).to.equal('2015-12-21T00:00:00.000Z');
      done();
    });
    it('date, time and offset', function(done) {
      var returnedDate = utility.getISODate('2016-12-22T16:27:10+13:00');
      expect(returnedDate).to.exist;
      expect(returnedDate).to.equal('2016-12-22T03:27:10.000Z');
      done();
    });
  });

});