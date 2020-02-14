/*
 * intercom-datamanager
 * https://github.com/tom/intercom-datamanager
 *
 * Copyright (c) 2014 Tom Söderlund
 * Licensed under the MIT license.
 */

'use strict';

var Intercom = require('intercom.io');
var helpers = require('./helpers');
var config = require('./config');

// Process arguments in the form name:value, return an object
var processCommandLineArguments = function () {
	var separator = '=';
	var argObj = {};
	var argCount = 0;
	for (var i = 1; i < process.argv.length; i++) {
		if (process.argv[i].indexOf(separator) > -1) {
			// name=value parameter
			var comps = process.argv[i].split(separator);
			argObj[comps[0]] = comps[1];
		}
		else {
			argObj[argCount] = process.argv[i];
			argCount++;
		}
	}
	return argObj;
};

var intercom = new Intercom(config.account);

// Intercom: Users
var updateIntercomUsers = function (usersArray) {
	console.log('Uploading users:\n', JSON.stringify(usersArray, null, 4));
	var usersData = { users: usersArray };
	if (!cmdLineArgs.test) {
		intercom.bulkAddUsers(usersData, function(err, res) {
			console.log('Intercom:', res, 'err:', err);
			if (err) {
				console.error('Intercom error:', err.message.errors);
			}
			if (res && res.failed) {
				console.error('Intercom failed:', res.failed[0]);
			}
		});	
	}
}

// Intercom: Tags
var updateIntercomTags = function (tagArray) {
	console.log('Creating tags:\n', tagArray);
	if (!cmdLineArgs.test) {
		for (var i = 0; i < tagArray.length; i++) {
			intercom.createTag(tagArray[i], function(err, res) {
				console.log('Intercom tag:', res, 'err:', err);
				if (err) {
					console.error('Intercom tag error:', err.message.errors);
				}
				if (res.failed) {
					console.error('Intercom tag failed:', res.failed[0]);
				}
			});	
		};
	}
}

var getIndexOfArrayElement = function (array, element) {
	for (var i in array) {
		if (array[i] === element) {
			return i;
		}
	}
	return undefined;
}

var currentImportProfile = config.defaultProfile;

var getImportProfile = function () {
	return config.profiles[currentImportProfile];
}

var getEmailDomain = function (email) {
	return email.split('@')[1];
}

var generateCompanyIdFromName = function (companyName) {
	if (!companyName)
		return undefined;
	return companyName.trim().toLowerCase().replace('å', 'a').replace('ä', 'a').replace('ö', 'o').replace('ü', 'u').replace(/[^\w-]+/g,'');
}

// ...
var remapFields = function (userArray, fieldNamesArray, tagArray) {
	var resultArray = [];

	for (var r in userArray) {
		var userObj = {};
		var custom_attributes = {};
		for (var fieldName in getImportProfile().fieldmapping) {
			var userDataStr = getImportProfile().fieldmapping[fieldName];
			var isCustomField = false;
			if (userDataStr.indexOf('CUSTOM:') !== -1) {
				userDataStr = userDataStr.replace('CUSTOM:', '');
				isCustomField = true;
			}
			var skipField = false;
			for (var f in fieldNamesArray) {
				// Time stamp
				var dateStr = userArray[r][fieldNamesArray[f]];
				if (dateStr !== undefined) {
					userDataStr = userDataStr.replace('{T:' + fieldNamesArray[f] + '}', Math.round(new Date(userArray[r][fieldNamesArray[f]]).getTime()/1000));
				}
				// String mapping multiple fields e.g. "{First Name} {Last Name}"
				if (userArray[r][fieldNamesArray[f]] !== undefined) {
					userDataStr = userDataStr.replace('{' + fieldNamesArray[f] + '}', userArray[r][fieldNamesArray[f]]);
				}
			}
			// Trim space
			userDataStr = userDataStr.trim();
			// Numeric if numeric
			if (parseInt(userDataStr) + '' == userDataStr) {
				userDataStr = parseInt(userDataStr);
			}
			// Only use field if data mapping worked, e.g. no {} tags
			if (userDataStr.indexOf('{') === -1) {
				userObj[fieldName] = userDataStr;
				// Custom fields
				if (isCustomField) {
					custom_attributes[fieldName] = userDataStr;
					userObj.custom_attributes = custom_attributes;
					delete userObj[fieldName];
				}
				// Tags structure
				if (fieldName == 'tags' && userObj.tags && userObj.tags !== '' && tagArray) {
					var userTagArray = userObj.tags.split(',');
					for (var i = 0; i < userTagArray.length; i++) {
						tagArray.push({
							name: userTagArray[i],
							users: [ { email: userObj.email, user_id: userObj.user_id } ]
						});
					};
					delete userObj.tags;
				}
				// Companies structure
				if (fieldName == 'company' && userObj.company) {
					userObj.companies = [{ name: userObj.company, id: generateCompanyIdFromName(userObj.company) }];
					delete userObj.company;
				}
				// Location structure
				if (fieldName == 'country') {
					userObj.location_data = [{ type: "location_data", country_name: userObj.country }];
					delete userObj.country;
				}
			}
		}
		//console.log('userObj', userObj);
		resultArray.push(userObj);
	}

	return resultArray;
}

// Map from Array of Arrays, to Array of Objects
var mapColumnArrayToObjectArray = function (userArray) {
	var resultArray = [];
	var fieldNamesArray = [];

	for (var r in userArray) {
		if (r == 0) {
			// Field names
			fieldNamesArray = userArray[r];
		}
		else {
			// User data
			var userObj = {};
			for (var f in fieldNamesArray) {
				// String mapping multiple fields e.g. "{First Name} {Last Name}"
				userObj[fieldNamesArray[f]] = userArray[r][getIndexOfArrayElement(fieldNamesArray, fieldNamesArray[f])];
			}
			resultArray.push(userObj);
		}
	}
	return resultArray;
}

// Do callback() in chunks of limit size
var doInChunks = function (array, limit, callback) {
	var chunk = [];
	for (var i in array) {
		chunk.push(array[i]);
		if (chunk.length >= limit) {
			// Chunk is full! Send it.
			callback(chunk);
			chunk = [];
		}
	}
	// Send the rest
	if (chunk.length) {
		callback(chunk);
	}
}

// ...
var parseCsvFile = function (fileName) {
	var fs = require('fs');
	var parse = require('csv-parse');

	var parser = parse({delimiter: ','}, function(err, data) {
		var fieldNames = data[0];
		var userArray = mapColumnArrayToObjectArray(data);
		var tagArray = [];
		var newUserArray = remapFields(userArray, fieldNames, tagArray);
		doInChunks(newUserArray, config.bulkLimit, updateIntercomUsers);
		if (tagArray.length > 0) {
			updateIntercomTags(tagArray);
		}
	});

	fs.createReadStream(__dirname + '/' + fileName).pipe(parser);
};

// ...
var parseJsonFile = function (fileName) {
	fileName = fileName.replace('.json', '')
	var fieldNames = ["__v", "_id", "country", "email", "externalId", "hashedPassword", "name", "provider", "role", "salt", "subscriptions", "dateCreated", "expires"];
	var userArray = require(fileName);
	var newUserArray = remapFields(userArray, fieldNames);
	doInChunks(newUserArray, config.bulkLimit, updateIntercomUsers);
}


var cmdLineArgs = processCommandLineArguments();
console.log('Parameters:', cmdLineArgs);

var main = function () {
	var fileName = cmdLineArgs[1];

	if (fileName !== undefined) {
		currentImportProfile = cmdLineArgs.profile || config.defaultProfile || "intercom";

		if (fileName.indexOf('.csv') > 1) {
			parseCsvFile(fileName);
		}
		else {
			parseJsonFile(fileName);
		}
	}
	else {
		console.log("No import file specified.\nUsage:\nnode intercom-datamanager ../data/users.csv profile=intercom test=true");
	}
}

main();