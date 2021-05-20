# Message-api

Tidepools message API for adding context to diabetes data

## 0.5.2 - 2021-05-19
### Fixed
- Authorization middleware should inject message content in request
### Engineering
- YLP-756 Bump some dependencies
- Replace Travis with Jenkins

## 0.5.1 - 2021-03-05
### Fixed
- Remove legacy gatekeeper url (env var)

## 0.5.0 - 2021-02-16
### Changed
- YLP-473 Implement authorization rules for message-api

## 0.4.1 - 2020-10-30
### Engineering
- YLP-259 Review SOUP doc destination

## 0.4.0 2020-09-29
### Changed
- PT-1438 Make service start without MongoDb available
### Engineering
- Fix security audit && update to mongo 4.2 
- PT-1528 Base message-api image on node:10-alpine

## 0.3.1 - 2020-08-04
### Engineering
- PT-1450 Generate SOUP Report

## 0.3.0 - 2020-05-14
### Changed
- PT-1285 Integrate Tidepool master for message-api
- PT-1331 Remove highwater

## 0.2.0 - 2019-10-08
### Changed
- [PT-579] Integrate Tidepool [v0.8.0](https://github.com/tidepool-org/message-api/releases/tag/v0.8.0)

## 0.1.0 - 2019-07-30
### Changed
- Integrate Tidepool changes until v0.7.13
- Upgrade node to 6.10.2
