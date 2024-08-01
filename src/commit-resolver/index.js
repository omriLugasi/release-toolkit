const { configService, Config } = require('./../config')

const versions = {
    ignore: -1,
    build: 0,
    minor: 1,
    major: 2,
}

const getNewSamver = (tag, weight) => {
    const [major, minor, build] = tag.split('.')
    switch (weight) {
        case versions.build:
            return `${major}.${minor}.${parseInt(build, 10) + 1}`
        case versions.minor:
            return `${major}.${parseInt(minor, 10) + 1}.0`
        case versions.major:
            return `${parseInt(major, 10) + 1}.0.0`
    }
}

/**
 * @description
 * Responsible on the commit analysis
 * should get
 * {
 *   message: "commit message",
 *   url: "url to the commit",
 *   name: "commit name"
 * }
 */
module.exports = (tag, commits) => {
    const affectedCommits = []
    const upgrades = []
    for (const commit of commits) {
        const { message } = commit
        const currentCommit = {
            ...commit,
            metadata: { ...commit.metadata, title: 'Default' },
        }
        for (const { pattern, upgrade, title } of configService.get(
            Config.COMMIT_PATTERNS_KEY
        )) {
            const regex = new RegExp(pattern)
            if (regex.test(message)) {
                currentCommit.metadata.title = title
                if (versions[upgrade] !== versions.ignore) {
                    upgrades.push(versions[upgrade])
                }
            }
        }
        affectedCommits.push(currentCommit)
    }

    if (!upgrades.length) {
        return {
            affectedCommits: [],
        }
    }

    return {
        affectedCommits,
        newTag: getNewSamver(tag, Math.max(...upgrades)),
    }
}
