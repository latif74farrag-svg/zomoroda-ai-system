---
name: github-vibe-coder
description: Autonomous GitHub automation and repository manager for vibe coders. Use whenever performing git operations, staging, committing, pushing, syncing, branching, or reviewing repo history on behalf of the user.
---

# 🐙 GitHub Vibe Coder Skill (Autonomous Git Protocol)

This skill empowers Antigravity to act as an autonomous Git pair-programmer for vibe coders. The user should never have to manually type `git commit` or `git push` unless they specifically want to.

---

## 🛠️ Windows Environment & Executable Path

On Windows systems, the Git binary may not be in the default PowerShell user session `$env:PATH`.
Always use the exact path or check for it dynamically:

```powershell
$git = if (Get-Command git -ErrorAction SilentlyContinue) { "git" } else { "C:\Program Files\Git\cmd\git.exe" }
& $git <command>
```

---

## 📋 Autonomous Workflows (Runbooks)

### 1. Check Status & Changes
Before making commits, inspect current status:
```powershell
& "C:\Program Files\Git\cmd\git.exe" status -s
```

### 2. Smart Autonomous Staging & Commit
When completing a feature, bug fix, or refactor:
1. Verify what files were modified or created.
2. Ensure `.gitignore` prevents secrets/node_modules from being staged.
3. Stage changes and commit with Conventional Commits:
```powershell
& "C:\Program Files\Git\cmd\git.exe" add <files>
& "C:\Program Files\Git\cmd\git.exe" commit -m "<type>(<scope>): <summary>"
```
Types:
- `feat:` New features or enhancements
- `fix:` Bug fixes
- `refactor:` Code improvements without behavioral changes
- `docs:` Documentation or specs updates
- `chore:` Dependency or build adjustments

### 3. Safe Sync & Push
When pushing to origin:
```powershell
& "C:\Program Files\Git\cmd\git.exe" push origin main
```
If the branch has diverged, pull before pushing:
```powershell
& "C:\Program Files\Git\cmd\git.exe" pull --rebase origin main
& "C:\Program Files\Git\cmd\git.exe" push origin main
```

### 4. Branch Management
When working on risky experiments:
```powershell
& "C:\Program Files\Git\cmd\git.exe" checkout -b feat/new-feature
```

### 5. Quick Vibe Shortcuts for the AI
- **Auto-Save checkpoint**:
  ```powershell
  & "C:\Program Files\Git\cmd\git.exe" add -A
  & "C:\Program Files\Git\cmd\git.exe" commit -m "chore(checkpoint): save progress"
  ```
- **Inspect Diff**:
  ```powershell
  & "C:\Program Files\Git\cmd\git.exe" diff --stat
  ```
- **Show recent commits**:
  ```powershell
  & "C:\Program Files\Git\cmd\git.exe" log --oneline -n 5
  ```

---

## 🛑 Safety Rules
- **NEVER** run `git push --force` or `git reset --hard` without explicit user permission.
- Always check that `.env` or auth credentials are not in the staging area (`git status`).

