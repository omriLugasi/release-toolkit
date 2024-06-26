// this file will be the entry point of the package.

const config = require('./config')
const { Github } = require('./plugins/github')
// const commitResolver = require('./commit-resolver')

console.log(config)



const init = async () => {
  const github = new Github()
  const response = await github.getComments()
  console.log(response)
}

init()
