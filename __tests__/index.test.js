const EntryPoint = require('./../src')
const sinon = require('sinon')
const child_process = require('node:child_process')
const fs = require('fs')
const { GithubMock } = require('./utils/github')
const { ConfigMock } = require('./utils/configMock')
const assert = require('chai').assert

const basicworkspaceObject = {
    folderPath: 'src/mock',
    branch: 'master',
}

const basicGithubPlugin = {
    name: 'github',
    tagPattern: '{{tag}}-main',
    releasePattern: 'Main - {{release}}',
}
const basicNpmPlugin = {
    name: 'npm',
}
const basicNpmMirroringPlugin = {
    name: 'npm:mirroring',
    packageName: '@custom/my-mirroring-package-name',
    pre: 'yarn build-same-app-with-different-context',
}

const basicConfiguration = {
    repository: {
        repo: 'mock_repo_name',
        owner: 'mock_owner_name',
    },
    workspaces: [],
    commitPatterns: [
        {
            pattern: '^refactor\\(\\):',
            upgrade: 'major',
            title: 'Refeactor!',
        },
        {
            pattern: '^feat\\(\\):',
            upgrade: 'minor',
            title: 'Features',
        },
        {
            pattern: '^chore\\(\\):',
            upgrade: 'build',
            title: 'Chores',
        },
        {
            pattern: '^ignore\\(\\):',
            upgrade: 'ignore',
        },
    ],
}

describe.skip('Main', () => {
    context('No release toolkit file exists', () => {
        const sandbox = sinon.createSandbox()
        let consoleStub
        let instance

        before(async () => {
            sandbox.stub(fs, 'readFile').callsFake((path, encode, callback) => {
                callback(new Error('this is a custom error'))
            })
            consoleStub = sandbox.stub(console, 'error').callsFake(() => {})
            instance = new EntryPoint()
        })

        after(() => {
            sandbox.restore()
        })

        it('should not failed when workspaces not supplied.', async () => {
            try {
                await instance.init()
            } catch (e) {}
        })

        it('should console the right error message (error message description 1)', () => {
            assert.strictEqual(
                consoleStub.args[0][0].startsWith(
                    'Release toolkit configuration file cannot be found on '
                ),
                true
            )
        })

        it('should console the right error message (error message description 2)', () => {
            assert.strictEqual(
                consoleStub.args[1][0],
                'An example for release toolkit configuration file can be found on https://github.com/omriLugasi/release-toolkit/blob/master/release-toolkit-example.json'
            )
        })
    })

    context('No workspaces property provided', () => {
        const sandbox = sinon.createSandbox()
        let consoleStub
        let instance

        before(async () => {
            const configMock = new ConfigMock(sandbox)
            configMock.setConfiguration(basicConfiguration)
            consoleStub = sandbox.stub(console, 'error').callsFake(() => {})
            instance = new EntryPoint()
        })

        after(() => {
            sandbox.restore()
        })

        it('should not failed when workspaces not supplied.', async () => {
            try {
                await instance.init()
            } catch (e) {
                assert.fail(e)
            }
        })

        it('should console the right error message', () => {
            assert.isTrue(
                consoleStub.calledWith(
                    'No workspaces found, please add "workspaces" property in your release toolkit file.'
                )
            )
        })
    })

    describe('Github plugin', () => {
        context.only('When Github Plugin provided with simple scenario', () => {
            const sandbox = sinon.createSandbox()
            const workspace = {
                ...basicworkspaceObject,
                plugins: [basicGithubPlugin],
            }
            const commitMessages = [
                'chore(): an example for commit message',
                'feat(): an example for commit message',
            ]
            let githubMock
            const nowDate = new Date()
            const releaseDate = new Date(
                new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
            )

            before(async () => {
                sandbox.useFakeTimers({
                    now: nowDate.getTime(),
                })
                githubMock = githubMock = new GithubMock(sandbox)
                const configMock = new ConfigMock(sandbox)
                configMock.setConfiguration({
                    ...basicConfiguration,
                    workspaces: [workspace],
                })

                githubMock.setFlow({
                    lastReleaseDate: nowDate.toISOString(),
                    workspace,
                    commitMessages,
                    newReleaseDate: releaseDate.toISOString(),
                })
                await new EntryPoint().init()
            })

            after(() => {
                sandbox.restore()
            })

            it('should create a new release according to the template', () => {
                assert.strictEqual(
                    githubMock.getCreatedRelease().name,
                    'Main - 0.1.0'
                )
            })

            it('should create a new release with the commits inside the message body', () => {
                const releaseBody = githubMock.getCreatedRelease().body
                commitMessages.forEach((commitMessage) => {
                    assert.strictEqual(
                        releaseBody.includes(commitMessage),
                        true
                    )
                })
            })

            it('should create a new release with the relevant metadata (workspace id)', () => {
                assert.strictEqual(
                    githubMock
                        .getCreatedRelease()
                        .body.includes(
                            `<!--metadata:workspace-id:start ${workspace.id} metadata:workspace-id:end-->`
                        ),
                    true
                )
            })

            it('should create a new release with the relevant metadata (last commit date)', () => {
                assert.strictEqual(
                    githubMock
                        .getCreatedRelease()
                        .body.includes(
                            `<!--metadata:last-commit:start ${releaseDate.toISOString()} metadata:last-commit:end-->`
                        ),
                    true
                )
            })

            it('should create a new release with the relevant tag (according to the template)', () => {
                assert.strictEqual(
                    githubMock.getCreatedRelease().tag_name,
                    `0.1.0-${basicGithubPlugin.tagPattern.replace('{{tag}}-', '')}`
                )
            })
        })

        context(
            'When Github Plugin provided with a new repository scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_2',
                    plugins: [basicGithubPlugin],
                }
                const commitMessages = [
                    'feat(): this is the commit that we start from the releases.',
                    'feat(): an example for commit message',
                ]
                let githubMock
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })
                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should create a new release according to the template', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().name,
                        'Main - 0.1.0'
                    )
                })

                it('should create a new release with the commits inside the message body', () => {
                    const releaseBody = githubMock.getCreatedRelease().body
                    assert.strictEqual(
                        releaseBody.includes(commitMessages[1]),
                        true
                    )
                })

                it('should create a new release with the relevant metadata (workspace id)', () => {
                    assert.strictEqual(
                        githubMock
                            .getCreatedRelease()
                            .body.includes(
                                `<!--metadata:workspace-id:start ${workspace.id} metadata:workspace-id:end-->`
                            ),
                        true
                    )
                })

                it('should create a new release with the relevant metadata (last commit date)', () => {
                    assert.strictEqual(
                        githubMock
                            .getCreatedRelease()
                            .body.includes(
                                `<!--metadata:last-commit:start ${releaseDate.toISOString()} metadata:last-commit:end-->`
                            ),
                        true
                    )
                })

                it('should create a new release with the relevant tag (according to the template)', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().tag_name,
                        `0.1.0-${basicGithubPlugin.tagPattern.replace('{{tag}}-', '')}`
                    )
                })
            }
        )

        context(
            'When Github Plugin provided to semantic release repository scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_5',
                    plugins: [basicGithubPlugin],
                }

                const commitMessages = [
                    'this is a commit message that not align with the commit messages pattern',
                    'feat(): an example for commit message',
                ]
                let githubMock
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })
                    githubMock.setFlow({
                        releaseBody:
                            'this is the last release that not from release toolkit',
                        workspace: { id: 'id that not exists' },
                        commitMessages: [],
                        newReleaseDate: releaseDate.toISOString(),
                    })
                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })
                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should create a new release according to the template', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().name,
                        'Main - 0.1.0'
                    )
                })

                it('should create a new release with the commits inside the message body', () => {
                    const releaseBody = githubMock.getCreatedRelease().body
                    assert.strictEqual(
                        releaseBody.includes(commitMessages[1]),
                        true
                    )
                })

                it('should create a new release with the relevant metadata (workspace id)', () => {
                    assert.strictEqual(
                        githubMock
                            .getCreatedRelease()
                            .body.includes(
                                `<!--metadata:workspace-id:start ${workspace.id} metadata:workspace-id:end-->`
                            ),
                        true
                    )
                })

                it('should create a new release with the relevant metadata (last commit date)', () => {
                    assert.strictEqual(
                        githubMock
                            .getCreatedRelease()
                            .body.includes(
                                `<!--metadata:last-commit:start ${releaseDate.toISOString()} metadata:last-commit:end-->`
                            ),
                        true
                    )
                })

                it('should create a new release with the relevant tag (according to the template)', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().tag_name,
                        `0.1.0-${basicGithubPlugin.tagPattern.replace('{{tag}}-', '')}`
                    )
                })
            }
        )

        context(
            'When Github Plugin provided with wrong commit pattern should not trigger the release publish scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_6',
                    plugins: [basicGithubPlugin],
                }
                const commitMessages = [
                    'wrong(): an example for commit message',
                    'wrong(): an example for commit message',
                ]
                let githubMock
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })
                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should not create new release', () => {
                    assert.strictEqual(githubMock.getCreatedRelease(), null)
                })
            }
        )

        context(
            'When Github Plugin provided with mono repo for one project',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    folderPath: '.',
                    id: 'github_1',
                    plugins: [basicGithubPlugin],
                }
                const commitMessages = [
                    'chore(): an example for commit message',
                    'feat(): an example for commit message',
                ]
                let githubMock
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })
                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should create a new release according to the template', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().name,
                        'Main - 0.1.0'
                    )
                })

                it('should create a new release with the commits inside the message body', () => {
                    const releaseBody = githubMock.getCreatedRelease().body
                    commitMessages.forEach((commitMessage) => {
                        assert.strictEqual(
                            releaseBody.includes(commitMessage),
                            true
                        )
                    })
                })

                it('should create a new release with the relevant metadata (workspace id)', () => {
                    assert.strictEqual(
                        githubMock
                            .getCreatedRelease()
                            .body.includes(
                                `<!--metadata:workspace-id:start ${workspace.id} metadata:workspace-id:end-->`
                            ),
                        true
                    )
                })

                it('should create a new release with the relevant metadata (last commit date)', () => {
                    assert.strictEqual(
                        githubMock
                            .getCreatedRelease()
                            .body.includes(
                                `<!--metadata:last-commit:start ${releaseDate.toISOString()} metadata:last-commit:end-->`
                            ),
                        true
                    )
                })

                it('should create a new release with the relevant tag (according to the template)', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().tag_name,
                        `0.1.0-${basicGithubPlugin.tagPattern.replace('{{tag}}-', '')}`
                    )
                })
            }
        )
    })

    describe('NPM plugin', () => {
        context(
            'When Github and NPM Plugins provided with simple scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_npm_10',
                    plugins: [basicGithubPlugin, basicNpmPlugin],
                }
                const commitMessages = [
                    'chore(): an example for commit message',
                    'feat(): an example for commit message',
                ]
                let githubMock
                let childProcessExec
                let fsReadFile
                let fsWriteFile
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })

                    childProcessExec = sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    fsReadFile = sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    fsWriteFile = sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, encode, callback) => {
                            callback(null)
                        })
                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should create a new release according to the template', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().name,
                        'Main - 0.1.0'
                    )
                })

                it('should use read file function to get package json file content', () => {
                    assert.strictEqual(
                        fsReadFile.args[0][0].endsWith('/package.json'),
                        true
                    )
                })

                it('should use write file function to update package json file content', () => {
                    assert.strictEqual(
                        fsWriteFile.args[0][0].endsWith('/package.json'),
                        true
                    )
                })

                it('should use exec function to run npm publish', () => {
                    assert.strictEqual(
                        childProcessExec.args[0][0].endsWith(
                            '/src/mock && npm publish'
                        ),
                        true
                    )
                })

                it('should called once to exec function', () => {
                    assert.strictEqual(childProcessExec.callCount, 1)
                })
            }
        )

        context(
            'When Github and NPM Plugins provided with no publish needed scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_npm_10',
                    plugins: [basicGithubPlugin, basicNpmPlugin],
                }
                const commitMessages = [
                    'wrong(): commit message',
                    'wrong(): commit message',
                ]
                let githubMock
                let childProcessExec
                let fsReadFile
                let fsWriteFile
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })

                    childProcessExec = sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    fsReadFile = sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    fsWriteFile = sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, encode, callback) => {
                            callback(null)
                        })
                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should not publish new release or tag', () => {
                    assert.strictEqual(githubMock.getCreatedRelease(), null)
                })

                it('should not called write file function', () => {
                    assert.strictEqual(fsWriteFile.callCount, 0)
                })

                it('should not called read file function', () => {
                    assert.strictEqual(fsReadFile.callCount, 0)
                })

                it('should not called once to exec function', () => {
                    assert.strictEqual(childProcessExec.callCount, 0)
                })
            }
        )

        context(
            'When Github and NPM Plugins provided with NPM publish failed scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_npm_12',
                    plugins: [basicGithubPlugin, basicNpmPlugin],
                }
                const commitMessages = [
                    'feat(): commit message',
                    'feat(): commit message',
                ]
                let githubMock
                let childProcessExec
                let fsReadFile
                let fsWriteFile
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })

                    childProcessExec = sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(
                                new Error('this is a custom error message')
                            )
                        })
                    fsReadFile = sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    fsWriteFile = sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, encode, callback) => {
                            callback(null)
                        })
                    try {
                        await new EntryPoint().init()
                    } catch (e) {}
                })

                after(() => {
                    sandbox.restore()
                })

                it('should create a new release according to the template', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().name,
                        'Main - 0.1.0'
                    )
                })

                it('should not called write file function', () => {
                    assert.strictEqual(fsWriteFile.callCount, 1)
                })

                it('should not called read file function', () => {
                    assert.strictEqual(fsReadFile.callCount, 1)
                })

                it('should not called once to exec function', () => {
                    assert.strictEqual(childProcessExec.callCount, 1)
                })
            }
        )

        context(
            'When Github and NPM (dry run) Plugins provided with simple scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_npm_10',
                    plugins: [
                        basicGithubPlugin,
                        { ...basicNpmPlugin, dryRun: true },
                    ],
                }
                const commitMessages = [
                    'chore(): an example for commit message',
                    'feat(): an example for commit message',
                ]
                let githubMock
                let childProcessExec
                let fsReadFile
                let fsWriteFile
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })

                    childProcessExec = sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    fsReadFile = sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    fsWriteFile = sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, encode, callback) => {
                            callback(null)
                        })
                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should create a new release according to the template', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().name,
                        'Main - 0.1.0'
                    )
                })

                it('should use read file function to get package json file content', () => {
                    assert.strictEqual(
                        fsReadFile.args[0][0].endsWith('/package.json'),
                        true
                    )
                })

                it('should use write file function to update package json file content', () => {
                    assert.strictEqual(
                        fsWriteFile.args[0][0].endsWith('/package.json'),
                        true
                    )
                })

                it('should use exec function to run npm publish', () => {
                    assert.strictEqual(
                        childProcessExec.args[0][0].endsWith(
                            '/src/mock && npm publish --dry-run'
                        ),
                        true
                    )
                })

                it('should called once to exec function', () => {
                    assert.strictEqual(childProcessExec.callCount, 1)
                })
            }
        )
    })

    describe('NPM mirroring plugin', () => {
        context(
            'When Github and NPM mirroring Plugins provided with simple scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_npm:mirroring_10',
                    plugins: [basicGithubPlugin, basicNpmMirroringPlugin],
                }
                const commitMessages = [
                    'chore(): an example for commit message',
                    'feat(): an example for commit message',
                ]
                let githubMock
                let childProcessExec
                let fsReadFile
                let fsWriteFile
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })

                    childProcessExec = sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    fsReadFile = sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    fsWriteFile = sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, newContent, callback) => {
                            callback(null)
                        })
                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should create a new release according to the template', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().name,
                        'Main - 0.1.0'
                    )
                })

                it('should use read file function to get package json file content', () => {
                    assert.strictEqual(
                        fsReadFile.args[0][0].endsWith('/package.json'),
                        true
                    )
                })

                it('should use write file function to update package json file content', () => {
                    assert.strictEqual(
                        fsWriteFile.args[0][0].endsWith('/package.json'),
                        true
                    )
                })

                it('should use write file function to update package json file with the right content (package name)', () => {
                    assert.strictEqual(
                        fsWriteFile.args[0][1].includes(
                            `"name": "${basicNpmMirroringPlugin.packageName}"`
                        ),
                        true
                    )
                })

                it('should use exec function to run pre npm publish', () => {
                    assert.strictEqual(
                        childProcessExec.args[0][0].endsWith(
                            basicNpmMirroringPlugin.pre
                        ),
                        true
                    )
                })

                it('should use exec function to npm publish', () => {
                    assert.strictEqual(
                        childProcessExec.args[1][0].endsWith(
                            '/src/mock && npm publish'
                        ),
                        true
                    )
                })

                it('should called twice to exec function', () => {
                    assert.strictEqual(childProcessExec.callCount, 2)
                })
            }
        )

        context(
            'When Github and NPM mirroring Plugins provided with no publish needed scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_npm:mirroring_11',
                    plugins: [basicGithubPlugin, basicNpmMirroringPlugin],
                }
                const commitMessages = [
                    'wrong(): an example for commit message',
                    'wrong(): an example for commit message',
                ]
                let githubMock
                let childProcessExec
                let fsReadFile
                let fsWriteFile
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })

                    childProcessExec = sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    fsReadFile = sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    fsWriteFile = sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, newContent, callback) => {
                            callback(null)
                        })
                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should not publish new release or tag', () => {
                    assert.strictEqual(githubMock.getCreatedRelease(), null)
                })

                it('should not called write file function', () => {
                    assert.strictEqual(fsWriteFile.callCount, 0)
                })

                it('should not called read file function', () => {
                    assert.strictEqual(fsReadFile.callCount, 0)
                })

                it('should not called once to exec function', () => {
                    assert.strictEqual(childProcessExec.callCount, 0)
                })
            }
        )

        context(
            'When Github and NPM mirroring Plugins provided with pre script failed scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_npm:mirroring_12',
                    plugins: [basicGithubPlugin, basicNpmMirroringPlugin],
                }
                const commitMessages = [
                    'chore(): an example for commit message',
                    'feat(): an example for commit message',
                ]
                let githubMock
                let childProcessExec
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })

                    childProcessExec = sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(
                                new Error('this is a custom error message')
                            )
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should create a new release according to the template', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().name,
                        'Main - 0.1.0'
                    )
                })

                it('should use exec function to run pre npm publish', () => {
                    assert.strictEqual(
                        childProcessExec.args[0][0].endsWith(
                            basicNpmMirroringPlugin.pre
                        ),
                        true
                    )
                })

                it('should called twice to exec function', () => {
                    assert.strictEqual(childProcessExec.callCount, 1)
                })
            }
        )

        context(
            'When Github and NPM (dry run) mirroring Plugins provided with simple scenario',
            () => {
                const sandbox = sinon.createSandbox()
                const workspace = {
                    ...basicworkspaceObject,
                    id: 'github_npm:mirroring_10',
                    plugins: [
                        basicGithubPlugin,
                        { ...basicNpmMirroringPlugin, dryRun: true },
                    ],
                }
                const commitMessages = [
                    'chore(): an example for commit message',
                    'feat(): an example for commit message',
                ]
                let githubMock
                let childProcessExec
                const nowDate = new Date()
                const releaseDate = new Date(
                    new Date(nowDate).setMinutes(nowDate.getMinutes() + 2)
                )

                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })
                    githubMock = githubMock = new GithubMock(sandbox)
                    const configMock = new ConfigMock(sandbox)
                    configMock.setConfiguration({
                        ...basicConfiguration,
                        workspaces: [workspace],
                    })

                    githubMock.setFlow({
                        lastReleaseDate: nowDate.toISOString(),
                        workspace,
                        commitMessages,
                        newReleaseDate: releaseDate.toISOString(),
                    })

                    childProcessExec = sandbox
                        .stub(child_process, 'exec')
                        .callsFake((command, callback) => {
                            callback(null, 'some response from child process')
                        })
                    sandbox
                        .stub(fs, 'readFile')
                        .callsFake((path, encode, callback) => {
                            callback(
                                null,
                                JSON.stringify({
                                    version: '0.0.0',
                                    name: 'release-toolkit',
                                })
                            )
                        })
                    sandbox
                        .stub(fs, 'writeFile')
                        .callsFake((path, newContent, callback) => {
                            callback(null)
                        })
                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should create a new release according to the template', () => {
                    assert.strictEqual(
                        githubMock.getCreatedRelease().name,
                        'Main - 0.1.0'
                    )
                })

                it('should use exec function to npm publish', () => {
                    assert.strictEqual(
                        childProcessExec.args[1][0].endsWith(
                            '/src/mock && npm publish --dry-run'
                        ),
                        true
                    )
                })

                it('should called twice to exec function', () => {
                    assert.strictEqual(childProcessExec.callCount, 2)
                })
            }
        )
    })
})
