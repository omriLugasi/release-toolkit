


class Github {
    commits = []

    constructor() {

    }

    onCommitCalled(response) {
        this.commits.push(response)
    }
}

exports.Github = Github;