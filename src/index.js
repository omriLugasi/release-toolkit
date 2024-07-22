const { configService, Config } = require('./config')
const { LogManager, GITHUB_PLUGIN_NAME, NPM_PUBLISH_PLUGIN_NAME, NPM_MIRROR_PLUGIN_NAME} = require('./utils')
const { Github } = require('./plugins/github')
const commitResolver = require('./commit-resolver')
const {NpmPublish} = require("./plugins/npm");
const {NpmMirror} = require("./plugins/npm/mirror");
const {WorkdirContext} = require("./utils/context");


class EntryPoint {

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
    try {
      await npmInstance.publish()
      workdir.__workdir_logger__.log({
        plugin: NPM_PUBLISH_PLUGIN_NAME,
        description: `publish successfully a new version (${workdir.__workdir_context__.get(WorkdirContext.TAG_FIELD_NAME)})`,
        comment: workdir.dryRun ? 'DRY RUN' : ''
      })
    } catch(e) {
      workdir.__workdir_logger__.log({
        plugin: NPM_PUBLISH_PLUGIN_NAME,
        description: `publish failed for (${workdir.__workdir_context__.get(WorkdirContext.TAG_FIELD_NAME)})`,
        comment: `Error: ${e.message}`
      })
    }
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
    try {
      const instance = new NpmMirror(workdir)
      await instance.runMirroring()
      workdir.__workdir_logger__.log({
        plugin: NPM_MIRROR_PLUGIN_NAME,
        description: `publish successfully a new version (${workdir.__workdir_context__.get(WorkdirContext.TAG_FIELD_NAME)})`,
        comment: workdir.dryRun ? 'DRY RUN' : ''
      })
    } catch(e) {
      workdir.__workdir_logger__.log({
        plugin: NPM_MIRROR_PLUGIN_NAME,
        description: `publish failed for (${workdir.__workdir_context__.get(WorkdirContext.TAG_FIELD_NAME)})`,
        comment: `Error: ${e.message}`
      })
    }
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


  /**
   * @description
   * EntryPoint.
   * Init the config service, validate the workdirs property from the config and run the flow.
   */
  async init() {
    await configService.init()

    const workdirs = configService.get(Config.WORKDIRS_KEY)
    if (workdirs.length === 0) {
      console.error('No workdirs found, please add "workdirs" property in your release toolkit file.')
      return
    }
    for (const workdir of configService.get(Config.WORKDIRS_KEY)) {
      await this.run(workdir)
    }
  }

}

if (process.env.NODE_ENV === 'test') {
  module.exports = EntryPoint
} else {
  new EntryPoint().init()
}
