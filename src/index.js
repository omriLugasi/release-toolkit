// this file will be the entry point of the package.

const config = require('./config')
const { LogManager, GITHUB_PLUGIN_NAME, NPM_PUBLISH_PLUGIN_NAME, NPM_MIRROR_PLUGIN_NAME} = require('./utils')
const { Github } = require('./plugins/github')
const commitResolver = require('./commit-resolver')
const {NpmPublish} = require("./plugins/npm");
const {NpmMirror} = require("./plugins/npm/mirror");
const {WorkdirContext} = require("./utils/context");


class EntryPoint {

  constructor() {
    this.init()
  }

  async runWithGithub(workdir) {
    const github = new Github(workdir)
    const { commits, tag } = await github.getDetails()
    const { affectedCommits, newTag } = commitResolver(tag, commits)
    if (!affectedCommits.length) {
      workdir.__workdir_logger__.log({
        plugin: GITHUB_PLUGIN_NAME,
        description: 'No changes found. No action taken',
      })
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
      workdir.__workdir_logger__.log({
        plugin: NPM_PUBLISH_PLUGIN_NAME,
        description: 'No action taken',
      })
      return
    }
    const npmInstance = new NpmPublish(workdir)
    await npmInstance.publish()
    workdir.__workdir_logger__.log({
      plugin: NPM_PUBLISH_PLUGIN_NAME,
      description: `publish successfully a new version (${workdir.__workdir_context__.get(WorkdirContext.TAG_FIELD_NAME)})`
    })
  }


  async runWithNpmMirror(workdir) {
    const shouldRunPlugin = workdir.__workdir_context__.get(WorkdirContext.GITHUB_STATUS_FIELD_NAME) === Github.STATUS_SUCCESS
    if (!shouldRunPlugin) {
      workdir.__workdir_logger__.log({
        plugin: NPM_MIRROR_PLUGIN_NAME,
        description: `no action taken`,
      })
      return
    }
    const instance = new NpmMirror(workdir)
    await instance.runMirroring()

    workdir.__workdir_logger__.log({
      plugin: NPM_MIRROR_PLUGIN_NAME,
      description: `publish successfully a new version (${workdir.__workdir_context__.get(WorkdirContext.TAG_FIELD_NAME)})`,
    })
  }

  async run(workdir) {
    workdir.__workdir_context__ = new WorkdirContext()
    workdir.__workdir_logger__ = new LogManager({
      folderPath: workdir.folderPath,
      keys: [
        {
          name: 'plugin',
          headerName: 'Plugin Name'
        },
        {
          name: 'description',
          headerName: 'Description'
        },
        {
          name: 'comment',
          headerName: 'Comments'
        }
      ]
    })

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

    workdir.__workdir_logger__.print()
  }



  async init() {
    for (const workdir of config.workdirs) {
      await this.run(workdir)
    }
  }

}


new EntryPoint()
