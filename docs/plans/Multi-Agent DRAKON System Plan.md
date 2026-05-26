---
title: "Implementation Report: Multi-Agent DRAKON System Architecture"
type: plan
tags: [drakon, agent, python, plan]
status: active
created: 2026-05-26
updated: 2026-05-26
---

# **Implementation and Architecture Report: Multi-Agent DRAKON System**

## **Executive Synthesis of the Multi-Agent Paradigm**

The evolution of the AI-DRAKON platform from a singular processing entity to a federated, multi-agent architecture represents a pivotal transition in system complexity, operational scalability, and cognitive mapping. The current deployment state relies on a monolithic drakon-agent running on a localized FastAPI instance (port 8765\) to process Python Abstract Syntax Trees (AST) into deterministic DRAKON Intermediate Representation (IR) flowcharts. While functional, this monolithic approach suffers from the inherent limitations of massive context windows, wherein a single Large Language Model (LLM) must simultaneously balance architectural analysis, codebase documentation, and strict visual grammar mapping.

The architectural mandate detailed in this report outlines the deployment of a highly specialized, tripartite agent network. By introducing an architect-agent (port 8766\) and a docs-agent (port 8767\) alongside the existing infrastructure, the system enforces strict domain boundaries.1 This multi-agent topology mitigates latency and context-dilution issues, as each agent operates with a focused system prompt and a highly relevant localized memory namespace, thereby drastically reducing the probability of hallucination propagation—a critical failure mode in complex peer-to-peer agent networks where downstream agents inherit flawed upstream data.2

This federated backend is unified by a React 19 frontend utilizing Zustand for state management and TanStack Router for navigation. The critical boundary layer between the client-side user interface and the internal FastAPI network is brokered by a Cloudflare Worker operating as a Model Context Protocol (MCP) gateway.3 Furthermore, the system entirely decentralizes its state management, relying on a shared BM25 lexical retrieval index for static knowledge and the GitHub REST API for persistent, version-controlled memory storage.4

This report provides an exhaustive, task-by-task architectural implementation directive, synthesizing structural requirements, severe hardware constraints, protocol specifications, and the rigorous visual grammar of the DRAKON programming language to realize this multi-agent ecosystem.

## **Foundational Systems and Environmental Constraints**

### **Hardware Compatibility and Numerical Processing Limitations**

The deployment environment for the AI-DRAKON backend introduces a severe and unavoidable hardware constraint: the utilization of an AMD C-60 CPU. This specific processor architecture entirely lacks support for Advanced Vector Extensions (AVX), AVX2, and FMA3 instruction sets.6 This limitation profoundly impacts the deployment of high-performance numerical and mathematical libraries in Python, most notably NumPy and SciPy, which serve as the foundational engines for vector-based operations, embedding computations, and the lexical search indices required by the knowledge base.8

Modern versions of NumPy (specifically the 2.x release candidates and above) compile against a newer C API (version 0x10) and inherently assume the presence of AVX or modern SIMD (Single Instruction, Multiple Data) features during runtime execution.9 Attempting to execute these compiled binaries on the AMD C-60 architecture results in immediate, fatal Illegal Instruction runtime errors, or triggers cascading RuntimeError: Numpy is not available exceptions within dependent downstream libraries.9

To ensure absolute operational stability across the federated FastAPI agent network, the implementation must strictly enforce backwards-compatible dependencies. The optimal workaround involves pinning the numerical processing libraries to pre-AVX mandatory versions. The Python 3.11 environment specifications must enforce the installation of numpy\<2, specifically targeting version 1.26.4, which maintains robust compatibility with older CPU architectures while satisfying the dependency requirements of the broader ecosystem.9

Furthermore, during the virtual environment bootstrapping phase, the runtime must be heavily configured to bypass modern CPU feature dispatching. The injection of specific environment variables is required to explicitly disable SIMD features. By establishing NPY\_DISABLE\_CPU\_FEATURES="AVX2,FMA3" within the service initialization scripts, the interpreter is forced to gracefully degrade to standard SSE or base-level instructions rather than attempting to execute unsupported vector math.8 Additionally, if the NumPy wheel relies on OpenBLAS for matrix acceleration, setting the OPENBLAS\_CORETYPE environment variable to a minimal baseline architecture (such as Haswell or generic x86\_64) prevents the backend from invoking incompatible hardware optimizations.11

Because of these hardware-specific compilation requirements, the deployment protocol must utilize the python3 \-m venv.venv \--system-site-packages command. This permits the virtual environment to fall back on host-level OS packages if specific wheel compilations fail during the standard pip install process.13

### **Lexical Knowledge Base and Retrieval Mechanisms**

The multi-agent system relies intrinsically on a shared knowledge base—located physically at services/drakon-agent/knowledge/—to ingest, index, and retrieve canonical DRAKON IR rules, codebase patterns, API definitions, and architectural constraints. Because the agents operate autonomously, they require rapid, localized context retrieval without invoking costly, high-latency LLM-based vector embedding generation for every sub-query.

The architectural design specifies a BM25 retrieval system, which operates on term frequency-inverse document frequency (TF-IDF) principles, refined to prevent term saturation and account for document length normalization.14 While rank-bm25 is a traditional implementation, it suffers from severe performance bottlenecks in pure Python environments when scaling beyond baseline document counts, frequently resulting in unacceptable queries-per-second (QPS) throughput.15 Given the CPU constraints of the AMD C-60, the system requires a highly optimized algorithmic implementation.

The bm25s library presents the optimal, pure-Python solution. Designed to bypass the overhead of standard iterative loops, bm25s leverages SciPy sparse matrices to pre-compute and eagerly store document token scores.16 When an agent submits a query, the system simply sums the relevant tokens via highly optimized sparse matrix operations, achieving processing throughput orders of magnitude faster than standard implementations.15

To conserve the highly constrained RAM of the host system, the implementation will utilize memory-mapped arrays. By initializing the index with the mmap=True parameter, the agents can read the indexed corpus directly from disk storage.15 This architectural decision facilitates highly efficient, concurrent read operations across the drakon-agent, architect-agent, and docs-agent instances without duplicating the knowledge base footprint in active memory.

| BM25 Implementation | Core Technology | Speed/Throughput | Infrastructure Requirement |
| :---- | :---- | :---- | :---- |
| **Elasticsearch** | Java / Apache Lucene | Extremely High | Requires dedicated server/JVM 16 |
| **rank-bm25** | Pure Python | Low | None (High CPU load during query) 19 |
| **bm25s** (Selected) | SciPy Sparse Matrices | High | None (Supports memory mapping) 15 |

## **Edge Orchestration via Model Context Protocol**

### **Cloudflare Worker Gateway Routing**

The perimeter of the AI-DRAKON platform is secured, authorized, and orchestrated by a Cloudflare Worker acting as a Model Context Protocol (MCP) broker. MCP establishes a standardized communication vector between LLM clients (such as the React frontend communicating on behalf of the user) and external computational tools.20 By utilizing a Cloudflare Worker, the architecture pushes the routing and authorization logic to the edge, isolating the internal FastAPI agents from direct public exposure.22

Recent iterations of the MCP specification deprecate legacy Server-Sent Events (SSE) in favor of Streamable HTTP transports for standard client-server communication.20 Accordingly, the Cloudflare Worker must expose a single /mcp endpoint accepting both POST and GET HTTP methods.20 All JSON-RPC messages originating from the frontend must be transmitted as POST requests, carrying an Accept header that explicitly lists both application/json and text/event-stream.20

To prevent DNS rebinding attacks and cross-site request forgery, the worker must rigorously validate the Origin header of all incoming connections.20 Authentication is managed at this edge layer; the worker intercepts the request, validates the Authorization: Bearer drakon-mcp-2026 token, and only upon successful verification does it parse the internal JSON-RPC payload.23

The worker script (worker-mcp-drakon.js) is responsible for defining the schemas of the available tools and proxying the invocations to the internal network. When the frontend invokes the drakon.agentchat tool, the worker extracts the agent target ("architect" or "docs"), maps it to the corresponding internal IP and port configuration (e.g., http://192.168.3.184:8766), and utilizes the native fetch API to asynchronously transmit the payload.3 This proxy pattern ensures that the internal FastAPI servers can bind securely to localhost or internal subnets, complying with MCP security best practices while remaining accessible to the authorized frontend.20

### **Optimistic Concurrency and State Lifecycle Management**

To avoid the overhead and operational complexity of a traditional relational database, the multi-agent system utilizes the project's own GitHub repository as a persistent, version-controlled state ledger. Each agent operates within a dedicated sub-namespace in the memory/ directory (e.g., memory/architect/MEMORY.md, memory/docs/api-coverage.md).

Relying on the GitHub REST API for high-frequency agent memory persistence introduces a significant distributed systems challenge: race conditions. When multiple agents, or an agent and a human developer, attempt to modify the repository simultaneously, the API will frequently return an HTTP 409 Conflict error.24

The 409 Conflict status code indicates a fundamental disagreement with the current state of the target resource.26 In the context of the GitHub API, this occurs during a PUT request if the provided sha (Secure Hash Algorithm identifier) representing the file being updated does not exactly match the latest commit hash on the target branch.27 This version mismatch signifies that another entity has committed a change between the time the agent fetched the file and the time it attempted to save its modifications.28

To ensure absolute data integrity and prevent the catastrophic loss of agent context, the backend memory\_manager.py utility must implement a rigorous optimistic concurrency control pattern. The resolution strategy operates as follows:

1. The agent issues a PUT request containing the intended markdown content, the commit message, and the originally fetched sha.  
2. If the GitHub API responds with a 409 Conflict, the HTTP client (utilizing httpx) catches the exception.  
3. The system initiates an exponential backoff sequence (e.g., waiting 500ms, then 1000ms) to allow concurrent API operations to settle.29  
4. The agent issues a fresh GET request to the file's endpoint to retrieve the newly updated content and the newly minted sha token.  
5. The agent programmatically merges its intended modifications with the newly fetched content (e.g., appending its logs to the bottom of the file).  
6. The agent re-issues the PUT request with the updated payload and the correct sha.

This retry logic guarantees that the GitHub repository remains a mathematically consistent state ledger, seamlessly resolving multi-agent push conflicts without requiring manual human intervention.31

## **The DRAKON Visual Grammar and Abstract Syntax Tree Translation**

### **Cognitive Ergonomics of the DRAKON Language**

The fundamental value proposition of the AI-DRAKON platform lies in its ability to translate dense, textual Python code and abstract architectural concepts into visually deterministic flowcharts. The DRAKON language, originally engineered for the Soviet Buran space program, enforces a rigid set of graphical rules specifically designed to optimize human cognitive processing, eliminate visual noise, and prevent the tangled "spaghetti" logic common in standard UML or flowcharting tools.33

The architectural mapping from the backend AI agents (synthesizing ASTs or repository structures) to the frontend drakonwidget.js rendering engine relies on absolute adherence to three foundational visual principles:

1. **The Skewer (The Happy Path):** DRAKON dictates that the most common, successful, or desirable execution path through an algorithm must form a completely straight, uninterrupted vertical line descending from the top of the diagram to the bottom.35 Line intersections and unnecessary angles are strictly forbidden.37 When the drakon-agent or architect-agent generates an Intermediate Representation (IR), the default logic flow must continuously map to the one branch in the JSON contract, chaining directly downward. In the absence of a Skewer, a branch is considered visually broken and cognitively dissonant.36  
2. **The Silhouette:** To manage vast systemic complexity, extensive algorithms or architectural diagrams are fractured into independent, logical blocks arranged horizontally from left to right.35 Each block represents a distinct state, microservice, or sub-process.39 The architect-agent, when analyzing broad repository structures, will utilize the Silhouette pattern to represent different top-level directories, ensuring the visual representation scales cleanly without overwhelming the viewer.35  
3. **Rightward Degradation:** A defining characteristic of DRAKON is its spatial handling of exceptions. Conditional branches, errors, and edge cases are systematically routed to the right of the central Skewer.35 The heuristic rule dictates: "the further to the right, the worse the situation".36 When an AI agent maps Python try/except blocks or if/else error checks, it must mathematically map the failure state to the two (rightward) branch of the JSON IR.36 This spatial consistency ensures that a developer can instantly identify the "happy path" (straight down) versus error handling (branching right) without reading a single line of text.37

### **Intermediate Representation (IR) Contracts**

The canonical data contract between the Python FastAPI agents and the React frontend is defined by the IrDiagram object. The integrity of this JSON structure is paramount, as the drakonwidget.js engine possesses no external dependencies and relies entirely on strict input formatting.

The system requires two mandatory invariants for a diagram to render successfully:

* **Initialization Node:** A branch initialization node (b0, type: "branch", branchId: 0\) must exist. This serves as the anchor point for the Skewer.  
* **Termination Node:** An explicitly defined termination node (end, type: "end") must exist to cap the vertical flow.  
  Without these anchors, the rendering engine fails to construct the topological graph, outputting only the header metadata.

Furthermore, legacy architectural debt necessitates a precise boundary transformation: the params field is defined as an array of strings (string) within the TypeScript frontend definitions, but it is historically processed as a single, comma-separated string within the legacy drakon-agent. The MCP proxy layer or the specific FastAPI agent endpoints must actively intercept and normalize this data type during serialization to prevent silent parsing failures.

## **Exhaustive Implementation Directives: Task Execution**

The realization of the multi-agent system requires the precise, sequential execution of eight distinct tasks. The following sections detail the exhaustive implementation logic, structural considerations, and algorithmic strategies required for successful deployment.

### **Task 1: Repository Memory Bootstrap and Concurrency System**

The instantiation of the services/drakon-agent/memory\_manager.py utility serves as the foundational persistence layer for the entire network. This module interfaces directly with the GitHub REST API to synchronize the localized agent state with the remote origin repository.

The implementation requires the construction of three core functions: ensure\_agent\_memory, save\_memory, and get\_memory. The initialization process operates on a lazy-loading paradigm designed to minimize unnecessary API calls. Upon the startup sequence of any FastAPI agent, the ensure\_agent\_memory function executes a non-blocking HTTP GET request to verify the existence of the memory/{agent\_name}/MEMORY.md index file in the target repository. If a 404 Not Found response is returned, the agent autonomously generates a baseline markdown file. Because the GitHub API requires binary safety for file uploads, the content must be encoded in Base64 before being wrapped in the JSON payload and committed.27

The save\_memory function requires the direct implementation of the optimistic concurrency control discussed previously. The algorithmic flow must execute as follows:

1. Execute a GET request to the target file path via httpx.  
2. Extract the existing sha token from the JSON payload.  
3. Encode the new combined memory content into Base64.  
4. Construct the PUT payload containing the message, content, branch, and the acquired sha.  
5. Execute the PUT request.  
6. If the response status code is 409 26, trigger an asyncio.sleep() mechanism, recursively invoke step 1 to acquire the newly minted sha from the conflicting commit, and attempt the PUT operation again. This robust implementation ensures idempotency and guarantees the preservation of agent memory across the network.

### **Task 2: Architect Agent Service Deployment**

The Architect agent operates on port 8766 and is responsible for systemic code analysis, repository structural integrity, and the generation of macroscopic DRAKON diagrams representing the project's topology. The service is built upon the FastAPI framework, leveraging its native asynchronous support (async def) and Pydantic data validation to handle concurrent MCP tool requests securely and efficiently.44

The core prompt engineering and context orchestration resides within the ai\_chat/architect\_chat.py module. To generate hyper-accurate, non-hallucinated responses, the agent synthesizes four distinct data streams into its LLM context window:

1. **Project Context:** The complete hierarchical file tree fetched from the GitHub origin.  
2. **Visual State:** The JSON representation of the currently active DRAKON diagram being viewed by the user.  
3. **Historical Memory:** Content extracted from memory/architect/MEMORY.md, ensuring the agent recalls previous Architectural Decision Records (ADRs) and structural mandates.  
4. **Epistemological Rules:** Strict DRAKON IR formatting rules injected dynamically from the shared BM25 knowledge base.

The interaction with the underlying LLM (routed via an OpenAI-compatible proxy at http://localhost:18880/v1) requires a low temperature setting (e.g., 0.2) to minimize creative deviation and enforce highly deterministic JSON output. The agent utilizes a Regular Expression (Regex) parsing heuristic to locate and extract MutationOp arrays embedded within markdown code blocks (e.g., \`\`\`json) in the LLM's response. These extracted mutations are subsequently routed back through the MCP broker to the frontend, where they can be executed against the drakonwidget.js canvas.

### **Task 3: Documentation Agent Service Deployment**

Operating on port 8767, the Documentation agent (docs-agent) is dedicated to monitoring, generating, and persisting project documentation. Similar to the Architect agent, it relies on FastAPI for HTTP transport but utilizes highly specialized analytical modules tailored for textual analysis.44

The primary heuristic engine for this agent resides in analyzer/doc\_coverage.py. The algorithm conducts a comparative topological analysis between the source code directory and the documentation namespace. By parsing the GitHub file tree, it identifies modules located in src/ (e.g., src/api/routes.py) that lack corresponding markdown definitions in the docs/ namespace (e.g., docs/api/routes.md).

Advanced implementations of this module will invoke Python's native ast library to parse the raw source code of targeted Python files.47 By traversing the Abstract Syntax Tree, the agent isolates FunctionDef and ClassDef nodes, inspecting them for the presence of native docstrings via ast.get\_docstring().49 Nodes lacking adequate documentation are flagged, compiled into a coverage deficit report, and appended to the memory/docs/api-coverage.md ledger via the GitHub persistence layer. When engaged in conversation by a developer, the agent utilizes this localized report to proactively suggest documentation enhancements.

### **Task 4: Federated Knowledge Base Contribution**

A defining characteristic of a truly autonomous multi-agent paradigm is the capacity for agents to dynamically enrich their shared epistemological foundation without human bottlenecking. The services/shared/kb\_writer.py library enables both the Architect and Documentation agents to write new heuristic rules or code patterns directly to the shared services/drakon-agent/knowledge/ directory.

To prevent cascading infinite loops of redundant knowledge generation (where agents repeatedly save identical insights), the contribute\_to\_kb function employs strict cryptographic hashing. Before committing a write operation to disk, the function computes the MD5 hash of the proposed markdown content and compares it against the MD5 hash of the existing file. If the hashes are identical, the write operation is aborted, conserving valuable I/O cycles.

Newly generated files are automatically prefixed with an HTML-style metadata tag (e.g., \`\`) to maintain a clear provenance ledger. Once written to the filesystem, the BM25 retrieval index must be asynchronously instructed to re-parse the directory, tokenize the new corpus, and eagerly compute the updated sparse matrix scores. This ensures the newly synthesized knowledge is immediately retrievable by all peer agents in the network.16

### **Task 5: Cloudflare Worker Tool Definitions and Proxy Logic**

The Cloudflare Worker (worker-mcp-drakon.js) must be heavily modified to instantiate four new MCP tools, expanding the protocol's capabilities to handle multi-agent routing and memory access. These tools are defined using rigorous JSON Schema specifications, which the MCP protocol exposes to the connected React client.4

The required tool schemas include:

* drakon.listmemory: Enumerates the markdown files mapped to a specific agent's memory/ namespace.  
* drakon.getmemory: Retrieves the decoded Base64 content of a target memory file.  
* drakon.savememory: Executes the Git persistence logic, invoking the necessary API calls to update the remote repository.  
* drakon.agentchat: The primary communication conduit, proxying natural language queries and context payloads to the specialist agents.

Within the worker's execution context, the tools/call handler intercepts the drakon.agentchat payload. It extracts the agent parameter ("architect" or "docs") and maps it to the corresponding internal URL configured in the worker's environment variables (ARCHITECT\_AGENT\_URL or DOCS\_AGENT\_URL). The worker utilizes the native V8 fetch API to asynchronously transmit the payload via POST to the internal FastAPI instance.3 This precise proxy pattern guarantees that the external frontend remains securely isolated from the internal network topology, while the worker absorbs HTTP latency and manages authentication at the edge.22

| MCP Tool Name | Function | Input Schema Requirements | Target System |
| :---- | :---- | :---- | :---- |
| drakon.listmemory | Directory traversal | agent (enum) | GitHub API |
| drakon.savememory | State persistence | agent, file, content, commit\_msg | GitHub API |
| drakon.agentchat | Contextual LLM chat | agent (enum), message, context | Internal FastAPI (8766/8767) |

### **Task 6: Frontend React and Zustand Integration**

The frontend architecture necessitates the integration of a unified agent interaction interface seamlessly positioned alongside the existing DiagramsPage and the drakonwidget.js canvas. Built upon React 19 and utilizing Zustand for highly performant global state management 51, the new components (AgentChatPanel.tsx and AgentMessage.tsx) provide a persistent communication sidebar.

The useAgentChat.ts React hook manages the complex lifecycle of the HTTP JSON-RPC invocations to the Cloudflare Worker. It maintains a localized state array of message histories and handles asynchronous loading spinners to provide visual feedback during LLM generation.

A critical and complex design pattern within the AgentMessage.tsx component is the conditional rendering of the "Apply Mutations" interface. When an agent (such as the Architect) returns a JSON payload containing suggested\_mutations, the component detects this array and renders a discrete, actionable button alongside a collapsible JSON preview. Upon user interaction, this button executes the drakon.mutatediagram MCP tool, pushing the generated JSON operations directly into the active diagram state managed by Zustand. This creates a highly efficient feedback loop: the agent analyzes the repository, proposes structural changes mathematically mapped to DRAKON IR, and the human user executes the changes with a single click, instantly updating the visual flowchart without manual vector drawing.

### **Task 7: Architectural Traversal and Generation**

The repo\_to\_architecture\_ir algorithm residing within the Architect agent represents a complex topological mapping operation. It is tasked with translating a standard, deeply nested hierarchical file directory into a flat, interconnected, and visually compliant DRAKON graph.

The algorithm executes through a strict pipeline:

1. **Ingestion:** The agent executes a recursive GET request to the GitHub Trees API (/git/trees/{sha}?recursive=1), pulling the complete repository structure into memory as a flat array of nodes.32  
2. **Clustering:** The file nodes are iterated and grouped dynamically by their top-level directory names. Hidden files and directories (prefixed with .) are discarded to reduce visual noise.  
3. **Heuristic Analysis:** For each directory cluster, the algorithm counts the distribution of significant file types (e.g., .py, .ts, .tsx), generating a contextual string summarizing the module's technological footprint.  
4. **Graph Generation:** The algorithm instantiates the mandatory b0 branch node. It then iterates through the sorted directory clusters, generating a discrete DRAKON action node for each cluster.  
5. **Chaining:** The one parameter of each action node is explicitly linked to the string id of the subsequent node. This mathematical linking forms a perfect vertical line, mapping the repository structure directly to the DRAKON "Skewer" principle.35 The final node is securely linked to the mandatory end node.

This algorithmic approach guarantees that any repository, regardless of depth or complexity, can be instantly visualized as a strict, ergonomically sound flowchart representing its macroscopic architecture.

### **Task 8: Automated Bootstrapping on Constrained Hardware**

Given the unique environmental constraints of the deployment hardware (AMD C-60 CPU, complete absence of AVX/SIMD instructions), the instantiation of the system on a new machine requires a highly controlled, fault-tolerant bootstrapping script (scripts/bootstrap.py).

The script is responsible for idempotently generating the required memory directories (memory/architect, memory/docs, memory/shared) and injecting .gitkeep placeholders to ensure proper repository tracking by Git. Furthermore, it duplicates .env.example files to establish the baseline configuration for local execution.

The most critical operation executed by the bootstrap script is the creation of the Python virtual environments for the three FastAPI services. Because the host system is severely hardware-constrained, the script must invoke the venv module with the \--system-site-packages flag. This specific configuration is vital; it allows the virtual environment to fall back on host-level OS packages if specific PyPI wheel compilations fail due to the missing AVX instruction sets.6

Following the venv creation, the script triggers the pip install \-r requirements.txt execution via a subprocess command. As mandated by the architecture, the requirements files must be strictly pinned to numpy\<2 (e.g., numpy==1.26.4) to prevent the installation of incompatible 2.x binaries.9 By strictly controlling this environment initialization, the bootstrap script effectively inoculates the system against unexpected binary incompatibilities, ensuring that the local FastAPI agents, the BM25 bm25s retrieval engine, and the AST parsers deploy cleanly without requiring deep manual intervention or C-compiler debugging from the developer.

## **Systemic Operational Scenarios**

To fully illustrate the efficacy and integration of the multi-agent DRAKON platform, an analysis of the system's operational flow under specific user interactions is required.

### **Operational Flow: Architectural Diagramming (UC-1 / UC-3)**

When a developer interacts with the frontend DiagramsPage and requests an architectural breakdown of a specific module (e.g., typing "Create a DRAKON diagram showing the HTSE pipeline flow" into the chat interface), the event cascade is highly orchestrated.

The React frontend dispatches an RPC request containing the current repository file tree, the active folder slug, and the user's prompt to the Cloudflare Worker via Streamable HTTP. The worker validates the JWT/Bearer token and routes the request securely to port 8766 (Architect Agent).

Upon receiving the payload, the Architect agent first executes an internal retrieval request against the shared knowledge/ directory using the bm25s engine. Because bm25s relies on memory-mapped sparse matrices 15, the retrieval of the relevant DRAKON IR format rules occurs in milliseconds, completely bypassing Python's standard looping overhead. Concurrently, the agent reads its specific MEMORY.md file from the local repository clone to establish historical architectural context.

The agent packages this context alongside the GitHub file tree and transmits it to the local LLM proxy. The LLM processes the prompt and returns a deterministic JSON payload representing the DRAKON IR. Crucially, the generated IR strictly adheres to the visual grammar rules: a central Skewer is established through a chain of action nodes, and any validation logic is mapped to question nodes with the failure path routed to the right (two branch), adhering strictly to rightward degradation.35

The payload is relayed back through the worker to the React frontend, where the AgentChatPanel renders the "Apply Mutations" interface. Upon execution, the drakonwidget.js canvas natively renders the flowchart. Finally, the Architect agent triggers the save\_memory function, executing a GitHub API PUT request with optimistic concurrency control to update its diagrams-index.md ledger, creating a permanent record of the newly generated architecture.

### **Operational Flow: Automated Documentation Sync (UC-2)**

In a scenario where a backend endpoint is modified, the developer engages the Docs agent. The request ("The /analyze endpoint now supports refine=false parameter, update the docs") initiates a similar transit path, routed by the Cloudflare Worker to port 8767\.

The Docs agent queries the BM25 index for specific API documentation standards. It then utilizes its AST parser (doc\_coverage.py) to verify the structure of the /analyze endpoint within the codebase, ensuring the user's claim matches the physical Python file parameters.47

The agent generates the markdown update and formulates a mutation payload. When the developer approves the proposed documentation change in the UI, the agent leverages the memory\_manager.py utility to commit the update directly to memory/docs/api-coverage.md. If a simultaneous commit occurs from another developer, the 409 Conflict trap intercepts the failure, recalculates the SHA, and ensures the documentation update is merged seamlessly without data loss.30

### **Operational Flow: New Developer Onboarding (UC-4)**

When a new developer clones the ai-drakon-setup repository onto a fresh machine, the environmental setup is entirely automated. The developer executes python3 scripts/bootstrap.py.

The script immediately generates the memory/architect, memory/docs, and memory/shared directories. It copies the .env.example files to establish baseline configurations. It provisions the virtual environments utilizing the \--system-site-packages flag and installs the numpy\<2 dependencies, ensuring immediate compatibility with the constrained AMD C-60 hardware.6

Once the developer adds their GITHUB\_TOKEN and starts the FastAPI services, the agents initialize. On first startup, each agent independently calls ensure\_agent\_memory(). Detecting that their respective MEMORY.md files do not exist in the remote repository, they automatically generate the initial markdown files, encode them in Base64, and push the first commit to the repository.27 The developer is instantly presented with a clean, fully initialized, and state-aware multi-agent ecosystem ready for immediate architectural analysis and diagrammatic generation.

#### **Джерела**

1. Build a multi-source knowledge base with routing \- Docs by LangChain, доступ отримано травня 12, 2026, [https://docs.langchain.com/oss/python/langchain/multi-agent/router-knowledge-base](https://docs.langchain.com/oss/python/langchain/multi-agent/router-knowledge-base)  
2. Multi-Agent AI Systems: Architecture & Failure Modes | Augment Code, доступ отримано травня 12, 2026, [https://www.augmentcode.com/guides/multi-agent-ai-systems](https://www.augmentcode.com/guides/multi-agent-ai-systems)  
3. Cloudflare Workers MCP \- Model Context Protocol Integration for Cursor IDE | MCPCursor, доступ отримано травня 12, 2026, [https://mcpcursor.com/server/cloudflare-workers-mcp](https://mcpcursor.com/server/cloudflare-workers-mcp)  
4. FastAPI with MCP: build enterprise AI agents for api-driven apps | MintMCP Blog, доступ отримано травня 12, 2026, [https://www.mintmcp.com/blog/build-enterprise-ai-agents](https://www.mintmcp.com/blog/build-enterprise-ai-agents)  
5. Building Multi-Agent Systems with Shared Memory Guide \- Hindsight, доступ отримано травня 12, 2026, [https://hindsight.vectorize.io/guides/2026/04/21/guide-building-multi-agent-systems-with-shared-memory](https://hindsight.vectorize.io/guides/2026/04/21/guide-building-multi-agent-systems-with-shared-memory)  
6. CPU build options — NumPy v2.2 Manual, доступ отримано травня 12, 2026, [https://numpy.org/doc/2.2/reference/simd/build-options.html](https://numpy.org/doc/2.2/reference/simd/build-options.html)  
7. Support for CPU without AVX instruction · Issue \#2298 · blakeblackshear/frigate \- GitHub, доступ отримано травня 12, 2026, [https://github.com/blakeblackshear/frigate/issues/2298](https://github.com/blakeblackshear/frigate/issues/2298)  
8. CPU build options — NumPy v2.1 Manual, доступ отримано травня 12, 2026, [https://numpy.org/doc/2.1/reference/simd/build-options.html](https://numpy.org/doc/2.1/reference/simd/build-options.html)  
9. How to solve the pytorch RuntimeError: Numpy is not available without upgrading numpy to the latest version because of other dependencies \- Stack Overflow, доступ отримано травня 12, 2026, [https://stackoverflow.com/questions/71689095/how-to-solve-the-pytorch-runtimeerror-numpy-is-not-available-without-upgrading](https://stackoverflow.com/questions/71689095/how-to-solve-the-pytorch-runtimeerror-numpy-is-not-available-without-upgrading)  
10. Module API version issue when numpy is installed from source and numpy version is older than \`oldest-supported-numpy\` · Issue \#67 · scipy/oldest-supported-numpy \- GitHub, доступ отримано травня 12, 2026, [https://github.com/scipy/oldest-supported-numpy/issues/67](https://github.com/scipy/oldest-supported-numpy/issues/67)  
11. Troubleshooting — NumPy v2.4 Manual, доступ отримано травня 12, 2026, [https://numpy.org/doc/stable/user/troubleshooting-importerror.html](https://numpy.org/doc/stable/user/troubleshooting-importerror.html)  
12. How can I make numpy use SSE4\_2 instead of AVX? \- Stack Overflow, доступ отримано травня 12, 2026, [https://stackoverflow.com/questions/56012936/how-can-i-make-numpy-use-sse4-2-instead-of-avx](https://stackoverflow.com/questions/56012936/how-can-i-make-numpy-use-sse4-2-instead-of-avx)  
13. Setting up and Optimizing Python for Data Science on Intel, AMD, and ARM (including Apple) Computers \- Syllepsis, доступ отримано травня 12, 2026, [https://syllepsis.live/2022/01/17/setting-up-and-optimizing-python-for-data-science-on-intel-amd-and-arm-including-apple-computers/](https://syllepsis.live/2022/01/17/setting-up-and-optimizing-python-for-data-science-on-intel-amd-and-arm-including-apple-computers/)  
14. BM25-Search \- GitHub Pages, доступ отримано травня 12, 2026, [https://millet04.github.io/bm25-search/](https://millet04.github.io/bm25-search/)  
15. bm25s · PyPI, доступ отримано травня 12, 2026, [https://pypi.org/project/bm25s/](https://pypi.org/project/bm25s/)  
16. BM25 for Python: Achieving high performance while simplifying dependencies with \*BM25S\* \- Hugging Face, доступ отримано травня 12, 2026, [https://huggingface.co/blog/xhluca/bm25s](https://huggingface.co/blog/xhluca/bm25s)  
17. xhluca/bm25s: Fast BM25 search in Python, powered by Numpy and Numba \- GitHub, доступ отримано травня 12, 2026, [https://github.com/xhluca/bm25s](https://github.com/xhluca/bm25s)  
18. BM25 for Python: Achieving high performance while simplifying dependencies with BM25S \- Reddit, доступ отримано травня 12, 2026, [https://www.reddit.com/r/Python/comments/1dmwfbf/bm25\_for\_python\_achieving\_high\_performance\_while/](https://www.reddit.com/r/Python/comments/1dmwfbf/bm25_for_python_achieving_high_performance_while/)  
19. GitHub \- dorianbrown/rank\_bm25: A Collection of BM25 Algorithms in Python, доступ отримано травня 12, 2026, [https://github.com/dorianbrown/rank\_bm25](https://github.com/dorianbrown/rank_bm25)  
20. Transports \- Model Context Protocol, доступ отримано травня 12, 2026, [https://modelcontextprotocol.io/docs/concepts/transports\#http-with-sse](https://modelcontextprotocol.io/docs/concepts/transports#http-with-sse)  
21. Control Cloudflare Infrastructure Using AI \+ MCP (with Python Example) \- DEV Community, доступ отримано травня 12, 2026, [https://dev.to/extinctsion/control-cloudflare-infrastructure-using-ai-mcp-with-python-example-1bak](https://dev.to/extinctsion/control-cloudflare-infrastructure-using-ai-mcp-with-python-example-1bak)  
22. Build and deploy Remote Model Context Protocol (MCP) servers to Cloudflare, доступ отримано травня 12, 2026, [https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/](https://blog.cloudflare.com/remote-model-context-protocol-servers-mcp/)  
23. How to Connect Cloudflare Worker to MCP: Enterprise Guide | MintMCP Blog, доступ отримано травня 12, 2026, [https://www.mintmcp.com/blog/connect-cloudflare-worker-with-mcp](https://www.mintmcp.com/blog/connect-cloudflare-worker-with-mcp)  
24. GitHub API: 409 Conflict When Adding or Updating Repository Content \- Stack Overflow, доступ отримано травня 12, 2026, [https://stackoverflow.com/questions/78876325/github-api-409-conflict-when-adding-or-updating-repository-content](https://stackoverflow.com/questions/78876325/github-api-409-conflict-when-adding-or-updating-repository-content)  
25. Getting a lot of 409 Conflict errors in response and the error message is unclear · Issue \#1787 \- GitHub, доступ отримано травня 12, 2026, [https://github.com/PyGithub/PyGithub/issues/1787](https://github.com/PyGithub/PyGithub/issues/1787)  
26. HTTP 409 Conflict Error \- Meaning & Fix \- Oxylabs, доступ отримано травня 12, 2026, [https://oxylabs.io/resources/error-codes/409](https://oxylabs.io/resources/error-codes/409)  
27. 2\. replace or update file in repo | GitHub API \- 2\. Advanced (with Auth) \- Postman, доступ отримано травня 12, 2026, [https://www.postman.com/postman/postman-api-101-with-auth/request/1s01he3/2-replace-or-update-file-in-repo](https://www.postman.com/postman/postman-api-101-with-auth/request/1s01he3/2-replace-or-update-file-in-repo)  
28. What is HTTP 409 Error? (Conflict) \- Scrapfly Blog, доступ отримано травня 12, 2026, [https://scrapfly.io/blog/posts/what-is-http-409-status-code-conflict](https://scrapfly.io/blog/posts/what-is-http-409-status-code-conflict)  
29. 409 Conflict \- HTTP status code explained, доступ отримано травня 12, 2026, [https://http.dev/409](https://http.dev/409)  
30. 409 Conflict: What It Is And How To Fix It \- Mageplaza, доступ отримано травня 12, 2026, [https://www.mageplaza.com/insights/409-conflict.html](https://www.mageplaza.com/insights/409-conflict.html)  
31. 409 Conflict \- What is it & How to Fix the 409 Error? (7 Ways) \- SiteGround, доступ отримано травня 12, 2026, [https://www.siteground.com/kb/409-conflict-error/](https://www.siteground.com/kb/409-conflict-error/)  
32. GitHub REST APIs, доступ отримано травня 12, 2026, [https://developers.thoughtspot.com/docs/git-api](https://developers.thoughtspot.com/docs/git-api)  
33. The DRAKON Language \- DrakonFlow, доступ отримано травня 12, 2026, [https://drakonflow.com/read/drakon](https://drakonflow.com/read/drakon)  
34. DRAKON \- Wikipedia, доступ отримано травня 12, 2026, [https://en.wikipedia.org/wiki/DRAKON](https://en.wikipedia.org/wiki/DRAKON)  
35. Our Accelerators | Drakon Mapping \- VMG Labs, доступ отримано травня 12, 2026, [https://vmglabs.com/drakon-mapping](https://vmglabs.com/drakon-mapping)  
36. DRAKON.pdf, доступ отримано травня 12, 2026, [https://drakon-editor.sourceforge.net/DRAKON.pdf](https://drakon-editor.sourceforge.net/DRAKON.pdf)  
37. DRAKON Flowchart Tutorial Part 1 | PDF | Algorithms And Data Structures \- Scribd, доступ отримано травня 12, 2026, [https://www.scribd.com/document/465913032/drakon-part1-eng-pdf](https://www.scribd.com/document/465913032/drakon-part1-eng-pdf)  
38. DRAKON Visual Language: Tutorial. Part 1 | PDF \- Slideshare, доступ отримано травня 12, 2026, [https://www.slideshare.net/slideshow/drakon-part1-eng/22563246](https://www.slideshare.net/slideshow/drakon-part1-eng/22563246)  
39. DRAKON-Erlang part 6, доступ отримано травня 12, 2026, [https://drakon-editor.sourceforge.net/drakon-erlang/silh.html](https://drakon-editor.sourceforge.net/drakon-erlang/silh.html)  
40. Free flowchart, mind map, and checklist software—DrakonHub, доступ отримано травня 12, 2026, [https://drakonhub.myhybridlab.com/](https://drakonhub.myhybridlab.com/)  
41. DRAKON the Codinator — Visual Programming Language | by Ryan von Kunes Newton, доступ отримано травня 12, 2026, [https://vonkunesnewton.medium.com/drakon-the-codinator-visual-programming-language-9355959b09d1](https://vonkunesnewton.medium.com/drakon-the-codinator-visual-programming-language-9355959b09d1)  
42. DRAKON | Hacker News, доступ отримано травня 12, 2026, [https://news.ycombinator.com/item?id=41292757](https://news.ycombinator.com/item?id=41292757)  
43. 409 Conflict \- HTTP \- MDN Web Docs \- Mozilla, доступ отримано травня 12, 2026, [https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/409](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/409)  
44. Bigger Applications \- Multiple Files \- FastAPI, доступ отримано травня 12, 2026, [https://fastapi.tiangolo.com/tutorial/bigger-applications/](https://fastapi.tiangolo.com/tutorial/bigger-applications/)  
45. From Localhost to API: Serving Your Multi-Agent AI System with FastAPI \- Medium, доступ отримано травня 12, 2026, [https://medium.com/@ayushmathur1000/from-localhost-to-api-serving-your-multi-agent-ai-system-with-fastapi-4fe9cdb4b534](https://medium.com/@ayushmathur1000/from-localhost-to-api-serving-your-multi-agent-ai-system-with-fastapi-4fe9cdb4b534)  
46. Best Practices in FastAPI Architecture: A Complete Guide to Building Scalable, Modern APIs, доступ отримано травня 12, 2026, [https://zyneto.com/blog/best-practices-in-fastapi-architecture](https://zyneto.com/blog/best-practices-in-fastapi-architecture)  
47. Create flow chart from python script \- Esri Community, доступ отримано травня 12, 2026, [https://community.esri.com/t5/arcgis-pro-questions/create-flow-chart-from-python-script/td-p/1651132](https://community.esri.com/t5/arcgis-pro-questions/create-flow-chart-from-python-script/td-p/1651132)  
48. I built a tool that uses the 'ast' module to auto-generate interactive flowcharts from any Python. \- Reddit, доступ отримано травня 12, 2026, [https://www.reddit.com/r/Python/comments/1mngei8/i\_built\_a\_tool\_that\_uses\_the\_ast\_module\_to/](https://www.reddit.com/r/Python/comments/1mngei8/i_built_a_tool_that_uses_the_ast_module_to/)  
49. Supercharge your Python library using AST parsing \- Adam Glustein \- YouTube, доступ отримано травня 12, 2026, [https://www.youtube.com/watch?v=A0vR3l1X-CU](https://www.youtube.com/watch?v=A0vR3l1X-CU)  
50. Securing MCP servers · Cloudflare Agents docs, доступ отримано травня 12, 2026, [https://developers.cloudflare.com/agents/guides/securing-mcp-server/](https://developers.cloudflare.com/agents/guides/securing-mcp-server/)  
51. React — Managing Chaos with Zustand | by Jan Lewandoski \- Medium, доступ отримано травня 12, 2026, [https://medium.com/@janek.lewandoski/react-managing-chaos-with-zustand-78b42acd70ba](https://medium.com/@janek.lewandoski/react-managing-chaos-with-zustand-78b42acd70ba)  
52. REST API endpoints for commits \- GitHub Docs, доступ отримано травня 12, 2026, [https://docs.github.com/en/rest/commits/commits](https://docs.github.com/en/rest/commits/commits)