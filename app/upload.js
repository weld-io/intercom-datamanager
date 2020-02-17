/*
 * intercom-datamanager
 * https://github.com/tom/intercom-datamanager
 *
 * Copyright (c) 2014 Tom Söderlund
 * Licensed under the MIT license.
 */

'use strict'

require('dotenv').config()
const path = require('path')

const { processCommandLineArguments, mapColumnArrayToObjectArray, doInChunks, get } = require('../lib/objects')
const { generateCompanyIdFromName } = require('../lib/contactInfo')
const { updateIntercomUsers, updateIntercomTags } = require('../lib/intercom')
const config = require('../lib/config')

let currentImportProfile = config.defaultProfile

const getImportProfile = function () {
  return config.profiles[currentImportProfile]
}

const formatOneRow = function ({ index, sourceArrayRow, targetFields, sourceFieldNamesArray, tagArray }) {
  const targetRow = {}
  const custom_attributes = {} // eslint-disable-line camelcase
  for (const targetFieldName in targetFields) {
    let targetFieldValue = targetFields[targetFieldName]
    let isCustomField = false
    if (targetFieldValue.indexOf('CUSTOM:') !== -1) {
      targetFieldValue = targetFieldValue.replace('CUSTOM:', '')
      isCustomField = true
    }
    // Loop through all fields
    for (const f in sourceFieldNamesArray) {
      const sourceFieldName = sourceFieldNamesArray[f]
      const sourceFieldValue = get(sourceArrayRow, sourceFieldName)
      if (sourceFieldValue !== undefined) {
        // Time stamp
        targetFieldValue = targetFieldValue.replace('{T:' + sourceFieldName + '}', Math.round(new Date(sourceFieldValue).getTime() / 1000))
      }
      // String mapping multiple fields e.g. "{First Name} {Last Name}"
      if (sourceFieldValue !== undefined) {
        targetFieldValue = targetFieldValue.replace('{' + sourceFieldName + '}', sourceFieldValue)
      }
    }
    // Trim space
    targetFieldValue = targetFieldValue.trim()
    // Numeric if numeric
    if (parseInt(targetFieldValue) + '' === targetFieldValue) {
      targetFieldValue = parseInt(targetFieldValue)
    }
    // Only use field if data mapping worked, e.g. no {} tags
    if ((typeof targetFieldValue === 'string' && (targetFieldValue.includes('{') || targetFieldValue.includes('null') || targetFieldValue.includes('undefined')))) {
      console.warn(`Row ${index + 1}: Field '${targetFieldName}' has unvalidated data: '${targetFieldValue}'`)
    } else {
      targetRow[targetFieldName] = targetFieldValue
      // Custom fields
      if (isCustomField) {
        custom_attributes[targetFieldName] = targetFieldValue
        targetRow.custom_attributes = custom_attributes // eslint-disable-line camelcase
        delete targetRow[targetFieldName]
      }
      // Tags structure
      if (targetFieldName === 'tags' && targetRow.tags && targetRow.tags !== '' && tagArray) {
        const userTagArray = targetRow.tags.split(',')
        for (let i = 0; i < userTagArray.length; i++) {
          tagArray.push({
            name: userTagArray[i],
            users: [{ email: targetRow.email, user_id: targetRow.user_id }]
          })
        }
        delete targetRow.tags
      }
      // Companies structure
      if (targetFieldName === 'company' && targetRow.company) {
        targetRow.companies = [{ name: targetRow.company, id: generateCompanyIdFromName(targetRow.company) }]
        delete targetRow.company
      }
      // Location structure
      if (targetFieldName === 'country') {
        targetRow.location_data = [{ type: 'location_data', country_name: targetRow.country }]
        delete targetRow.country
      }
    }
  }
  return targetRow
}

// Remap fields from "any" input format, to Intercom upload format
const remapFields = function (sourceArray, sourceFieldNamesArray, tagArray) {
  console.log(`Nr of rows: ${sourceArray.length}`)
  const resultArray = []
  for (let index = 0; index < sourceArray.length; index++) {
    const sourceArrayRow = sourceArray[index]
    const targetFields = getImportProfile().fieldmapping
    const targetRow = formatOneRow({ index, sourceArrayRow, targetFields, sourceFieldNamesArray, tagArray })
    resultArray.push(targetRow)
  }
  return resultArray
}

// ...
const parseCsvFile = function (fileName) {
  const fs = require('fs')
  const parse = require('csv-parse')

  const parser = parse({ delimiter: ',' }, function (err, data) {
    if (err) {
      console.error(err)
      return
    }
    const userArray = mapColumnArrayToObjectArray(data)
    const tagArray = []
    const fieldNames = data[0]
    const newUserArray = remapFields(userArray, fieldNames, tagArray)
    doInChunks(newUserArray, config.bulkLimit, users => updateIntercomUsers(users, cmdLineArgs))
    if (tagArray.length > 0) {
      updateIntercomTags(tagArray, cmdLineArgs)
    }
  })

  fs.createReadStream(path.join(__dirname, fileName)).pipe(parser)
}

// ...
const parseJsonFile = function (fileName) {
  const userArray = require(fileName.replace('.json', ''))
  const fieldNames = [
    ...Object.keys(userArray[0]),
    'hostStatus.statusCode',
    'hostStatus.previousStatusCode'
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
    console.log('No import file specified.\nUsage:\nnode app/upload ../data/test.csv profile=intercom test=true verbose=true')
  }
}

main()
