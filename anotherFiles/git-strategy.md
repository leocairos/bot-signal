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
