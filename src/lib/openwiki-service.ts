import { nlmMcp } from "@/server/notebooklm-mcp";

export interface OpenWikiChapter {
  id: string;
  title: string;
  filename: string;
  prompt: string;
}

export const OPENWIKI_CHAPTER_SPECS: OpenWikiChapter[] = [
  {
    id: "overview",
    title: "01. Project Overview",
    filename: "01_project_overview.md",
    prompt: "Сформуй розділ OpenWiki '01. Огляд проекту': опис призначення системи, бізнес-домен, технологічний стек, ключові можливості та архітектурні принципи."
  },
  {
    id: "architecture",
    title: "02. Architecture & Sequence Flows",
    filename: "02_architecture_flows.md",
    prompt: "Сформуй розділ OpenWiki '02. Архітектура та потоки виконання': опис системних меж, діаграми послідовності Mermaid (sequenceDiagram) для запитів, взаємодія фронтенду, Cloudflare Worker та Appwrite."
  },
  {
    id: "api_reference",
    title: "03. API Reference",
    filename: "03_api_reference.md",
    prompt: "Сформуй розділ OpenWiki '03. Довідник API': повний перелік HTTP ендпоінтів (Appwrite Functions, Worker API, TanStack routes), заголовки авторизації, JSON схеми запитів та відповідей, коди помилок."
  },
  {
    id: "data_models",
    title: "04. Data Models & Schemas",
    filename: "04_data_models.md",
    prompt: "Сформуй розділ OpenWiki '04. Моделі даних': схеми Appwrite колекцій, Mermaid ER діаграми (erDiagram), TypeScript інтерфейси та Zustand/React Query типи стану."
  },
  {
    id: "component_catalog",
    title: "05. UI & Component Catalog",
    filename: "05_component_catalog.md",
    prompt: "Сформуй розділ OpenWiki '05. Каталог UI компонентів': опис дизайн-системи Astryx, токени CSS, структури компонентів (WorkspaceShell, Header, SideNav), семантичні селектори."
  },
  {
    id: "deployment",
    title: "06. Deployment & CI/CD",
    filename: "06_deployment_ci_cd.md",
    prompt: "Сформуй розділ OpenWiki '06. Деплой та CI/CD': покрокова інструкція збірки Cloudflare Pages, правило дзеркальної синхронізації .lovable/src, вимоги до Node та Appwrite деплою."
  }
];

export async function generateOpenWikiChapter(
  notebookId: string,
  chapter: OpenWikiChapter
): Promise<{ filename: string; content: string }> {
  const content = await nlmMcp.chat(notebookId, chapter.prompt);
  return {
    filename: chapter.filename,
    content
  };
}
