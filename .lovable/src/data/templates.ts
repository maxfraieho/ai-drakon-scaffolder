export interface DrakonTemplate {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  drakonIr: any;
  domainMd: string;
  tags: string[];
}

export const templates: DrakonTemplate[] = [
  {
    id: "kanban",
    title: "Kanban Board Backend",
    description: "CRUD API with state transitions (To Do, In Progress, Done).",
    thumbnail: "/templates/kanban.png",
    tags: ["backend", "api", "crud"],
    drakonIr: {
      id: "kanban-api",
      nodes: [
        { id: "1", type: "branch", text: "Create Task" },
        { id: "2", type: "action", text: "Validate Payload" },
        { id: "3", type: "action", text: "Insert into DB" },
        { id: "4", type: "end", text: "Return 201" }
      ],
      edges: [
        { source: "1", target: "2" },
        { source: "2", target: "3" },
        { source: "3", target: "4" }
      ]
    },
    domainMd: "# Kanban Domain\n\nTask:\n- id: string\n- title: string\n- status: 'TODO' | 'IN_PROGRESS' | 'DONE'\n"
  },
  {
    id: "jwt-auth",
    title: "JWT Auth Flow",
    description: "Complete Login, Refresh, and Logout token logic.",
    thumbnail: "/templates/jwt.png",
    tags: ["security", "auth", "flow"],
    drakonIr: {
      id: "jwt-flow",
      nodes: [
        { id: "1", type: "branch", text: "Login" },
        { id: "2", type: "question", text: "Credentials valid?" },
        { id: "3", type: "action", text: "Generate JWT & Refresh Token" },
        { id: "4", type: "action", text: "Return 401 Unauthorized" },
        { id: "5", type: "end", text: "End" }
      ],
      edges: [
        { source: "1", target: "2" },
        { source: "2", target: "3", label: "Yes" },
        { source: "2", target: "4", label: "No" },
        { source: "3", target: "5" },
        { source: "4", target: "5" }
      ]
    },
    domainMd: "# JWT Auth\n\nUser:\n- id: string\n- email: string\n- passwordHash: string\n"
  },
  {
    id: "stripe-payment",
    title: "Stripe Payment Pipeline",
    description: "Webhook handling for successful and failed payments.",
    thumbnail: "/templates/stripe.png",
    tags: ["payment", "webhook", "integration"],
    drakonIr: {
      id: "stripe-webhook",
      nodes: [
        { id: "1", type: "branch", text: "Webhook Received" },
        { id: "2", type: "question", text: "Event = checkout.session.completed?" },
        { id: "3", type: "action", text: "Fulfill Order" },
        { id: "4", type: "action", text: "Ignore" },
        { id: "5", type: "end", text: "End" }
      ],
      edges: [
        { source: "1", target: "2" },
        { source: "2", target: "3", label: "Yes" },
        { source: "2", target: "4", label: "No" },
        { source: "3", target: "5" },
        { source: "4", target: "5" }
      ]
    },
    domainMd: "# Stripe Webhook\n\nOrder:\n- id: string\n- status: 'PENDING' | 'PAID'\n"
  },
  {
    id: "rag-chatbot",
    title: "RAG Chatbot",
    description: "Vector search and LLM context generation workflow.",
    thumbnail: "/templates/rag.png",
    tags: ["ai", "llm", "vector-search"],
    drakonIr: {
      id: "rag-flow",
      nodes: [
        { id: "1", type: "branch", text: "User Query" },
        { id: "2", type: "action", text: "Create Embedding" },
        { id: "3", type: "action", text: "Search Vector DB" },
        { id: "4", type: "action", text: "Generate LLM Response" },
        { id: "5", type: "end", text: "Return text" }
      ],
      edges: [
        { source: "1", target: "2" },
        { source: "2", target: "3" },
        { source: "3", target: "4" },
        { source: "4", target: "5" }
      ]
    },
    domainMd: "# RAG System\n\nQuery:\n- text: string\n- history: Message[]\n"
  },
  {
    id: "data-etl",
    title: "Data ETL Pipeline",
    description: "Extract, Transform, and Load process with error handling.",
    thumbnail: "/templates/etl.png",
    tags: ["data", "etl", "pipeline"],
    drakonIr: {
      id: "etl-pipeline",
      nodes: [
        { id: "1", type: "branch", text: "Start ETL" },
        { id: "2", type: "action", text: "Extract from Source" },
        { id: "3", type: "question", text: "Data valid?" },
        { id: "4", type: "action", text: "Transform Data" },
        { id: "5", type: "action", text: "Log Error" },
        { id: "6", type: "action", text: "Load to Warehouse" },
        { id: "7", type: "end", text: "End" }
      ],
      edges: [
        { source: "1", target: "2" },
        { source: "2", target: "3" },
        { source: "3", target: "4", label: "Yes" },
        { source: "3", target: "5", label: "No" },
        { source: "4", target: "6" },
        { source: "6", target: "7" },
        { source: "5", target: "7" }
      ]
    },
    domainMd: "# ETL Pipeline\n\nRecord:\n- id: string\n- rawData: any\n- processedData: any\n"
  }
];
