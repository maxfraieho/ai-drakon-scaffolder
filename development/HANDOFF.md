# HANDOFF — AI-DRAKON / AGY Termux

Оновлено: 2026-05-28 01:05
Проект: AI-DRAKON Platform
HEAD: e4d23c8

## Стан
- AGY Termux 192.168.3.195: UP pid:28717
- Proxy :8080: UP tukroschu@gmail.com 100%
- NotebookLM MCP 192.168.3.234:8002: UP
- MemPalace: 19 drawers indexed
- drakon-agent :8765: healthy
- architect-agent :8766: healthy
- docs-agent :8767: healthy

## Git
e4d23c8 chore: NotebookLM IDs + TASKS.md
eac7908 feat: BUG-8 DRAKON Logic tab
b8091d3 feat: pinchtab skill

## Overnight Tasks -> development/TASKS.md
- [ ] TASK-1: Bootstrap NotebookLM drn-ai query
- [ ] TASK-2: Sync GEMINI.md -> drn-ai notebook
- [ ] TASK-3: Run 01-docs-agent pipeline
- [ ] TASK-4: Write diary agt-ogy handoff

## Доступ
AGY: sshpass -p 123456 ssh -p 8022 u0_a284@192.168.3.195
Proxy: http://192.168.3.195:8080/v1/messages
Dev: sshpass -p 805235io. ssh vokov@192.168.3.184

## NotebookLM IDs
drn-ai: 6139067a-5776-4b29-8869-7c9f9aed475c
Codebase: 2521c922-efa1-4a12-a106-a8f4d2c386ab

## Координація Claude<->AGY
Claude -> TASKS.md
AGY -> [x] + diary agt-ogy
Claude -> читає diary agt-ogy

## PTY injection (AGY idle, CPU<50%)
echo задача > /dev/pts/0 && printf 
 > /dev/pts/0
