export class ArchitectJobStore {
  constructor(private state: any, private env: any) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/create') {
      const jobId = crypto.randomUUID();
      const job = {
        job_id: jobId,
        status: 'pending',
        result: {},
        error: ''
      };
      await this.state.storage.put(jobId, job);
      return new Response(JSON.stringify({ job_id: jobId }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    if (path.startsWith('/get/')) {
      const jobId = path.split('/')[2];
      const job = await this.state.storage.get(jobId);
      if (!job) {
        return new Response(JSON.stringify({ error: 'Job not found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' }
        });
      }
      return new Response(JSON.stringify(job), {
        headers: { 'content-type': 'application/json' }
      });
    }

    if (path.startsWith('/update/')) {
      const jobId = path.split('/')[2];
      const body: any = await request.json();
      const job: any = await this.state.storage.get(jobId) || { job_id: jobId };
      
      if (body.status) job.status = body.status;
      if (body.result !== undefined) job.result = body.result;
      if (body.error !== undefined) job.error = body.error;

      await this.state.storage.put(jobId, job);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
}

// Client helper functions to wrap the Durable Object calls
export async function createJobDO(env: any): Promise<string> {
  const id = env.JOB_STORE.idFromName('global');
  const store = env.JOB_STORE.get(id);
  const res = await store.fetch('http://durable/create', { method: 'POST' });
  const data: any = await res.json();
  return data.job_id;
}

export async function getJobDO(env: any, jobId: string): Promise<any> {
  const id = env.JOB_STORE.idFromName('global');
  const store = env.JOB_STORE.get(id);
  const res = await store.fetch(`http://durable/get/${jobId}`);
  if (!res.ok) return null;
  return await res.json();
}

export async function updateJobDO(env: any, jobId: string, status: string, result?: any, error?: string): Promise<void> {
  const id = env.JOB_STORE.idFromName('global');
  const store = env.JOB_STORE.get(id);
  await store.fetch(`http://durable/update/${jobId}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status, result, error })
  });
}
