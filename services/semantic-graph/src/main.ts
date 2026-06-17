import { GitHubAPI } from './github';
import { collectArticles } from './collect';
import { buildExtractionPrompt, callLLM, parseRelationships } from './extract';
import { enforceLinkBudget } from './budget';
import { renderSemanticBlock, upsertSemanticSection } from './render';

export default async (context: any) => {
  const { req, res, log, error } = context;
  
  const env = process.env as Record<string, string | undefined>;
  const gatewayUrl = env.LLM_GATEWAY_URL || 'https://6a3200cd00182e876067.fra.appwrite.run';
  const gatewayToken = env.LLM_GATEWAY_TOKEN || 'freecc';

  if (req.method === 'GET' && req.path === '/health') {
    return res.json({ status: 'ok', service: 'semantic-graph' });
  }

  try {
    let body: any = {};
    if (req.body) {
      if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        body = req.body;
      }
    }

    const project: string = body.project || '';
    const apply: boolean = body.apply !== false;  // default: true (write files)
    const model: string = body.model || '';

    // Per-request GitHub params override env defaults
    const githubToken = body.github_token || env.GITHUB_TOKEN || '';
    const githubOwner = body.github_owner || '';
    const githubRepoName = body.github_repo || '';
    const githubRepo = githubOwner && githubRepoName
      ? `${githubOwner}/${githubRepoName}`
      : env.GITHUB_REPO || 'maxfraieho/ai-drakon-scaffolder';
    const githubBranch = body.github_branch || env.GITHUB_BRANCH || 'main';
    const docsPath = body.docs_path || env.DOCS_PATH || 'docs';

    log(`Initializing GitHub API for ${githubRepo} (branch: ${githubBranch})...`);
    const gh = new GitHubAPI(githubToken, githubRepo, githubBranch);

    log(`Collecting articles from docs path: ${docsPath}, project: ${project || 'none'}...`);
    const articles = await collectArticles(gh, docsPath, project);
    log(`Collected ${articles.length} articles.`);

    if (articles.length === 0) {
      return res.json({
        success: true,
        message: 'No articles found to process.',
        updated: [],
        dry_run: !apply
      });
    }

    log('Building LLM extraction prompt...');
    const { systemPrompt, userPrompt } = buildExtractionPrompt(articles);
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    log(`Calling LLM Gateway at ${gatewayUrl}...`);
    const llmResponse = await callLLM(messages, gatewayUrl, gatewayToken, model);
    
    log('Parsing relationships...');
    const rawRels = parseRelationships(llmResponse, articles);
    log(`Found ${rawRels.length} raw relationships.`);

    log('Enforcing link budget...');
    const budgetedRels = enforceLinkBudget(rawRels);
    log(`Budgeted to ${budgetedRels.length} relationships.`);

    const updatedSlugs: string[] = [];

    log('Processing articles to render and upsert semantic blocks...');
    for (const article of articles) {
      const outgoingRels = budgetedRels.filter(r => r.source_id === article.slug);
      
      // Render the markdown block
      const newBlock = renderSemanticBlock(outgoingRels, articles);

      const originalContent = article.content || '';
      const [updatedContent, changed] = upsertSemanticSection(originalContent, newBlock);

      if (changed) {
        updatedSlugs.push(article.slug);
        if (apply) {
          if (article.path) {
            log(`Writing updates for ${article.slug} to GitHub path ${article.path}...`);
            await gh.putFile(
              article.path,
              updatedContent,
              `docs: update semantic connections for ${article.slug}`,
              article.sha
            );
          } else {
            error(`Missing path for article ${article.slug}, cannot write back.`);
          }
        } else {
          log(`[Dry Run] Would update ${article.slug}`);
        }
      }
    }

    log(`Successfully processed. Updated ${updatedSlugs.length} articles.`);
    return res.json({
      success: true,
      relationships: budgetedRels,
      updated: updatedSlugs,
      dry_run: !apply
    });

  } catch (err: any) {
    error(`Error in semantic-graph function: ${err.message || err}`);
    return res.json({
      success: false,
      error: err.message || 'Internal Server Error'
    }, 500);
  }
};
