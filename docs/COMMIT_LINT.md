

# Release Toolkit Documentation
> ***The best tool to handle release processes for mono repo and single repo projects.***

## Overview
In order to provide not only the release process also the day to day work with this tool we provide you the option to set commit lint restriction as part
of your repository with the same configuration of the release toolkit.

## Usage
In your `.husky/commit-msg` you can add the following:
```bash
#!/usr/bin/env sh

node $PWD/node_modules/.bin/commit-lint/index.js $1
```
The lint restriction will be the same rule that you currently have for your release toolkit, so basically the `commitPattern` section in the release-toolkit configuration file
also define the rules to the commit linter.

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

if the commit not return `true` on all those pattern we will failed the commit and your developer wont be able to commit the change unless they will change the commit message
to the once of those patterns.