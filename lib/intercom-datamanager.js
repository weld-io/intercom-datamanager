/*
 * intercom-datamanager
 * https://github.com/tom/intercom-datamanager
 *
 * Copyright (c) 2014 Tom Söderlund
 * Licensed under the MIT license.
 */

'use strict';

// var async = require('async');
var helpers = require('./helpers');
var config = require('./config');

// Process arguments in the form name:value, return an object
var processCommandLineArguments = function () {
	var argObj = {};
	for (var i = 1; i < process.argv.length; i++) {
		if (process.argv[i].indexOf(':') > -1) {
			var comps = process.argv[i].split(':');
			argObj[comps[0]] = comps[1];
		}
	}
	// Default values
	// var todaysDateString =  helpers.formatDate(new Date());
	// argObj.from = argObj.from || todaysDateString;
	// argObj.to = argObj.to || argObj.from;
	// argObj.type = argObj.type || null;
	// argObj.format = argObj.format || "yes";
	// if (argObj.users) {
	// 	argObj.users = argObj.users.split(',');
	// }
	// if (argObj.events) {
	// 	if (argObj.events.toLowerCase() === 'all')
	// 		argObj.events = null;
	// 	else
	// 		argObj.events = argObj.events.split(',');
	// }
	// else {
	// 	argObj.events = config.default_events;
	// }
	// Return values
	return argObj;
};


var cmdLineArgs = processCommandLineArguments();
console.log('Parameters:', cmdLineArgs);

switch (cmdLineArgs.type) {
}