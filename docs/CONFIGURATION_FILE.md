# Release Toolkit Documentation
> ***The best tool to handle release processes for mono repo and multi repo projects.***

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

## Configuration Details

### Repository
The repository section holds your repository details such as owner and repo.

For example, if your repository is https://github.com/omriLugasi/release-toolkit, then the owner name is `omriLugasi` and the repo name is `release-toolkit`.

### Workspaces
The `workspaces` section contains an array of workspace configurations for your repository. Each workspace configuration must include the following properties:

```json

  {
      "branch": "<MAIN_BRANCH>",
      "folderPath": "<FOLDER_PATH_HERE>",
      "id": "main",
      "plugins": []
  }
```
 - `branch`: The branch name that triggers the workspace release process upon a push.
 - `folderPath`: The folder path of the workspace in the repo (e.g., src/workspaces/my-awesome-project-1) 
   - For repositories that want to trigger the release process for every change in the root folder, set `folderPath` to `'.'`.
 - `id`: A unique identifier for the workspace, which helps define the previous version. Do not change it once it's set.
 - `plugins`: An array of plugins to run during the release process (e.g., GitHub, npm, npm).

### CommitPatterns
The commitPatterns section allows you to specify how commit messages should influence the version upgrade process.
This is based on commit message patterns and their corresponding upgrade actions.

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

For each commit pattern, you need to provide the following:
- `pattern` - A regex pattern to apply to commit messages.
- `upgrade` - The type of version upgrade to apply, (`major`.`minor`.`build`) `ignore` means no action is taken (no release, tag, or publish).
- `title` - The title under which matching commits will be grouped in the changelog created by the Release Toolkit.



