
const path = require('path')
const { release_sparks, repository } = require(path.join(__dirname + '../../../package.json'))
let properties = {}

process.argv.forEach(function (val, index, array) {
  if (index > 1) {
    const [key, value] = val.split('=')
    properties[key.replace('--', '')] = value
  }
});

if (!properties.config) {
  properties = release_sparks
  properties.repository = repository
}

module.exports = properties
