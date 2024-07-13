
const path = require('path')

const configuration = require(path.join(process.cwd(), 'release-toolkit.json'))

let properties = configuration

module.exports = properties
