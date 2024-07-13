// this file will be the entry point of the package.

const config = require('./config')
const { Github } = require('./plugins/github')
const commitResolver = require('./commit-resolver')

const GITHUB_PLUGIN_NAME = 'github'


class EntryPoint {

  constructor() {
    this.init()
  }

  async runWithGithub(workdir) {
    const github = new Github(workdir)
    const { commits, tag } = await github.getDetails()
    const { affectedCommits, newTag } = commitResolver(tag, commits)
    if (!affectedCommits.length) {
      // TODO: improve this message
      console.log(`No affected commits found ${workdir.folderPath}.`)
      return
    }

    await github.release(newTag, affectedCommits)
  }

  async run(workdir) {
    for (const plugin of workdir.plugins) {
      if (plugin.name === GITHUB_PLUGIN_NAME) {
        const workdirData = {
          ...workdir,
          ...plugin,
          plugins: undefined
        }
        await this.runWithGithub(workdirData)
      }
    }
  }


  async init() {


    for (const workdir of config.workdirs) {
      await this.run(workdir)
    }
  }

}


new EntryPoint()
