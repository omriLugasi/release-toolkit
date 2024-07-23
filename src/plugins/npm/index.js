const childProcess = require('node:child_process')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { WorkSpaceContext } = require('../../utils/context')

/**
 * @description
 * workspace should contain only the following structure
 * type workspace = {
 *   dryRun?: boolean
 *   tag?: boolean
 *   name: string
 * }
 */
class NpmPublish {
    #workspace

    constructor(workspace) {
        this.#workspace = workspace
    }

    async changePackageJsonVersion(workspacePath) {
        const readAsync = promisify(fs.readFile)
        const writeAsync = promisify(fs.writeFile)

        const newVersion = this.#workspace.__workspace_context__.get(
            WorkSpaceContext.TAG_FIELD_NAME
        )
        const workspacePackageJsonPath = path.join(
            workspacePath,
            'package.json'
        )
        const packageJson = await readAsync(workspacePackageJsonPath, 'utf8')
        const newPackageJson = JSON.parse(packageJson)
        newPackageJson.version = newVersion
        await writeAsync(
            workspacePackageJsonPath,
            JSON.stringify(newPackageJson, null, 4)
        )
    }

    /**
     * @description
     * Publish the package with the new tag.
     */
    async publish() {
        const workspacePath = path.join(
            process.cwd(),
            this.#workspace.folderPath
        )

        await this.changePackageJsonVersion(workspacePath)

        let command = `cd ${workspacePath} && npm publish`

        if (this.#workspace.dryRun) {
            command += ' --dry-run'
        }

        // TODO: support tag release.
        if (this.#workspace.tag === true) {
            command += ' --tag'
            throw new Error('currently not supported!')
        }

        return new Promise((res, rej) => {
            childProcess.exec(command, (err, stdout, stderr) => {
                if (err) {
                    rej(err)
                    return
                }
                res(stdout)
            })
        })
    }
}

exports.NpmPublish = NpmPublish
