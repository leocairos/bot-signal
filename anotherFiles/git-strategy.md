# Git Strategy 🤝

Instructions to synchronize this customized repository with the official repository.

## Example

1. Clone official repository:
```bash
git clone git@github.com:leocairos/bot-signal.git my-bot-signal
```

2. Rename remote repository:
```bash
git remote rename origin upstream
```

3. Add new "empty" remote repository (repository that used to push customs):
```bash
git remote add origin git@github.com:leocairos/my-bot-signal.git
```

4. Push to remote repository (repository that used to push customs):
```bash
git push origin
```

5. Create a new branch for customs
```bash
git checkout -b my-customs
```

6. Add and commit changes in new branch
```bash
git add .
git commit -m "Description my customs updated"
git push origin my-customs
```

## Git Flow

###	Main's Branch

* The **main** branch is the main branch
* The **develop** branch
  
  Create the develop branch from main
  ```bash
  $ git checkout -b develop main
  ```

* The **release/X.X.X** branch

  Create the release/X.X.X branch from develop
  ```bash
  $ git checkout -b release/X.X.X develop
  ```

### Working with release branch

* Creating a release branch

    ```bash
    $ git checkout -b release/X.X.X develop
    ```
 
   Update version in package.json
  ```bash
  $ git commit -a -m “Bumped version number to X.X.X”
  ```

* Finalizing a release branch
  ```bash
  $ git checkout main
  $ git merge --no-ff release/X.X.X
  ```
  Need to save the MERGE file


Then this commit must be tagged for future reference for this version:

    ```bash
    $ git tag -a X.X.X
    $ git push --follow-tags origin main
    ```
    
Finally, changes made in the release branch need to be merged back into the develop branch, so that future versions also have the fixes made in this branch:

  ```bash
  $ git checkout develop
  $ git merge — no-ff release/X.X.X
  ```
  Need to save the MERGE file

Once the merges are done, we can delete the release branch, as we no longer need it:
  ```bash
  $ git branch -d release/X.X.X
  ```