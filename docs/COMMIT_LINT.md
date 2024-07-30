

# Release Toolkit Documentation
> ***The best tool to handle release processes for mono repo and multi repo projects.***

## Overview
To support both the release process and day-to-day development, we offer the option to enforce commit linting restrictions using the same configuration file as the Release Toolkit.

## Usage
In your `.husky/commit-msg` you can add the following:
```bash
#!/usr/bin/env sh

npx release-toolkit commit-lint $1
```


The linting rules for commit messages will align with the release toolkit's configuration, ensuring consistency across your development and release processes. Specifically, the commitPatterns section in the release-toolkit.json file not only guides version upgrades during releases but also defines the rules for commit linting. This means that the same patterns used to trigger version changes will also enforce commit message standards, streamlining your workflow and maintaining uniformity in commit practices.

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

If a commit message does not match any of the defined patterns in the commitPatterns section, the commit will be rejected. The developer will need to modify the commit message to conform to one of the specified patterns in order to proceed.