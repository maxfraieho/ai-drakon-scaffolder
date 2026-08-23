import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listTeams, createPersonalTeam, resolveOrCreateTeam, persistTeamIdOnProfile } from '../appwrite-teams';

const config = { endpoint: 'https://auth.aidrakon.test', projectId: 'test-project' };

function mockFetchSequence(responses: Array<{ ok: boolean; json?: unknown }>) {
  let call = 0;
  return vi.fn(async () => {
    const r = responses[Math.min(call, responses.length - 1)];
    call++;
    return {
      ok: r.ok,
      json: async () => r.json,
    } as Response;
  });
}

describe('listTeams', () => {
  it('returns the teams array on success', async () => {
    globalThis.fetch = mockFetchSequence([{ ok: true, json: { teams: [{ $id: 't1', name: 'personal-u1' }] } }]);
    const teams = await listTeams(config, 'jwt');
    expect(teams).toEqual([{ $id: 't1', name: 'personal-u1' }]);
  });

  it('returns empty array on a failed request rather than throwing', async () => {
    globalThis.fetch = mockFetchSequence([{ ok: false }]);
    const teams = await listTeams(config, 'jwt');
    expect(teams).toEqual([]);
  });
});

describe('resolveOrCreateTeam', () => {
  it('returns the existing team when the caller already has one -- does not call create', async () => {
    const fetchSpy = mockFetchSequence([{ ok: true, json: { teams: [{ $id: 'existing-team', name: 'personal-u1' }] } }]);
    globalThis.fetch = fetchSpy;
    const team = await resolveOrCreateTeam(config, 'jwt', 'u1');
    expect(team.$id).toBe('existing-team');
    // Only the list call should have happened -- one fetch, not more.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('auto-provisions a team on first use: empty list -> create -> persist on profile', async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      call++;
      if (call === 1) return { ok: true, json: async () => ({ teams: [] }) } as Response; // listTeams
      if (call === 2) return { ok: true, json: async () => ({ $id: 'new-team', name: 'personal-u1' }) } as Response; // createPersonalTeam
      if (call === 3) return { ok: true, json: async () => ({}) } as Response; // persistTeamIdOnProfile
      throw new Error(`unexpected extra fetch call #${call}`);
    });
    const team = await resolveOrCreateTeam(config, 'jwt', 'u1');
    expect(team.$id).toBe('new-team');
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('race: create fails (another concurrent request won it), re-list finds the winner\'s team', async () => {
    let call = 0;
    globalThis.fetch = vi.fn(async () => {
      call++;
      if (call === 1) return { ok: true, json: async () => ({ teams: [] }) } as Response; // listTeams: empty
      if (call === 2) return { ok: false } as Response; // createPersonalTeam: fails (lost the race)
      if (call === 3) return { ok: true, json: async () => ({ teams: [{ $id: 'winner-team', name: 'personal-u1' }] }) } as Response; // re-list: finds it
      throw new Error(`unexpected extra fetch call #${call}`);
    });
    const team = await resolveOrCreateTeam(config, 'jwt', 'u1');
    expect(team.$id).toBe('winner-team');
  });

  it('throws when list is empty, create fails, AND the retry list is still empty (a real failure, not a race)', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ teams: [] }) } as Response));
    await expect(resolveOrCreateTeam(config, 'jwt', 'u1')).rejects.toThrow(/no team found/);
  });
});

describe('persistTeamIdOnProfile', () => {
  it('PATCHes the user_profiles document keyed by userId', async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => ({}) } as Response));
    globalThis.fetch = fetchSpy;
    const ok = await persistTeamIdOnProfile(config, 'jwt', 'u1', 'team-1');
    expect(ok).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain('/v1/databases/ai-drakon/collections/user_profiles/documents/u1');
    expect(init?.method).toBe('PATCH');
  });
});
