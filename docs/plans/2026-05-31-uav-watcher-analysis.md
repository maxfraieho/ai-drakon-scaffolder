# UAV Watcher Code Analysis and Documentation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Analyze the `uav-watcher` (Sharon) repository on the remote server via SSH and write comprehensive architecture, components, data-flow, and issues documentation locally.

**Architecture:** 
The task runs locally on Termux and interacts with the remote server `192.168.3.184` via SSH to inspect the codebase of `uav-watcher`. The documentation will be written locally to `docs/uav-watcher-analysis/` containing 4 structured markdown files.

**Tech Stack:** Python, Telethon (Telegram Userbot), FastAPI, SSH, Bash.

---

### Task 1: Check Connection & List Files
**Files:**
- Create/Modify: None (Local/remote exploration)
- Test: Local output

**Step 1: Check SSH connection to remote server**
Run:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 'echo "Connection OK"'
```
Expected: "Connection OK"

**Step 2: List files in uav-watcher repository**
Run:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 'find ~/projects/uav-watcher -name "*.py" | grep -v __pycache__ | sort && wc -l ~/projects/uav-watcher/*.py'
```
Expected: List of `.py` files and their line counts.

---

### Task 2: Retrieve Remote Source Code
**Files:**
- Create/Modify: None (Remote read)
- Test: Local output

**Step 1: View remote main file `uav_watcher.py`**
Run:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 'cat ~/projects/uav-watcher/uav_watcher.py'
```

**Step 2: View remote `sharon_consultant.py`**
Run:
```bash
sshpass -p '805235io.' ssh -o StrictHostKeyChecking=no vokov@192.168.3.184 'cat ~/projects/uav-watcher/sharon_consultant.py'
```

**Step 3: View any other `.py` files found in Task 1**
Run: Individual `cat` commands via SSH for each file.

---

### Task 3: Write Architecture and Components Documentation
**Files:**
- Create: `docs/uav-watcher-analysis/architecture.md`
- Create: `docs/uav-watcher-analysis/components.md`

**Step 1: Write `architecture.md`**
Describe: Telethon userbot -> AI classifier -> notifications -> Sharon API.

**Step 2: Write `components.md`**
Describe: All classes and functions, their responsibility, and key state variables.

---

### Task 4: Write Data Flow and Issues Documentation
**Files:**
- Create: `docs/uav-watcher-analysis/data-flow.md`
- Create: `docs/uav-watcher-analysis/issues.md`

**Step 1: Write `data-flow.md`**
Describe: Telegram message processing pipeline and Sharon API queries/responses.

**Step 2: Write `issues.md`**
Describe: Code design issues, technical debt, potential bugs or optimizations.

---

### Task 5: Verify Documentation and Commit Changes
**Files:**
- Create: None (verification and commit)

**Step 1: Verify all 4 markdown files exist and contain content**
Run:
```bash
ls -la ~/workspace/ai-drakon-scaffolder/docs/uav-watcher-analysis/
```
Expected: `architecture.md`, `components.md`, `data-flow.md`, `issues.md` present.

**Step 2: Add and commit documentation**
Run:
```bash
cd ~/workspace/ai-drakon-scaffolder
git add docs/uav-watcher-analysis/
git commit -m "docs(uav-watcher): architecture analysis, components, data-flow, issues (TASK-93)"
git push origin main
```

**Step 3: Update TASKS.md and commit**
Run:
```bash
sed -i 's/^## \[ \] TASK-93/## [x] TASK-93/' development/TASKS.md
git add development/TASKS.md
git commit -m "chore(tasks): mark TASK-93 done"
git push origin main
```
