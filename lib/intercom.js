require('dotenv').config()
const Intercom = require('intercom.io')

const intercom = new Intercom({
  personalAccessToken: process.env.INTERCOM_PERSONAL_ACCESS_TOKEN,

  // Why these old needed? https://github.com/tarunc/intercom.io/issues/38
  appId: process.env.INTERCOM_PERSONAL_ACCESS_TOKEN,
  apiKey: process.env.INTERCOM_PERSONAL_ACCESS_TOKEN
})

// Intercom: Users
module.exports.updateIntercomUsers = function (usersArray, options) {
  if (options.verbose) console.log('Uploading users:\n', JSON.stringify(usersArray, null, 4))
  var usersData = { users: usersArray }
  if (!options.test) {
    intercom.bulkAddUsers(usersData, function (err, res) {
      // console.log('Intercom:', res, 'err:', err)
      if (err) {
        console.error('Intercom error:', err)
      }
      if (res && res.failed) {
        console.error('Intercom failed:', res.failed[0])
      }
    })
  }
}

// Intercom: Tags
module.exports.updateIntercomTags = function (tagArray, options) {
  if (options.verbose) console.log('Creating tags:\n', tagArray)
  if (!options.test) {
    for (var i = 0; i < tagArray.length; i++) {
      intercom.createTag(tagArray[i], function (err, res) {
        // console.log('Intercom tag:', res, 'err:', err)
        if (err) {
          console.error('Intercom tag error:', err)
        }
        if (res.failed) {
          console.error('Intercom tag failed:', res.failed[0])
        }
      })
    }
  }
}
