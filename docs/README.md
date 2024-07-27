# Release Toolkit Documentation
> ***The best tool to handle release processes for mono repo and single repo projects.***  

## Overview
The Release Toolkit is a command-line tool designed to simplify and accelerate the process of publishing GitHub tags and releases from a commit, as well as publishing new npm packages.
Built to perform GitHub and npm releases on **mono repos**, it is also perfectly suited for single repos.
By configuring a single JSON file, developers can streamline their release workflow, making it faster and more efficient.


## Core Concepts
1. Minimum dependencies in order to reduce security issues.
2. One configuration file to rule them all (releases, publish process, commit lint and extra).
3. Simplicity.


## Configuration
The Release Toolkit requires a configuration file named `release-toolkit.json` in the root folder of your project.
This file specifies the settings for the toolkit, such as whether to publish an npm package and other release details.

## Usage
To use the Release Toolkit, execute the following command in your terminal:

```bash
GH_TOKEN=<YOUR_GH_TOKEN_HERE> npx release-toolkit
```
Replace <YOUR_GH_TOKEN_HERE> with your GitHub token, which is required to authenticate and perform actions on your GitHub repository.

## Next Releases
1. Insight dashboard that will help you understand you app and publish process better.

## License
The Release Toolkit is licensed under the `MIT` License. See the LICENSE file for more information.