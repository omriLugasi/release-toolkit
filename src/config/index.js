
const path = require('path')

const { release_toolkit } = require(path.join(process.cwd(), 'release-toolkit.json'))

let properties = {
  release_toolkit
}

module.exports = properties
