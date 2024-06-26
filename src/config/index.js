
const path = require('path')
const { release_sparks, repository } = require(path.join(__dirname + '../../../package.json'))
let properties = {}

process.argv.forEach(function (val, index, array) {
  console.log(index + ': ' + val);
  if (index > 1) {
    const [key, value] = val.split('=')
    properties[key.replace('--', '')] = value
  }
});

if (!properties.config) {
  properties = release_sparks
}

properties.repository = repository.startsWith('git@') ? {
  owner: repository.split(':')[1].split('/')[0],
  repo: repository.split(':')[1].split('/')[1].replace('.git', '')
} : {
  owner: repository.replace('https://github.com/', '').split('/')[0],
  repo: repository.replace('https://github.com/', '').split('/')[1].replace('.git', '')
}

module.exports = properties
