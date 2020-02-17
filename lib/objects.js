// Process arguments in the form name:value, return an object
module.exports.processCommandLineArguments = function () {
  var separator = '='
  var argObj = {}
  var argCount = 0
  for (var i = 1; i < process.argv.length; i++) {
    if (process.argv[i].indexOf(separator) > -1) {
      // name=value parameter
      var comps = process.argv[i].split(separator)
      argObj[comps[0]] = comps[1]
    } else {
      argObj[argCount] = process.argv[i]
      argCount++
    }
  }
  return argObj
}

const getIndexOfArrayElement = function (array, element) {
  for (var i in array) {
    if (array[i] === element) {
      return i
    }
  }
  return undefined
}

// Map from Array of Arrays, to Array of Objects
module.exports.mapColumnArrayToObjectArray = function (userArray) {
  var resultArray = []
  var fieldNamesArray = []
  for (var r in userArray) {
    if (parseInt(r) === 0) {
      // Field names
      fieldNamesArray = userArray[r]
    } else {
      // User data
      var userObj = {}
      for (var f in fieldNamesArray) {
        // String mapping multiple fields e.g. "{First Name} {Last Name}"
        userObj[fieldNamesArray[f]] = userArray[r][getIndexOfArrayElement(fieldNamesArray, fieldNamesArray[f])]
      }
      resultArray.push(userObj)
    }
  }
  return resultArray
}

const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Do actionFunction() in chunks of limit size
module.exports.doInChunks = async function (array, limit = 50, actionFunction, time = 5000) {
  let chunk = []
  for (const i in array) {
    chunk.push(array[i])
    if (chunk.length >= limit) {
      // Chunk is full! Send it.
      console.log(`Chunk ${Math.round(i / limit)} of ${Math.floor(array.length / limit)}...`)
      await actionFunction(chunk)
      await timeout(time)
      chunk = []
    }
  }
  // Send the rest
  if (chunk.length) {
    await actionFunction(chunk)
  }
}

module.exports.get = (obj, path, defaultValue) => {
  const travel = regexp =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj)
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/)
  return result === undefined || result === obj ? defaultValue : result
}
