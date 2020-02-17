/*
 * intercom-datamanager
 * https://github.com/tom/intercom-datamanager
 *
 * Copyright (c) 2014 Tom Söderlund
 * Licensed under the MIT license.
 */

'use strict'

require('dotenv').config()

const { processCommandLineArguments, mapColumnArrayToObjectArray, doInChunks } = require('./objects')
const { generateCompanyIdFromName } = require('./contactInfo')
const { updateIntercomUsers, updateIntercomTags } = require('./intercom')
const config = require('./config')

let currentImportProfile = config.defaultProfile

const getImportProfile = function () {
  return config.profiles[currentImportProfile]
}

// ...
const remapFields = function (userArray, fieldNamesArray, tagArray) {
  var resultArray = []
  for (var r in userArray) {
    var userObj = {}
    var custom_attributes = {} // eslint-disable-line camelcase
    for (var fieldName in getImportProfile().fieldmapping) {
      var userDataStr = getImportProfile().fieldmapping[fieldName]
      var isCustomField = false
      if (userDataStr.indexOf('CUSTOM:') !== -1) {
        userDataStr = userDataStr.replace('CUSTOM:', '')
        isCustomField = true
      }
      for (var f in fieldNamesArray) {
        // Time stamp
        var dateStr = userArray[r][fieldNamesArray[f]]
        if (dateStr !== undefined) {
          userDataStr = userDataStr.replace('{T:' + fieldNamesArray[f] + '}', Math.round(new Date(userArray[r][fieldNamesArray[f]]).getTime() / 1000))
        }
        // String mapping multiple fields e.g. "{First Name} {Last Name}"
        if (userArray[r][fieldNamesArray[f]] !== undefined) {
          userDataStr = userDataStr.replace('{' + fieldNamesArray[f] + '}', userArray[r][fieldNamesArray[f]])
        }
      }
      // Trim space
      userDataStr = userDataStr.trim()
      // Numeric if numeric
      if (parseInt(userDataStr) + '' == userDataStr) {
        userDataStr = parseInt(userDataStr)
      }
      // Only use field if data mapping worked, e.g. no {} tags
      if (userDataStr.indexOf('{') === -1) {
        userObj[fieldName] = userDataStr
        // Custom fields
        if (isCustomField) {
          custom_attributes[fieldName] = userDataStr
          userObj.custom_attributes = custom_attributes // eslint-disable-line camelcase
          delete userObj[fieldName]
        }
        // Tags structure
        if (fieldName == 'tags' && userObj.tags && userObj.tags !== '' && tagArray) {
          var userTagArray = userObj.tags.split(',')
          for (var i = 0; i < userTagArray.length; i++) {
            tagArray.push({
              name: userTagArray[i],
              users: [{ email: userObj.email, user_id: userObj.user_id }]
            })
          };
          delete userObj.tags
        }
        // Companies structure
        if (fieldName == 'company' && userObj.company) {
          userObj.companies = [{ name: userObj.company, id: generateCompanyIdFromName(userObj.company) }]
          delete userObj.company
        }
        // Location structure
        if (fieldName == 'country') {
          userObj.location_data = [{ type: 'location_data', country_name: userObj.country }]
          delete userObj.country
        }
      }
    }
    // console.log('userObj', userObj);
    resultArray.push(userObj)
  }

  return resultArray
}

// ...
const parseCsvFile = function (fileName) {
  var fs = require('fs')
  var parse = require('csv-parse')

  var parser = parse({ delimiter: ',' }, function (err, data) {
    var fieldNames = data[0]
    var userArray = mapColumnArrayToObjectArray(data)
    var tagArray = []
    var newUserArray = remapFields(userArray, fieldNames, tagArray)
    doInChunks(newUserArray, config.bulkLimit, users => updateIntercomUsers(users, cmdLineArgs))
    if (tagArray.length > 0) {
      updateIntercomTags(tagArray, cmdLineArgs)
    }
  })

  fs.createReadStream(__dirname + '/' + fileName).pipe(parser)
}

// ...
const parseJsonFile = function (fileName) {
  fileName = fileName.replace('.json', '')
  var fieldNames = ['__v', '_id', 'country', 'email', 'externalId', 'hashedPassword', 'name', 'provider', 'role', 'salt', 'subscriptions', 'dateCreated', 'expires']
  var userArray = require(fileName)
  var newUserArray = remapFields(userArray, fieldNames)
  doInChunks(newUserArray, config.bulkLimit, users => updateIntercomUsers(users, cmdLineArgs))
}

const cmdLineArgs = processCommandLineArguments()
console.log('Parameters:', cmdLineArgs)

const main = function () {
  const fileName = cmdLineArgs[1]

  if (fileName !== undefined) {
    currentImportProfile = cmdLineArgs.profile || config.defaultProfile || 'intercom'

    if (fileName.indexOf('.csv') > 1) {
      parseCsvFile(fileName)
    } else {
      parseJsonFile(fileName)
    }
  } else {
    console.log('No import file specified.\nUsage:\nnode intercom-datamanager ../data/users.csv profile=intercom test=true')
  }
}

main()
