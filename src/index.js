// this file will be the entry point of the package.

const { Github } = require('./plugins/github')
const commitResolver = require('./commit-resolver')


const init = async () => {
  const github = new Github()
  const { commits, tag } = await github.getDetails()
  const { affectedCommits, newTag } = commitResolver(tag, commits)
  if (!affectedCommits.length) {
    // TODO: improve this message
    console.log('No affected commits found.')
  }

  await github.release(newTag, affectedCommits)

}

init()
