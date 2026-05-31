# UAV Watcher Data-Flow Streams

This document describes the step-by-step flows of data within the `uav-watcher` system, mapping how incoming channel alerts are parsed and how user questions are answered.

---

## 1. Stream A: Threat Scraper & Notification Pipeline

This stream handles real-time messages scraped from Telegram monitor channels.

```mermaid
sequenceDiagram
    autonumber
    participant Ch as Telegram Channel
    participant TH as Telethon Userbot Handler
    participant Geo as geo_monitor.py
    participant LGC as LangGraph Classifier
    participant LLM as AI Proxy (Gemini)
    participant DB as SQLite families.db
    participant Bot as Telegram Bot API

    Ch->>TH: New Message event
    TH->>Geo: Check location match (build_pattern_from_locations)
    Note over Geo: Check active family GPS coordinates<br/>Query Overpass for 30 km settlements
    alt No geographic match
        Geo-->>TH: False
        Note over TH: Drop message (no action)
    else Geographic match
        Geo-->>TH: True
        TH->>TH: Calculate proximity score (1-10)
        TH->>LGC: Invoke classification graph
        LGC->>LLM: JSON entity extraction request
        LLM-->>LGC: JSON: threat_type, region, time
        LGC->>LGC: Assess severity level (LOW, MEDIUM, HIGH, CRITICAL)
        LGC-->>TH: Severity details & Formatted text

        alt Severity is LOW or ALL-CLEAR
            alt Is All-Clear
                TH->>DB: Save all-clear threat event
                TH->>Bot: Post "All-Clear" to Chat ID
            else
                Note over TH: Log as INFO event (no notify)
            end
        else Severity is MEDIUM, HIGH, or CRITICAL
            Note over TH: Check channel throttle (180s)
            alt Throttle block
                Note over TH: Drop alert dispatch
            else Throttle pass
                TH->>DB: Save threat event to threat_events

                alt Severity is HIGH or CRITICAL
                    TH->>DB: Query registered family members
                    DB-->>TH: List of user IDs
                    loop For each family member
                        TH->>Bot: Direct push private alert message
                    end
                end

                TH->>Bot: Post formatted alert message to channel/group
            end
        end
    end
```

---

## 2. Stream B: Sharon Chatbot Consultant RAG Pipeline

This stream handles user queries sent directly to the Sharon bot.

```mermaid
sequenceDiagram
    autonumber
    participant User as Chat User
    participant BotCmd as Bot Commands / API Client
    participant API as FastAPI App (:8770 /chat)
    participant Graph as LangGraph Chatbot
    participant DB as SQLite families.db
    participant KB as Markdown Knowledge Base
    participant DDG as DuckDuckGo Search API
    participant LLM as AI Proxy (Gemini)

    User->>BotCmd: Send text message
    BotCmd->>API: HTTP POST /chat (message, session_id, lang)
    API->>Graph: Invoke CrisisState graph

    Note over Graph: retrieve_kb node starts
    Graph->>Graph: Normalize query typos (fuzzy match)

    alt Is Shelter Query
        alt Session is Web (non-numeric UUID)
            Graph-->>BotCmd: Return Bot redirection prompt
        else Session is Telegram (numeric ID)
            Graph->>DB: Fetch last checked-in GPS coordinates
            DB-->>Graph: Coordinates (lat, lon)
            Note over Graph: Query Overpass for closest shelters
            Graph-->>Graph: Format shelter lists for user
        end
    else Regular Query
        Graph->>DB: Fetch recent threat events (last 2h/6h)
        DB-->>Graph: Event log timeline
        Graph->>KB: Semantic retrieve relevant markdown blocks
        KB-->>Graph: Safety instructions contexts
    end

    Note over Graph: web_search node starts
    alt Query matches search keywords
        Graph->>DDG: Search query + Ukraine
        DDG-->>Graph: Snippets / News context
    end
    Note over Graph: generate node starts
    Graph->>Graph: Detect user psychological state (Panic, Suicidal, etc.)
    Graph->>Graph: Prepend state rules & safety constraints to system prompt
    Graph->>LLM: POST chat/completions (History + Context + Prompt)
    LLM-->>Graph: Response text

    alt State is SUICIDAL RISK
        Graph->>Graph: Append Lifeline Ukraine hotline 7333
    end

    Graph-->>API: ChatResponse (reply text, kb_sections_used)
    API-->>BotCmd: JSON reply
    BotCmd->>User: Deliver text message
```
