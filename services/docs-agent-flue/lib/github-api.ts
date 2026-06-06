export interface GHFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  content?: string;   // base64 if type=file, from /contents
  download_url?: string;
}

export interface GHCommitResult {
  sha: string;
  content: GHFile;
}

export class GitHubAPI {
  private headers: Record<string, string>;

  constructor(private token: string, private repo: string, private branch: string = 'main') {
    this.headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'docs-agent-flue'
    };
    if (token) {
      this.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  private async request(path: string, options: RequestInit = {}): Promise<any> {
    const url = `https://api.github.com/repos/${this.repo}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`GitHub API Error: ${res.status} ${res.statusText} on ${url}. Details: ${errText}`);
    }

    if (res.status === 204) {
      return null;
    }

    return res.json();
  }

  // List directory contents
  async listDir(path: string): Promise<GHFile[]> {
    const cleanPath = path.replace(/^\//, '');
    const data = await this.request(`/contents/${cleanPath}?ref=${this.branch}`);
    if (Array.isArray(data)) {
      return data as GHFile[];
    }
    // If it's a file, wrap it in array
    return [data as GHFile];
  }

  // Get file content (decodes base64)
  async getFile(path: string): Promise<{ content: string; sha: string }> {
    const cleanPath = path.replace(/^\//, '');
    const data = await this.request(`/contents/${cleanPath}?ref=${this.branch}`);
    if (Array.isArray(data)) {
      throw new Error(`Expected a file, but got a directory at ${path}`);
    }
    const contentBase64 = (data.content || '').replace(/\s/g, '');
    const content = this.decodeBase64(contentBase64);
    return {
      content,
      sha: data.sha
    };
  }

  // Create or update file (returns commit sha)
  // sha required for update, omit for create
  async putFile(path: string, content: string, message: string, sha?: string): Promise<GHCommitResult> {
    const cleanPath = path.replace(/^\//, '');
    const encoded = this.encodeBase64(content);
    const body: any = {
      message,
      content: encoded,
      branch: this.branch
    };
    if (sha) {
      body.sha = sha;
    }

    const data = await this.request(`/contents/${cleanPath}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    return {
      sha: data.commit.sha,
      content: data.content as GHFile
    };
  }

  // Delete file
  async deleteFile(path: string, message: string, sha: string): Promise<void> {
    const cleanPath = path.replace(/^\//, '');
    const body = {
      message,
      sha,
      branch: this.branch
    };

    await this.request(`/contents/${cleanPath}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  }

  // Recursive list of all .md files under a path
  async listAllMd(basePath: string): Promise<GHFile[]> {
    const cleanBasePath = basePath.replace(/^\//, '').replace(/\/$/, '');
    let treeData;
    try {
      treeData = await this.request(`/git/trees/${this.branch}?recursive=1`);
    } catch (e) {
      return [];
    }

    const tree = treeData.tree || [];
    const mdFiles: GHFile[] = [];

    for (const item of tree) {
      if (item.type === 'blob' && item.path.endsWith('.md')) {
        if (!cleanBasePath || item.path.startsWith(cleanBasePath + '/')) {
          const name = item.path.split('/').pop() || '';
          mdFiles.push({
            name,
            path: item.path,
            sha: item.sha,
            size: item.size || 0,
            type: 'file'
          });
        }
      }
    }

    return mdFiles;
  }

  private decodeBase64(b64: string): string {
    const binaryString = atob(b64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  private encodeBase64(str: string): string {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
