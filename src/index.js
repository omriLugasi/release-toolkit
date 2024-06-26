// this file will be the entry point of the package.

const config = require('./config')
const commitResolver = require('./commit-resolver')

console.log(config)

// understand commits
// get the last release


const init = async () => {
  await commitResolver()
}

init()
