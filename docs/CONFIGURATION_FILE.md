# Release Toolkit Documentation
> ***The best tool to handle release processes for mono repo and single repo projects.***

## Configuration
The Release Toolkit requires a configuration file named `release-toolkit.json` in the root folder of your project.
This file specifies the settings for the toolkit, such as whether to publish an npm package and other release details.

## Basic Example
You can find good example in the following [link](https://github.com/omriLugasi/release-toolkit/blob/master/release-toolkit-example.json)
```json
{
  "repository": {
    "repo": "<REPO_NAME>",
    "owner": "<OWNER_NAME>"
  },
  "workspaces": [
    {
      "branch": "<MAIN_BRANCH>",
      "folderPath": "<FOLDER_PATH_HERE>",
      "id": "main",
      "plugins": [
        {
          "name": "github",
          "tagPattern": "{{tag}}",
          "releasePattern": "{{release}}"
        },
        {
          "name": "npm",
          "dryRun": true
        },
        {
          "name": "npm:mirroring",
          "packageName": "@custom/my-mirroring-package-name",
          "pre": "yarn build-same-app-with-different-context",
          "dryRun": true
        }
      ]
    }
  ],
  "commitPatterns": [
    {
      "pattern": "^refactor\\(\\):",
      "upgrade": "major",
      "title": "Refeactor!"
    },
    {
      "pattern": "^feat\\(\\):",
      "upgrade": "minor",
      "title": "Features"
    },
    {
      "pattern": "^chore\\(\\):",
      "upgrade": "build",
      "title": "Chores"
    },
    {
      "pattern": "^ignore\\(\\):",
      "upgrade": "ignore"
    }
  ]
}


```

## Repository
The repository part hold your repository details like `owner` and `repo`.

For example if my repository is `https://github.com/omriLugasi/release-toolkit`
Then my owner name is `omriLugasi` and the repo is `release-toolkit`.

## Workspaces
... TBD

## CommitPatterns
Commit pattern ....TBD



