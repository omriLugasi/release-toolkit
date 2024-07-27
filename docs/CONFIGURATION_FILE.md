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
      "title": "Refactor!"
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
Workspace Section hold your repo workspaces each workspace should contains the following (all properties are mandatory):
```json

  {
      "branch": "<MAIN_BRANCH>",
      "folderPath": "<FOLDER_PATH_HERE>",
      "id": "main",
      "plugins": []
  }
```
 - `branch` - Each push to this branch name will invoke the workspace release process.
 - `folderPath` - The folder path of the workspace in the repo (example `src/workspaces/my-awesome-project-1`)
 - `id` - This is a unique identifier that should help us define the previous version, do not change it once it's set.
 - `plugins` - The plugins that should run on the release process, example are github, npm, npm:mirroring and more ...

## CommitPatterns
Release toolkit know how to upgrade your package and github version according to the commits that made, this is where `commitPattern` comes handy,
the idea is to set your convention for commit messages and which type of upgrade each pattern should update.

> An example for commit pattern config

```json
{
  "commitPatterns": [
    {
      "pattern": "^refactor\\(\\):",
      "upgrade": "major",
      "title": "Refactor!"
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

For each commit pattern you need to provide the following:
- `pattern` - Regex pattern to apply on the messages.
- `upgrade` - Which version should I upgrade too, `major`.`minor`.`build`.
- `title` - When release toolkit create change log on your release, all the commits that returns true on this pattern will under the title that you provide.



