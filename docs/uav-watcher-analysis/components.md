# UAV Watcher Components Reference

This document catalogs and describes the responsibilities, functions, classes, and state variables for all major source files in the `uav-watcher` repository.

---

## 1. Core Threat Watcher Service

### File: [uav_watcher.py](file:///home/vokov/projects/uav-watcher/uav_watcher.py)
Monitors Telegram channels, coordinates classification, and dispatches alarms.

- **State Variables (Globals):**
  - `_last_notify_time` (`float`): Monotonic timestamp of the last sent notification.
  - `_last_notify_level` (`int`): Threat level (1-3) of the last sent notification.
  - `_active_threat` (`bool`): Tracking flag indicating if there is currently an unresolved threat.
  - `_channel_throttles` (`dict`): Per-channel log of last notification timestamps (`{channel_id: float}`).
- **Key Functions:**
  - [score_proximity](file:///home/vokov/projects/uav-watcher/uav_watcher.py#L78-L103): Analyzes message text for proximity keywords (e.g., "above city", "direction", "exploding") and scores the severity from 1 to 10.
  - [keyword_classify](file:///home/vokov/projects/uav-watcher/uav_watcher.py#L220-L245): Pre-evaluates messages using local regexes. Bypasses the AI pipeline for obvious all-clears or clear threat matches containing city keywords.
  - [ai_classify](file:///home/vokov/projects/uav-watcher/uav_watcher.py#L263-L310): Legacy fallback classifier. Iterates through the configured LLM API proxies to classify threat status when LangGraph pipeline is unavailable.
  - [send_notification](file:///home/vokov/projects/uav-watcher/uav_watcher.py#L313-L365): Formats the warning with Markdown and executes POST requests to the Telegram Bot API.
  - [send_allclear_notification](file:///home/vokov/projects/uav-watcher/uav_watcher.py#L367-L395): Resets local threat levels and notifies the chat of an all-clear status.
  - [_catchup_history](file:///home/vokov/projects/uav-watcher/uav_watcher.py#L672-L768): Processes historic channel messages from the last 4 hours on startup to prevent gaps caused by process restarts.

---

## 2. Dynamic Geo-Tracking & Maps

### File: [geo_monitor.py](file:///home/vokov/projects/uav-watcher/geo_monitor.py)
Determines the dynamic geographic search boundaries based on active user locations.

- **State Variables (Globals):**
  - `_settlement_cache` (`dict`): Grid-rounded geographical cache of nearby settlements retrieved from Overpass.
  - `_cache_lock` (`asyncio.Lock`): Lock guarding cache access.
- **Key Functions:**
  - [fetch_settlements](file:///home/vokov/projects/uav-watcher/geo_monitor.py#L30-L47): Queries the Overpass API for cities, villages, and towns in a 30 km radius of a coordinate pair.
  - [get_all_active_locations](file:///home/vokov/projects/uav-watcher/geo_monitor.py#L82-L99): Returns the latest GPS coordinates of family group members whose location check-ins are newer than 8 hours.
  - [build_pattern_from_locations](file:///home/vokov/projects/uav-watcher/geo_monitor.py#L102-L134): Consolidates all base city keywords and Overpass-retrieved settlement names into a single case-insensitive regex pattern.

---

## 3. LangGraph Threat Classifier Pipeline

### File: [sharon/pipelines/threat_classifier.py](file:///home/vokov/projects/uav-watcher/sharon/pipelines/threat_classifier.py)
Runs the LangGraph pipeline that extracts threat info and gauges severity.

- **Classes / Types:**
  - `ThreatState` (`TypedDict`): Tracks context through graph execution: `text`, `threat_type`, `region`, `time`, `severity`, `formatted_text`, `job_id`, `error`.
- **Nodes & Edges:**
  - [extract_entities](file:///home/vokov/projects/uav-watcher/sharon/pipelines/threat_classifier.py#L50-L145): Scans message for missile/UAV type keywords, and queries LLM Proxy for precise JSON entity extraction.
  - [assess_severity](file:///home/vokov/projects/uav-watcher/sharon/pipelines/threat_classifier.py#L147-L198): Gauges target threat level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) using heuristic rules (e.g. explosives indicators + local match = `CRITICAL`).
  - [decide_alert](file:///home/vokov/projects/uav-watcher/sharon/pipelines/threat_classifier.py#L200-L204): Conditional router. Sends `MEDIUM`, `HIGH`, or `CRITICAL` states to message formatter.
  - [format_message](file:///home/vokov/projects/uav-watcher/sharon/pipelines/threat_classifier.py#L206-L238): Builds recommended safe actions based on severity type.

---

## 4. Local Database Schema & Storage

### File: [db/models.py](file:///home/vokov/projects/uav-watcher/db/models.py)
Handles all local data persistence using SQLite.

- **Tables Configured:**
  - `families`: Tracks family group names, creators, and invite codes.
  - `family_members`: Logs member IDs, last active status, and custom safe messages.
  - `rollcalls`: Event IDs for emergency status updates.
  - `rollcall_responses`: Responses to rollcalls (`safe`, `sos`, `no_response`).
  - `threat_events`: Local log of categorized aerial threats for statistical analysis.
  - `location_checkins`: Keeps track of members' last coordinates, accuracy, and timestamp.

---

## 5. Crisis Chatbot Consultant API

### File: [consultant/main.py](file:///home/vokov/projects/uav-watcher/consultant/main.py)
FastAPI application that handles endpoint routing and KB file-watcher lifespans.

- **Lifespan Manager:**
  - Sets up file observer for hot-reloading changes in the knowledge directory and feeds summaries.
- **Endpoints:**
  - `/chat`: Accepts user message, session ID, and language. Invokes RAG chatbot graph.
  - `/feed`: Returns stats of current threat channels, recent threats, and summary.
  - `/situation`: Outputs current state from regional alerts.in.ua.

### File: [consultant/pipeline/nodes.py](file:///home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py)
Logic behind the chatbot pipeline nodes.

- **Key Functions:**
  - `_normalize_query`: Resolves spelling typos in user queries using a fuzzy matching vocabulary.
  - `_is_shelter_query`: Evaluates if the query is asking for shelter locations.
  - [retrieve_kb](file:///home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py#L443-L571): Runs database queries for coordinates, calls `find_shelters_sync` to get closest shelters, pulls recent threat database logs for situational context, and extracts matching sections from the markdown Knowledge Base.
  - [web_search](file:///home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py#L574-L603): If web terms match, fetches extra context snippets from DuckDuckGo.
  - [generate](file:///home/vokov/projects/uav-watcher/consultant/pipeline/nodes.py#L606-L665): Configures prompt according to psychological state heuristic indicators (Panic, active threat) and queries LLM proxies.
