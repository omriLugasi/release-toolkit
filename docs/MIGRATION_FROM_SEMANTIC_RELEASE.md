# Release Toolkit Documentation
> ***The best tool to handle release processes for mono repo and multi repo projects.***


## Migrate From Semantic Release
> If your main branch is named something other than "master",<br /> be sure to update both the GitHub Actions configuration and the release-toolkit.json file <br /> to reflect the correct branch name.
1. Open your terminal in the root directory of your project and run `npx release-toolkit set-config`.
2. Remove any existing configurations and packages related to semantic release.
3. Update `release-toolkit.json`: <br />
   3a. Set the `tagPattern` value to `"v{{tag}}"`.<br />
   3b. Set the `folderPath` value to `"."`.
4. Execute the following commands to commit your changes.
   ```bash
      git add .
      git commit -m "feat(): change release infrastructure to release toolkit"
      git push
   ``` 
5. Done.




