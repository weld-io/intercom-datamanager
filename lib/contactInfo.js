module.exports.generateCompanyIdFromName = function (companyName) {
  if (!companyName) { return undefined }
  return companyName.trim().toLowerCase().replace('å', 'a').replace('ä', 'a').replace('ö', 'o').replace('ü', 'u').replace(/[^\w-]+/g, '')
}

// const getEmailDomain = function (email) {
//   return email.split('@')[1]
// }
