import { GitHubAPI } from "./github";
import { collectArticles } from "./collect";
import { buildExtractionPrompt, callLLM, parseRelationships } from "./extract";
import { enforceLinkBudget } from "./budget";
import { renderSemanticBlock, upsertSemanticSection } from "./render";

const handler = async (context: any) => {
  const { req, res, log, error } = context;

  const env = process.env as Record<string, string | undefined>;
  // Use NVIDIA NIM directly if key is set (bypasses the gateway function)
  const nimKey = env.NIM_API_KEY;
  const gatewayUrl = nimKey
    ? "https://integrate.api.nvidia.com"
    : (env.LLM_GATEWAY_URL || "https://6a3200cd0006b155c099.fra.appwrite.run");
  const gatewayToken = nimKey || env.LLM_GATEWAY_TOKEN || "freecc";

  if (req.method === "GET" && req.path === "/health") {
    return res.json({ status: "ok", service: "semantic-graph" });
  }

  try {
    let body: any = {};
    if (req.body) {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    const project: string = body.project || "";
    const apply: boolean = body.apply !== false;
    const model: string = body.model || (nimKey ? "nvidia/llama-3.3-nemotron-super-49b-v1" : "auto");

    const githubToken = body.github_token || env.GITHUB_TOKEN || "";
    const githubOwner = body.github_owner || "";
    const githubRepoName = body.github_repo || "";
    const githubRepo =
      githubOwner && githubRepoName
        ? `${githubOwner}/${githubRepoName}`
        : env.GITHUB_REPO || "maxfraieho/ai-drakon-scaffolder";
    const githubBranch = body.github_branch || env.GITHUB_BRANCH || "main";
    const docsPath = body.docs_path || env.DOCS_PATH || "docs";

    log(`Initializing GitHub API for ${githubRepo} (branch: ${githubBranch})...`);
    const gh = new GitHubAPI(githubToken, githubRepo, githubBranch);

    log(`Collecting articles from docs path: ${docsPath}, project: ${project || "none"}...`);
    const articles = await collectArticles(gh, docsPath, project);
    log(`Collected ${articles.length} articles.`);

    if (articles.length === 0) {
      return res.json({
        success: true,
        proposed: [],
        stats: { notes: 0, links: 0 },
        git_status: "no articles",
      });
    }

    log("Building LLM extraction prompt...");
    const { systemPrompt, userPrompt } = buildExtractionPrompt(articles);
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    log(`Calling LLM Gateway at ${gatewayUrl}...`);
    const llmResponse = await callLLM(messages, gatewayUrl, gatewayToken, model);

    log("Parsing relationships...");
    const rawRels = parseRelationships(llmResponse, articles);
    log(`Found ${rawRels.length} raw relationships.`);

    log("Enforcing link budget...");
    const budgetedRels = enforceLinkBudget(rawRels);
    log(`Budgeted to ${budgetedRels.length} relationships.`);

    const proposed: Array<{ slug: string; links: number }> = [];
    const updatedSlugs: string[] = [];

    log("Processing articles...");
    for (const article of articles) {
      const outgoingRels = budgetedRels.filter((r: any) => r.source_id === article.slug);
      const newBlock = renderSemanticBlock(outgoingRels, articles);
      const originalContent = article.content || "";
      const [updatedContent, changed] = upsertSemanticSection(originalContent, newBlock);

      if (changed) {
        proposed.push({ slug: article.slug, links: outgoingRels.length });
        updatedSlugs.push(article.slug);
        if (apply && article.path) {
          log(`Writing ${article.slug} to GitHub...`);
          await gh.putFile(
            article.path,
            updatedContent,
            `docs: update semantic connections for ${article.slug}`,
            article.sha
          );
        }
      }
    }

    log(`Done. Changed: ${proposed.length}, applied: ${apply ? updatedSlugs.length : 0}`);
    return res.json({
      success: true,
      proposed: [],
      stats: { notes: articles.length, links: budgetedRels.length, changed: proposed.length },
      git_status: apply ? `Updated ${updatedSlugs.length} files` : "dry-run",
    });
  } catch (err: any) {
    error(`Error in semantic-graph function: ${err.message || err}`);
    return res.json({ success: false, error: err.message || "Internal Server Error" }, 500);
  }
};

export default handler;
module.exports = handler;
