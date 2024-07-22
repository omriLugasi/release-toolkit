const axios = require('axios');
const { Config } = require('./../../src/config')


class GithubMock {
    releaseResponse = []
    commits = []
    tagData = null
    releaseData = null

    constructor(sandbox) {
        sandbox.stub(axios.Axios.prototype, 'get').callsFake((url, config) => {
            if (url.includes('/releases')) {
                const func = this.releaseResponse.shift()
                return { data: func ? [func()] : [] }
            }
            else if (url.includes('/commits')) {
                return { data: this.commits.shift()() }
            }
        })

        sandbox.stub(axios.Axios.prototype, 'post').callsFake((url, data) => {
            if (url.endsWith('/git/tags')) {
                this.tagData = data
                return { data: { sha: 'this-is-a-sha-string' } }
            } else if (url.endsWith('/releases')) {
                this.releaseData = data
                return { data: { html_url: 'https://github.com/this-is-an-html-url' } }
            }
        })
    }

    setFlow({
                lastReleaseDate,
                releaseBody,
                newReleaseDate,
                workdir,
                commitMessages
            } = {}) {

        // if lastReleaseDate and releaseBody not supplied do not sign release to the flow
        if (lastReleaseDate || releaseBody) {
            const release = this.generateRelease(lastReleaseDate, releaseBody, workdir.id)
            this.onNextReleaseRequested(release)
        }

        let index = 0

        for (const commitMessage of commitMessages) {
            let cmt = this.generateCommitResponse()
            cmt = {
                ...cmt,
                files: cmt.files.map((file) => ({...file, filename: `${workdir.folderPath}/a.js`})),
                commit: {
                    ...cmt.commit,
                    message: commitMessage,
                    author: {
                        ...cmt.commit.author,
                        date: newReleaseDate
                    }
                },
                parents: index === commitMessages.length - 1 ? [] : cmt.parents
            }
            this.onNextCommitRequested(cmt)
            index++
        }

    }

    onNextCommitRequested(commit) {
        this.commits.push(() => commit)
        return this
    }

    onNextReleaseRequested(releaseResponse) {
        this.releaseResponse.push(() => releaseResponse)
        return this
    }
    
    generateCommitResponse() {
        return {
            "sha": "53df6d85a3f9015ef416f968331d33dbeeab135d",
            "node_id": "C_kwDOJaIlXNoAKDUzZGY2ZDg1YTNmOTAxNWVmNDE2Zjk2ODMzMWQzM2RiZWVhYjEzNWQ",
            "commit": {
                "author": {
                    "name": "OnwerName",
                    "email": "ownerName@gmail.com",
                    "date": "2024-07-02T19:08:58Z"
                },
                "committer": {
                    "name": "OnwerName",
                    "email": "ownerName@gmail.com",
                    "date": "2024-07-02T19:08:58Z"
                },
                "message": "chore(): show create new version",
                "tree": {
                    "sha": "a93fd60b532245376973b9bea2bf29d1fa78c5e2",
                    "url": "https://api.github.com/repos/ownerName/repoName/git/trees/a93fd60b532245376973b9bea2bf29d1fa78c5e2"
                },
                "url": "https://api.github.com/repos/ownerName/repoName/git/commits/53df6d85a3f9015ef416f968331d33dbeeab135d",
                "comment_count": 0,
                "verification": {
                    "verified": false,
                    "reason": "unsigned",
                    "signature": null,
                    "payload": null
                }
            },
            "url": "https://api.github.com/repos/ownerName/repoName/commits/53df6d85a3f9015ef416f968331d33dbeeab135d",
            "html_url": "https://github.com/ownerName/repoName/commit/53df6d85a3f9015ef416f968331d33dbeeab135d",
            "comments_url": "https://api.github.com/repos/ownerName/repoName/commits/53df6d85a3f9015ef416f968331d33dbeeab135d/comments",
            "author": null,
            "committer": null,
            "parents": [
                {
                    "sha": "ac500ae1ed612653cc9e9f35a813d1d67260707d",
                    "url": "https://api.github.com/repos/ownerName/repoName/commits/ac500ae1ed612653cc9e9f35a813d1d67260707d",
                    "html_url": "https://github.com/ownerName/repoName/commit/ac500ae1ed612653cc9e9f35a813d1d67260707d"
                }
            ],
            "stats": {
                "total": 1,
                "additions": 1,
                "deletions": 0
            },
            "files": [
                {
                    "sha": "7e4da9c768697d031d7f51f7ad967995ac3c37e5",
                    "filename": "src/index.txt",
                    "status": "modified",
                    "additions": 1,
                    "deletions": 0,
                    "changes": 1,
                    "blob_url": "https://github.com/ownerName/repoName/blob/53df6d85a3f9015ef416f968331d33dbeeab135d/src%2Findex.txt",
                    "raw_url": "https://github.com/ownerName/repoName/raw/53df6d85a3f9015ef416f968331d33dbeeab135d/src%2Findex.txt",
                    "contents_url": "https://api.github.com/repos/ownerName/repoName/contents/src%2Findex.txt?ref=53df6d85a3f9015ef416f968331d33dbeeab135d",
                    "patch": "@@ -1,2 +1,3 @@\n Tue Jul 2 22:04:41 IDT 2024\n Tue Jul 2 22:08:46 IDT 2024\n+Tue Jul 2 22:08:58 IDT 2024"
                },
                {
                    "sha": "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391",
                    "filename": "src/index2.txt",
                    "status": "removed",
                    "additions": 0,
                    "deletions": 0,
                    "changes": 0,
                    "blob_url": "https://github.com/ownerName/repoName/blob/ac500ae1ed612653cc9e9f35a813d1d67260707d/src%2Findex2.txt",
                    "raw_url": "https://github.com/ownerName/repoName/raw/ac500ae1ed612653cc9e9f35a813d1d67260707d/src%2Findex2.txt",
                    "contents_url": "https://api.github.com/repos/ownerName/repoName/contents/src%2Findex2.txt?ref=ac500ae1ed612653cc9e9f35a813d1d67260707d"
                }
            ]
        }
    }

    generateRelease(releaseDate, releaseBody, workdirId) {
        return {
            "url": "https://api.github.com/repos/onwerName/repoName/releases/162853025",
            "assets_url": "https://api.github.com/repos/onwerName/repoName/releases/162853025/assets",
            "upload_url": "https://uploads.github.com/repos/onwerName/repoName/releases/162853025/assets{?name,label}",
            "html_url": "https://github.com/onwerName/repoName/releases/tag/0.0.0-test1",
            "id": 162853025,
            "author": {
                "login": "onwerName",
                "id": 19176536,
                "node_id": "MDQ6VXNlcjE5MTc2NTM2",
                "avatar_url": "https://avatars.githubusercontent.com/u/19176536?v=4",
                "gravatar_id": "",
                "url": "https://api.github.com/users/onwerName",
                "html_url": "https://github.com/onwerName",
                "followers_url": "https://api.github.com/users/onwerName/followers",
                "following_url": "https://api.github.com/users/onwerName/following{/other_user}",
                "gists_url": "https://api.github.com/users/onwerName/gists{/gist_id}",
                "starred_url": "https://api.github.com/users/onwerName/starred{/owner}{/repo}",
                "subscriptions_url": "https://api.github.com/users/onwerName/subscriptions",
                "organizations_url": "https://api.github.com/users/onwerName/orgs",
                "repos_url": "https://api.github.com/users/onwerName/repos",
                "events_url": "https://api.github.com/users/onwerName/events{/privacy}",
                "received_events_url": "https://api.github.com/users/onwerName/received_events",
                "type": "User",
                "site_admin": false
            },
            "node_id": "RE_kwDOJaIlXM4JtPCh",
            "tag_name": "0.0.0",
            "target_commitish": "main",
            "name": "Release for tag 0.0.0 test 1",
            "draft": false,
            "prerelease": false,
            "created_at": "2024-06-27T19:26:07Z",
            "published_at": "2024-06-27T19:27:43Z",
            "assets": [],
            "tarball_url": "https://api.github.com/repos/onwerName/repoName/tarball/0.0.0-test1",
            "zipball_url": "https://api.github.com/repos/onwerName/repoName/zipball/0.0.0-test1",
            "body": releaseBody || `
                <!--metadata:last-commit:start ${releaseDate} metadata:last-commit:end-->
                
                <!--metadata:workdir-id:start ${workdirId} metadata:workdir-id:end-->            
            `
        }
    }

    getCreatedTag() {
        return this.tagData
    }
    getCreatedRelease() {
        return this.releaseData
    }

}

exports.GithubMock = GithubMock;