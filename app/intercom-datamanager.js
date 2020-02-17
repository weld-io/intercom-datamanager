/*
 * intercom-datamanager
 * https://github.com/tom/intercom-datamanager
 *
 * Copyright (c) 2014 Tom Söderlund
 * Licensed under the MIT license.
 */

'use strict'

require('dotenv').config()

const { processCommandLineArguments, mapColumnArrayToObjectArray, doInChunks, get } = require('../lib/objects')
const { generateCompanyIdFromName } = require('../lib/contactInfo')
const { updateIntercomUsers, updateIntercomTags } = require('../lib/intercom')
const config = require('../lib/config')

let currentImportProfile = config.defaultProfile

const getImportProfile = function () {
  return config.profiles[currentImportProfile]
}

// Remap fields from "any" input format, to Intercom upload format
const remapFields = function (sourceArray, sourceFieldNamesArray, tagArray) {
  console.log(`Nr of users: ${sourceArray.length}`)
  const resultArray = []
  for (const r in sourceArray) {
    const sourceArrayRow = sourceArray[r]
    const destinationRow = {}
    const custom_attributes = {} // eslint-disable-line camelcase
    for (const destinationFieldName in getImportProfile().fieldmapping) {
      let destinationFieldValue = getImportProfile().fieldmapping[destinationFieldName]
      let isCustomField = false
      if (destinationFieldValue.indexOf('CUSTOM:') !== -1) {
        destinationFieldValue = destinationFieldValue.replace('CUSTOM:', '')
        isCustomField = true
      }
      // Loop through all fields
      for (const f in sourceFieldNamesArray) {
        const sourceFieldName = sourceFieldNamesArray[f]
        const sourceFieldValue = get(sourceArrayRow, sourceFieldName)
        if (sourceFieldValue !== undefined) {
          // Time stamp
          destinationFieldValue = destinationFieldValue.replace('{T:' + sourceFieldName + '}', Math.round(new Date(sourceFieldValue).getTime() / 1000))
        }
        // String mapping multiple fields e.g. "{First Name} {Last Name}"
        if (sourceFieldValue !== undefined) {
          destinationFieldValue = destinationFieldValue.replace('{' + sourceFieldName + '}', sourceFieldValue)
        }
      }
      // Trim space
      destinationFieldValue = destinationFieldValue.trim()
      // Numeric if numeric
      if (parseInt(destinationFieldValue) + '' == destinationFieldValue) {
        destinationFieldValue = parseInt(destinationFieldValue)
      }
      // Only use field if data mapping worked, e.g. no {} tags
      if (!(typeof destinationFieldValue === 'string' && destinationFieldValue.includes('{'))) {
        destinationRow[destinationFieldName] = destinationFieldValue
        // Custom fields
        if (isCustomField) {
          custom_attributes[destinationFieldName] = destinationFieldValue
          destinationRow.custom_attributes = custom_attributes // eslint-disable-line camelcase
          delete destinationRow[destinationFieldName]
        }
        // Tags structure
        if (destinationFieldName == 'tags' && destinationRow.tags && destinationRow.tags !== '' && tagArray) {
          const userTagArray = destinationRow.tags.split(',')
          for (let i = 0; i < userTagArray.length; i++) {
            tagArray.push({
              name: userTagArray[i],
              users: [{ email: destinationRow.email, user_id: destinationRow.user_id }]
            })
          };
          delete destinationRow.tags
        }
        // Companies structure
        if (destinationFieldName == 'company' && destinationRow.company) {
          destinationRow.companies = [{ name: destinationRow.company, id: generateCompanyIdFromName(destinationRow.company) }]
          delete destinationRow.company
        }
        // Location structure
        if (destinationFieldName == 'country') {
          destinationRow.location_data = [{ type: 'location_data', country_name: destinationRow.country }]
          delete destinationRow.country
        }
      }
    }
    // console.log('destinationRow', destinationRow);
    resultArray.push(destinationRow)
  }

  return resultArray
}

// ...
const parseCsvFile = function (fileName) {
  const fs = require('fs')
  const parse = require('csv-parse')

  const parser = parse({ delimiter: ',' }, function (err, data) {
    const userArray = mapColumnArrayToObjectArray(data)
    const tagArray = []
    const fieldNames = data[0]
    const newUserArray = remapFields(userArray, fieldNames, tagArray)
    doInChunks(newUserArray, config.bulkLimit, users => updateIntercomUsers(users, cmdLineArgs))
    if (tagArray.length > 0) {
      updateIntercomTags(tagArray, cmdLineArgs)
    }
  })

  fs.createReadStream(__dirname + '/' + fileName).pipe(parser)
}

// ...
const parseJsonFile = function (fileName) {
  const userArray = require(fileName.replace('.json', ''))
  const fieldNames = [
    ...Object.keys(userArray[0]),
    'hostStatus.statusCode'
  ]
  const newUserArray = remapFields(userArray, fieldNames)
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
