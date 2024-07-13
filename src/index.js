// this file will be the entry point of the package.

const config = require('./config')
const { Github } = require('./plugins/github')
const commitResolver = require('./commit-resolver')
const {NpmPublish} = require("./plugins/npm");
const {NpmMirror} = require("./plugins/npm/mirror");
const {WorkdirContext} = require("./utils/context");

const GITHUB_PLUGIN_NAME = 'github'
const NPM_PUBLISH_PLUGIN_NAME = 'npm'
const NPM_MIRROR_PLUGIN_NAME = 'npm:mirroring'


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

    /**
     * @description
     * Set the new tag value of the context for further usage.
     */
    workdir.__workdir_context__.set(WorkdirContext.TAG_FIELD_NAME, newTag)
    workdir.__workdir_context__.set(WorkdirContext.GITHUB_STATUS_FIELD_NAME, Github.STATUS_SUCCESS)
  }

  async runWithNpmPublish(workdir) {
    const shouldRunPlugin = workdir.__workdir_context__.get(WorkdirContext.GITHUB_STATUS_FIELD_NAME) === Github.STATUS_SUCCESS
    if (!shouldRunPlugin) {
      return
    }
    const npmInstance = new NpmPublish(workdir)
    await npmInstance.publish()
  }


  async runWithNpmMirror(workdir) {
    const shouldRunPlugin = workdir.__workdir_context__.get(WorkdirContext.GITHUB_STATUS_FIELD_NAME) === Github.STATUS_SUCCESS
    if (!shouldRunPlugin) {
      return
    }
    const instance = new NpmMirror(workdir)
    await instance.runMirroring()
  }

  async run(workdir) {
    workdir.__workdir_context__ = new WorkdirContext()
    for (const plugin of workdir.plugins) {
      const workdirData = {
        ...workdir,
        ...plugin,
        plugins: undefined
      }
      if (plugin.name === GITHUB_PLUGIN_NAME) {
        await this.runWithGithub(workdirData)
      } else if (plugin.name === NPM_PUBLISH_PLUGIN_NAME) {
        await this.runWithNpmPublish(workdirData)
      } else if (plugin.name === NPM_MIRROR_PLUGIN_NAME) {
        await this.runWithNpmMirror(workdirData)
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
