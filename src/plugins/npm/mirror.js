const childProcess = require('node:child_process')
const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { NpmPublish } = require('./index')

/**
 * @description
 * workspace should contain only the following structure
 * type workspace = {
 *   pre?: string
 *   packageName: string
 *   name: string
 * }
 */
class NpmMirror {
    #workspace

    constructor(workspace) {
        this.#workspace = workspace
    }

    async changePackageJsonName(workspacePath) {
        const readAsync = promisify(fs.readFile)
        const writeAsync = promisify(fs.writeFile)
        const workspacePackageJsonPath = path.join(
            workspacePath,
            'package.json'
        )
        const packageJson = await readAsync(workspacePackageJsonPath, 'utf8')
        const newPackageJson = JSON.parse(packageJson)
        newPackageJson.name = this.#workspace.packageName
        await writeAsync(
            workspacePackageJsonPath,
            JSON.stringify(newPackageJson, null, 4)
        )
    }

    async runPre(workspacePath) {
        if (!this.#workspace.pre) {
            return
        }
        return new Promise((res, rej) => {
            childProcess.exec(
                `cd ${workspacePath} && ${this.#workspace.pre}`,
                (err, stdout, stderr) => {
                    if (err) {
                        rej(err)
                        return
                    }
                    res(stdout)
                }
            )
        })
    }

    async runMirroring() {
        const workspacePath = path.join(
            process.cwd(),
            this.#workspace.folderPath
        )
        await this.runPre(workspacePath)
        await this.changePackageJsonName(workspacePath)
        const npmInstance = new NpmPublish(this.#workspace)
        await npmInstance.publish()
    }
}

exports.NpmMirror = NpmMirror
