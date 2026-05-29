#!/data/data/com.termux/files/usr/bin/bash
REPO=~/workspace/ai-drakon-scaffolder
TASK_ID="${1:-}"
LOG=~/agy-task.log
cd "$REPO"
git pull origin main --quiet

SKILLS_DIR=~/.claude/skills
SKILLS_LIST=$(ls "$SKILLS_DIR" 2>/dev/null | grep -v '\.md$\|\.skill$' | tr '\n' ', ' | sed 's/, $//')

if [ -n "$TASK_ID" ]; then
  TASK_CONTENT=$(grep -A 60 "## $TASK_ID:" development/TASKS.md 2>/dev/null | head -60)
  PROMPT="You are AGY — a coding agent executing tasks from TASKS.md.

## MANDATORY SKILL EVALUATION (do this FIRST, before any action)

Available skills in ~/.claude/skills/:
$SKILLS_LIST

For each skill, decide YES/NO if it applies to this task. Then READ and FOLLOW every YES skill:
- cat ~/.claude/skills/<skill-name>/SKILL.md  (or skill.md / README.md)

Skills most likely relevant:
- systematic-debugging → if task involves fixing bugs
- writing-plans → if task is large/complex (read plan first if it exists in docs/plans/)
- verification-before-completion → ALWAYS read this before marking done
- test-driven-development → if task adds features
- executing-plans → if task references a plan file

## TASK TO EXECUTE: $TASK_ID

$TASK_CONTENT

## RULES:
1. Read relevant skill files BEFORE starting implementation
2. Run locally on Termux — NOT SSH to 192.168.3.184 unless task explicitly says so
3. After EACH src/ file change: cp src/X .lovable/src/X && diff src/X .lovable/src/X
4. Git commit after each logical step (not all at once at the end)
5. Write diary entry at the end via: python3 -m mempalace diary write --agent agt-ogy3 '...'
6. Mark task done in TASKS.md and push"
else
  PENDING=$(grep -n "^\[ \]" development/TASKS.md | head -3 | awk -F: '{print $2}' | tr "\n" ", ")
  PROMPT="You are AGY — a coding agent executing tasks from TASKS.md.

## MANDATORY SKILL EVALUATION (do this FIRST)

Available skills in ~/.claude/skills/:
$SKILLS_LIST

Read the first pending task, then evaluate which skills apply. Read those skill files. Then execute.

First pending tasks: $PENDING

Rules: read locally, cp to .lovable/ after each file, commit per step, write diary agt-ogy3."
fi

echo "$(date): Starting AGY task: ${TASK_ID:-auto}" >> "$LOG"
agy --print "$PROMPT" --dangerously-skip-permissions 2>&1 | tee -a "$LOG" | tail -20
echo "$(date): Done" >> "$LOG"
