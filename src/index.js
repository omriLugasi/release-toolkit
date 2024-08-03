#!/usr/bin/env node

const { configService, Config } = require('./config')
const {
    LogManager,
    GITHUB_PLUGIN_NAME,
    NPM_PUBLISH_PLUGIN_NAME,
    NPM_MIRROR_PLUGIN_NAME,
} = require('./utils')
const { Github } = require('./plugins/github')
const commitResolver = require('./commit-resolver')
const { NpmPublish } = require('./plugins/npm')
const { NpmMirror } = require('./plugins/npm/mirror')
const { WorkSpaceContext } = require('./utils/context')

class EntryPoint {
    async runWithGithub(workspace) {
        try {
            const github = new Github(workspace)
            const { commits, tag } = await github.getDetails()
            const { affectedCommits, newTag } = commitResolver(tag, commits)
            if (!affectedCommits.length) {
                workspace.__workspace_logger__.log({
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
            workspace.__workspace_context__.set(
                WorkSpaceContext.TAG_FIELD_NAME,
                newTag
            )
            workspace.__workspace_context__.set(
                WorkSpaceContext.GITHUB_STATUS_FIELD_NAME,
                Github.STATUS_SUCCESS
            )
        } catch (e) {
            let error = e.message
            if (
                e.response &&
                e.response.data &&
                typeof e.response.data.message === 'string'
            ) {
                error = `${e.message}, ${e.response.data.message}`
            }
            workspace.__workspace_logger__.log({
                plugin: GITHUB_PLUGIN_NAME,
                description: 'Github operation failed',
                comment: `Error: ${error}`,
                e,
            })
            workspace.__workspace_context__.set(
                WorkSpaceContext.GITHUB_STATUS_FIELD_NAME,
                Github.STATUS_FAILED
            )
        }
    }

    async runWithNpmPublish(workspace) {
        const shouldRunPlugin =
            workspace.__workspace_context__.get(
                WorkSpaceContext.GITHUB_STATUS_FIELD_NAME
            ) === Github.STATUS_SUCCESS
        if (!shouldRunPlugin) {
            workspace.__workspace_logger__.log({
                plugin: NPM_PUBLISH_PLUGIN_NAME,
                description: 'No action taken',
            })
            return
        }
        const npmInstance = new NpmPublish(workspace)
        try {
            await npmInstance.publish()
            workspace.__workspace_logger__.log({
                plugin: NPM_PUBLISH_PLUGIN_NAME,
                description: `publish successfully a new version (${workspace.__workspace_context__.get(WorkSpaceContext.TAG_FIELD_NAME)})`,
                comment: workspace.dryRun ? 'DRY RUN' : '',
            })
        } catch (e) {
            workspace.__workspace_logger__.log({
                plugin: NPM_PUBLISH_PLUGIN_NAME,
                description: `publish failed for (${workspace.__workspace_context__.get(WorkSpaceContext.TAG_FIELD_NAME)})`,
                comment: `Error: ${e.message}`,
            })
        }
    }

    async runWithNpmMirror(workspace) {
        const shouldRunPlugin =
            workspace.__workspace_context__.get(
                WorkSpaceContext.GITHUB_STATUS_FIELD_NAME
            ) === Github.STATUS_SUCCESS
        if (!shouldRunPlugin) {
            workspace.__workspace_logger__.log({
                plugin: NPM_MIRROR_PLUGIN_NAME,
                description: `No action taken`,
            })
            return
        }
        try {
            const instance = new NpmMirror(workspace)
            await instance.runMirroring()
            workspace.__workspace_logger__.log({
                plugin: NPM_MIRROR_PLUGIN_NAME,
                description: `publish successfully a new version (${workspace.__workspace_context__.get(WorkSpaceContext.TAG_FIELD_NAME)})`,
                comment: workspace.dryRun ? 'DRY RUN' : '',
            })
        } catch (e) {
            workspace.__workspace_logger__.log({
                plugin: NPM_MIRROR_PLUGIN_NAME,
                description: `publish failed for (${workspace.__workspace_context__.get(WorkSpaceContext.TAG_FIELD_NAME)})`,
                comment: `Error: ${e.message}`,
            })
        }
    }

    async run(workspace) {
        workspace.__workspace_context__ = new WorkSpaceContext()
        workspace.__workspace_logger__ = new LogManager({
            folderPath: workspace.folderPath,
            keys: [
                {
                    name: 'plugin',
                    headerName: 'Plugin Name',
                },
                {
                    name: 'description',
                    headerName: 'Description',
                },
                {
                    name: 'comment',
                    headerName: 'Comments',
                },
            ],
        })

        for (const plugin of workspace.plugins) {
            const workspaceData = {
                ...workspace,
                ...plugin,
                plugins: undefined,
            }
            if (plugin.name === GITHUB_PLUGIN_NAME) {
                await this.runWithGithub(workspaceData)
            } else if (plugin.name === NPM_PUBLISH_PLUGIN_NAME) {
                await this.runWithNpmPublish(workspaceData)
            } else if (plugin.name === NPM_MIRROR_PLUGIN_NAME) {
                await this.runWithNpmMirror(workspaceData)
            }
        }

        workspace.__workspace_logger__.print()
    }

    /**
     * @description
     * EntryPoint.
     * Init the config service, validate the workspaces property from the config and run the flow.
     */
    async init() {
        await configService.init()

        const workspaces = configService.get(Config.WORKSPACES_KEY)
        if (workspaces.length === 0) {
            console.error(
                'No workspaces found, please add "workspaces" property in your release toolkit file.'
            )
            return
        }
        for (const workspace of configService.get(Config.WORKSPACES_KEY)) {
            await this.run(workspace)
        }
    }
}

if (process.env.NODE_ENV === 'test') {
    module.exports = EntryPoint
} else {
    switch (process.argv[2]) {
        case 'set-config':
            const { Deployer } = require('./deployer')
            return new Deployer().init()
        case 'commit-lint':
            return require('./commit-lint')
        case 'release':
        default:
            new EntryPoint().init()
    }
}
