require('dotenv').config()
const Intercom = require('intercom.io')

const intercom = new Intercom({
  personalAccessToken: process.env.INTERCOM_PERSONAL_ACCESS_TOKEN,

  // Why these old needed? https://github.com/tarunc/intercom.io/issues/38
  appId: process.env.INTERCOM_PERSONAL_ACCESS_TOKEN,
  apiKey: process.env.INTERCOM_PERSONAL_ACCESS_TOKEN
})

// Intercom: Users
module.exports.updateIntercomUsers = async function (usersArray, options) {
  if (options.verbose) console.log('Uploading users:\n', JSON.stringify(usersArray, null, 4))
  if (options.test) return
  const usersData = { users: usersArray }
  try {
    await intercom.bulkAddUsers(usersData)
  } catch (err) {
    console.warn(`Intercom user error: ${err.message || err}`)
  }
}

// Intercom: Tags
module.exports.updateIntercomTags = async function (tagArray, options) {
  if (options.verbose) console.log('Creating tags:\n', tagArray)
  if (options.test) return
  for (var i = 0; i < tagArray.length; i++) {
    try {
      await intercom.createTag(tagArray[i])
    } catch (err) {
      console.warn(`Intercom tag error: ${err.message || err}`)
    }
  }
}
