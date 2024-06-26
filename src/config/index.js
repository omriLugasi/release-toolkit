
let properties = {}

process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
  if (index > 1) {
    const [key, value] = val.split('=')
    properties[key.replace('--', '')] = value
  }
});

if (!properties.config) {
  const { release_sparks } = require(process.cwd() + '/package.json')
  properties = release_sparks
}

module.exports = properties
