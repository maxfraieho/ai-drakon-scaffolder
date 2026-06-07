# Flue Agent Logic Investigation (TASK-181)
Date: 2026-06-08

## /agents page — current state
- The `/agents` page (rendered by `AgentStudioPage.tsx` using `DrakonEditor` / `JSON` tabs) acts as a workspace shell for managing agent pipelines.
- It displays a list of pipelines (e.g., `pipeline_a`, `pipeline_b`, `sharon_consultant_api`) loaded dynamically from the backend via the `/graph-pipelines` endpoint.
- It allows editing pipeline topology visually using the DRAKON editor, modifying node properties/actions (such as the action name or prompt template), and viewing the raw JSON representation.
- It supports saving pipeline updates via `PUT /graph-pipelines/:name`, which updates the JSON file in the repository.
- It supports executing the pipeline and streaming step-by-step log output via an SSE `/execute` stream.

## How agent logic was defined in OLD framework (LangGraph)
- In the old Python-based LangGraph framework, pipelines and logic were defined inside Python files (e.g., `architect_chat.py`, `drakon_agent.py`, `docs_agent.py`) using `StateGraph`.
- The frontend and backend used a set of hardcoded logic steps in Python files to construct the graph. It required deploying Python servers or executing local python files with specific graph state.
- Static pipeline templates were stored in `src/lib/agent-studio-data.ts`.

## How agent logic is defined in NEW framework (Flue)
- In the new Flue framework (@flue/runtime, Cloudflare Workers), agents are autonomous entities configured in TypeScript code (e.g., `services/architect-agent-flue/workflows/` and `services/architect-agent-flue/agents/`).
- Workflows are structured TypeScript automations where code guides agent execution.
- Agents are equipped with tools (e.g., MCP servers, typed actions) and skills (reusable expertise) rather than rigid, pre-defined sequences of steps.
- Execution paths are determined dynamically by the agent at runtime based on its instructions, memory, tools, and the task/goal.
- Flue *also* provides a data-driven interpreter for graph execution in `services/architect-agent-flue/tools/graph-pipelines.ts`, where `executePipelineGraph` reads `.drakon.json` pipeline files from Git, runs individual action nodes dynamically (e.g., `measure_cc`, `classify`, `ast_translate`, `yaml_gen`, `ir_gen`, `validate`, `code_gen`, `check_syntax`, etc.), and streams progress over SSE.

## Gap analysis
- **Can frontend define/edit agent behavior?**
  - **YES.** Because Flue provides both code-based autonomous agent definition and a visual/data-driven graph execution engine (`graph-pipelines.ts`) that runs JSON configurations. When the frontend saves a pipeline via `PUT /graph-pipelines/:name`, it commits the updated JSON file directly to GitHub, which is instantly interpreted on the next execution.
- **What is missing?**
  - Currently, there is a gap between code-based workflows (e.g., `pipeline-a.ts`, which has hardcoded TypeScript steps like `calculateCC`, `astTranslate`, `llmYamlGen`, etc.) and the JSON graphs in `pipelines/*.drakon.json`. Workflows defined as pure TS code (like `runPipelineA`) cannot be visually edited because they are hardcoded in TypeScript, whereas graph-based workflows (executed via `executePipelineGraph`) are fully editable.
  - In order to fully utilize Flue, any new agent workflow should be modeled as a JSON graph configuration where nodes correspond to Flue tools/actions or LLM calls. Alternatively, if a workflow must be code-based, the UI can act as a viewer but not an editor unless a TS generator/parser is built.
- **Recommended approach**:
  - Standardize on using JSON-based graph configurations (e.g., `drakon.json` files) for editing workflows and agent pipelines visually.
  - Ensure the Flue Worker/Runtime exposes a registry of available tools/actions (like a `/tools` endpoint) so the UI can dynamically suggest nodes that the developer can drag-and-drop.
  - Leverage Flue's ability to trigger tools dynamically from the LLM, reducing the need for strict sequence-based graph pipelines.

## Implementation plan
1. **Step 1:** Create `/tools` API endpoint in Flue workers to expose all available actions/tools (e.g., `measure_cc`, `classify`, `yaml_gen`, etc.) so they can be selected in the frontend `PropertiesPanel`.
2. **Step 2:** Update `/agents` UI to dynamically fetch available actions/nodes from the new `/tools` endpoint instead of relying on the static hardcoded list in `src/lib/agent-studio-data.ts`.
3. **Step 3:** Enable creating new custom agent pipelines in the UI, saving them directly as `.drakon.json` in the Flue repository, and running them dynamically.
