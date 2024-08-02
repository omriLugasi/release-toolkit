const EntryPoint = require('./../src')
const sinon = require('sinon')
// const child_process = require('node:child_process')
const fs = require('fs')
// const { GithubMock } = require('./utils/github')
// const { ConfigMock } = require('./utils/configMock')
const axios = require('axios')
const { Config } = require('../src/config')
const { LogManager } = require('../src/utils')
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

const utils = {
    isGetTagsUrl: (url, owner, repo) =>
        url.startsWith(`/repos/${owner}/${repo}/tags?`),
    isCommitsUrl: (url, owner, repo) =>
        url.startsWith(`/repos/${owner}/${repo}/commits/`),
    generateWorkspaces: () => [
        {
            branch: 'master',
            folderPath: '/src/mock',
            plugins: [
                {
                    name: 'github',
                    tagPattern: '{{tag}}',
                    releasePattern: '{{release}}',
                },
            ],
        },
    ],
    generateCommitResponse: ({ commit, parents }) => ({
        sha: '53df6d85a3f9015ef416f968331d33dbeeab135d',
        commit: {
            author: {
                name: 'omri',
                email: 'release-toolkit@gmail.com',
                date: commit.date || '2024-07-02T19:08:58Z',
            },
            committer: {
                name: 'omri',
                email: 'release-toolkit@gmail.com',
                date: commit.date || '2024-07-02T19:08:58Z',
            },
            message: commit.message,
            tree: {
                sha: 'a93fd60b532245376973b9bea2bf29d1fa78c5e2',
                url: 'https://api.github.com/repos/omriLugasi/h1-a/git/trees/a93fd60b532245376973b9bea2bf29d1fa78c5e2',
            },
            url: 'https://api.github.com/repos/omriLugasi/h1-a/git/commits/53df6d85a3f9015ef416f968331d33dbeeab135d',
            comment_count: 0,
            verification: {
                verified: false,
                reason: 'unsigned',
                signature: null,
                payload: null,
            },
        },
        url: 'https://api.github.com/repos/omriLugasi/h1-a/commits/53df6d85a3f9015ef416f968331d33dbeeab135d',
        html_url:
            'https://github.com/omriLugasi/h1-a/commit/53df6d85a3f9015ef416f968331d33dbeeab135d',
        parents: parents || [],
        files: [{ filename: commit.file }],
    }),
}

describe('Main', () => {
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
        context.only(
            'When Github Plugin provided - no commits found that related to the pattern',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces(),
                }
                let logManagerStub
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: [] }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: utils.generateCommitResponse({
                                        commit: {
                                            message:
                                                'message that is not in the right format.',
                                            file: `${config.workspaces[0].folderPath}/index.sh`,
                                            date: new Date(
                                                new Date().getTime() - 1000
                                            ),
                                        },
                                    }),
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub once', () => {
                    assert.strictEqual(logManagerStub.calledOnce, true)
                })

                it('should invoke the log once with no changes made message for github plugin', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'No changes found. No action taken',
                        }),
                        true
                    )
                })
            }
        )

        context.skip(
            'When Github Plugin provided - tag not found and related commits exists',
            () => {
                const sandbox = sinon.createSandbox()
                const nowDate = new Date()
                const config = {
                    repository: {
                        owner: 'owner',
                        repo: 'repo',
                    },
                    workspaces: utils.generateWorkspaces(),
                }
                let logManagerStub
                before(async () => {
                    sandbox.useFakeTimers({
                        now: nowDate.getTime(),
                    })

                    logManagerStub = sandbox
                        .stub(LogManager.prototype, 'log')
                        .callsFake(() => {})

                    sandbox.stub(Config.prototype, 'init').resolves()

                    sandbox
                        .stub(Config.prototype, 'get')
                        .callsFake((property) => {
                            return config[property]
                        })

                    sandbox
                        .stub(axios.Axios.prototype, 'get')
                        .callsFake((url) => {
                            if (
                                utils.isGetTagsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return { data: [] }
                            } else if (
                                utils.isCommitsUrl(
                                    url,
                                    config.repository.owner,
                                    config.repository.repo
                                )
                            ) {
                                return {
                                    data: utils.generateCommitResponse({
                                        commitMessage:
                                            'chore(): commit message with the right pattern',
                                        files: [
                                            {
                                                filename: `${config.workspaces[0].folderPath}/index.sh`,
                                            },
                                        ],
                                        date: new Date(
                                            new Date().getTime() - 3000
                                        ),
                                    }),
                                }
                            }
                        })

                    await new EntryPoint().init()
                })

                after(() => {
                    sandbox.restore()
                })

                it('should invoke the logger stub once', () => {
                    assert.strictEqual(logManagerStub.calledOnce, true)
                })

                it('should invoke the log once with no changes made message for github plugin', () => {
                    assert.strictEqual(
                        logManagerStub.calledWith({
                            plugin: 'github',
                            description: 'No changes found. No action taken',
                        }),
                        true
                    )
                })
            }
        )
    })
})
