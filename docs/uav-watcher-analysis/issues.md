# UAV Watcher Code Issues & Technical Debt Analysis

This document identifies bugs, code smells, architecture flaws, security concerns, and technical debt found in the `uav-watcher` codebase, along with suggested remedies.

---

## 1. High-Priority Issues & Bugs

### A. Hardcoded Project Root Path
- **Location:** [sharon/pipelines/threat_classifier.py:12](file:///home/vokov/projects/uav-watcher/sharon/pipelines/threat_classifier.py#L12)
- **Problem:** `PROJECT_ROOT = "/home/vokov/projects/uav-watcher"` is hardcoded. If the service is deployed under a different user or directory (e.g., on Termux or a different server path), it will fail to read `config.json` or write execution traces.
- **Remedy:** Determine the root dynamically:
  ```python
  import pathlib
  PROJECT_ROOT = str(pathlib.Path(__file__).resolve().parents[2])
  ```

### B. Blocking Synchronous Database Operations in Async Event Loop
- **Location:** [uav_watcher.py](file:///home/vokov/projects/uav-watcher/uav_watcher.py) (e.g., `save_threat_event`, `_catchup_history`) & [geo_monitor.py](file:///home/vokov/projects/uav-watcher/geo_monitor.py)
- **Problem:** All SQLite operations are performed using the blocking standard `sqlite3` library directly on the main event loop thread. If the SQLite file is busy or queries are slow (e.g., during startup history catchup scanning 4 hours of channel feeds), the entire async loop blocks. This causes Telethon disconnects, delayed message processing, and heartbeat timeouts.
- **Remedy:** Wrap all synchronous database/file calls in `asyncio.to_thread` or transition to `aiosqlite`.
  ```python
  import asyncio
  # Example:
  await asyncio.to_thread(save_threat_event, ...)
  ```

### C. SQLite Connection Overhead & Lack of WAL Mode
- **Location:** [db/models.py](file:///home/vokov/projects/uav-watcher/db/models.py)
- **Problem:** Every database function opens and closes a new SQLite connection. This creates massive disk I/O overhead. Furthermore, SQLite is run in default journal mode, which locks the entire database file during writes. In a multi-user environment where location check-ins occur simultaneously with threat event log writes, the database will throw `sqlite3.OperationalError: database is locked`.
- **Remedy:** Enable Write-Ahead Logging (WAL) mode when initializing the database:
  ```python
  conn.execute("PRAGMA journal_mode=WAL;")
  ```
  Additionally, share a connection pool or serialise writes.

---

## 2. Code Smells & Maintainability Issues

### A. Hardcoded Telegram Channel ID
- **Location:** [uav_watcher.py:409](file:///home/vokov/projects/uav-watcher/uav_watcher.py#L409)
- **Problem:** `LOCKED = [-1001223955273]` is hardcoded. If this monitoring channel is replaced or deactivated, a code release is required.
- **Remedy:** Relocate this system channel ID into `config.json` under `system_channels`.

### B. Insecure Plaintext Credentials in Command History
- **Location:** `TASKS.md` (e.g. line 6929)
- **Problem:** The remote server SSH password `805235io.` is hardcoded in plaintext commands. Any user or agent reading the file has immediate root/user access to the host.
- **Remedy:** Set up SSH key authentication (`ssh-copy-id`) and remove plaintext passwords from scripts and task records.

### C. Typos & Spell-Checking Inflexibility
- **Location:** [consultant/pipeline/nodes.py:55-78](file:///home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py#L55-L78)
- **Problem:** `_normalize_query` uses a static `_QUERY_VOCAB` tuple with `difflib.get_close_matches`. Ukrainian is a highly inflective language where prefixes, suffixes, and endings change constantly. A simple fuzzy match fails to capture grammatical forms of "укриття" (e.g. "укриттях", "укриттю").
- **Remedy:** Integrate a proper lemmatizer/stemmer library like `pymorphy2` or `Simplemma` for Ukrainian, or delegate typo normalization to a fast LLM pre-processor.

### D. Lack of API Rate Limiting and Back-Off Retries
- **Location:** [sharon/pipelines/threat_classifier.py:105-131](file:///home/vokov/projects/uav-watcher/sharon/pipelines/threat_classifier.py#L105-L131)
- **Problem:** If a proxy endpoint returns a temporary `429` (Rate Limited) or `503` (Service Unavailable), the code fails or instantly switches to the next proxy without retrying.
- **Remedy:** Implement exponential back-off using a decorator/library like `tenacity`.
