import type { AiRepoCategory, AiRepoSettings, FallbackAiRepo } from '../config/aiRepos.config';
import { ValidationException } from '../exceptions';
import type { AiRepoDTO, AiRepoListDTO } from '../models/types';
import { logger } from '../utils/logger';

/** The subset of the GitHub search item we read. */
interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner?: { login?: string; avatar_url?: string } | null;
  html_url: string;
  description: string | null;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language: string | null;
  topics?: string[];
  license?: { spdx_id?: string | null; name?: string | null } | null;
  pushed_at: string | null;
  archived?: boolean;
  fork?: boolean;
  private?: boolean;
}

interface TopicEntry {
  repos: GitHubRepo[];
  fetchedAt: number;
}

export type FetchLike = (url: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}>;

class GitHubFetchError extends Error {}

/** After a failed search, don't ask GitHub about that topic again for this long (rate limits reset per minute). */
const RETRY_AFTER_FAILURE_MS = 60_000;

/**
 * Top AI projects on GitHub. Searches each category topic (sorted by stars), caches per topic in memory,
 * merges + de-duplicates and returns the top N. Never fails the request because of GitHub: if a topic
 * can't be fetched it falls back to older cached data, then to the built-in snapshot.
 */
export class AiRepoService {
  private readonly byId: ReadonlyMap<string, AiRepoCategory>;
  private readonly cache = new Map<string, TopicEntry>();
  /** One request per topic at a time (concurrent tab switches share it). */
  private readonly inFlight = new Map<string, Promise<TopicEntry>>();
  /** Last failure per topic, so a rate-limited GitHub isn't hammered on every panel open. */
  private readonly failures = new Map<string, { at: number; error: Error }>();

  constructor(
    private readonly categories: readonly AiRepoCategory[],
    private readonly defaultCategory: string,
    private readonly fallback: readonly FallbackAiRepo[],
    private readonly excludePatterns: readonly RegExp[],
    private readonly settings: AiRepoSettings,
    private readonly fetchImpl: FetchLike = (url, init) => fetch(url, init),
    private readonly now: () => number = Date.now,
  ) {
    this.byId = new Map(categories.map((c) => [c.id, c]));
  }

  async list(categoryId?: string | null): Promise<AiRepoListDTO> {
    const id = categoryId || this.defaultCategory;
    const category = this.byId.get(id);
    if (!category) {
      throw new ValidationException('Request validation failed', [
        { field: 'category', message: `Unknown category "${id}". Expected one of: ${[...this.byId.keys()].join(', ')}` },
      ]);
    }
    const base = { category: category.id, categories: this.categories.map(({ id: cid, name }) => ({ id: cid, name })) };

    const entries: TopicEntry[] = [];
    let source: AiRepoListDTO['source'] = 'cache';
    let notice: string | null = null;

    const results = await Promise.allSettled(category.topics.map((t) => this.topic(t)));
    for (const [i, r] of results.entries()) {
      const topic = category.topics[i]!;
      if (r.status === 'fulfilled') {
        entries.push(r.value.entry);
        if (r.value.fresh && source === 'cache') source = 'live';
        continue;
      }
      const reason = r.reason instanceof Error ? r.reason.message : String(r.reason);
      notice ??= reason;
      const stale = this.cache.get(topic);
      if (!stale) {
        logger.warn('AI repos: GitHub unavailable, using built-in snapshot', { topic, reason });
        return { ...base, source: 'fallback', fetchedAt: null, notice, items: this.fallbackFor(category.id) };
      }
      logger.warn('AI repos: GitHub unavailable, serving stale cache', { topic, reason });
      entries.push(stale);
      source = 'stale';
    }

    const seen = new Set<number>();
    const merged = entries
      .flatMap((e) => e.repos)
      .filter((repo) => {
        if (seen.has(repo.id) || repo.private || repo.fork || repo.archived || this.isExcluded(repo)) return false;
        seen.add(repo.id);
        return true;
      })
      .sort((a, b) => b.stargazers_count - a.stargazers_count || a.full_name.localeCompare(b.full_name))
      .slice(0, this.settings.count);

    return {
      ...base,
      source,
      fetchedAt: new Date(Math.min(...entries.map((e) => e.fetchedAt))).toISOString(),
      notice: source === 'stale' ? notice : null,
      items: merged.map((repo, i) => this.toDto(repo, i + 1)),
    };
  }

  /** Cached topic results, refreshed when older than the TTL. */
  private async topic(topic: string): Promise<{ entry: TopicEntry; fresh: boolean }> {
    const cached = this.cache.get(topic);
    if (cached && this.now() - cached.fetchedAt < this.settings.cacheTtlMs) return { entry: cached, fresh: false };

    const failure = this.failures.get(topic);
    if (failure && this.now() - failure.at < RETRY_AFTER_FAILURE_MS) throw failure.error;

    let pending = this.inFlight.get(topic);
    if (!pending) {
      pending = this.search(topic)
        .then((repos) => {
          const entry = { repos, fetchedAt: this.now() };
          this.cache.set(topic, entry);
          this.failures.delete(topic);
          return entry;
        })
        .catch((e: unknown) => {
          const error = e instanceof Error ? e : new Error(String(e));
          this.failures.set(topic, { at: this.now(), error });
          throw error;
        })
        .finally(() => this.inFlight.delete(topic));
      this.inFlight.set(topic, pending);
    }
    return { entry: await pending, fresh: true };
  }

  private async search(topic: string): Promise<GitHubRepo[]> {
    const q = `topic:${topic} archived:false`;
    const url = `${this.settings.apiUrl}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${this.settings.perTopic}`;
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': this.settings.userAgent,
    };
    if (this.settings.token) headers.Authorization = `Bearer ${this.settings.token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.settings.timeoutMs);
    try {
      const res = await this.fetchImpl(url, { headers, signal: controller.signal });
      if (!res.ok) {
        const limited = res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0');
        throw new GitHubFetchError(
          limited
            ? 'GitHub rate limit reached — try again in a minute (set GITHUB_TOKEN for a higher limit).'
            : `GitHub search failed (HTTP ${res.status}).`,
        );
      }
      const body = (await res.json()) as { items?: unknown };
      if (!Array.isArray(body.items)) throw new GitHubFetchError('Unexpected response from GitHub search.');
      return body.items as GitHubRepo[];
    } catch (e) {
      if (e instanceof GitHubFetchError) throw e;
      if (controller.signal.aborted) throw new GitHubFetchError(`GitHub did not answer within ${this.settings.timeoutMs} ms.`);
      throw new GitHubFetchError(`Could not reach GitHub (${e instanceof Error ? e.message : String(e)}).`);
    } finally {
      clearTimeout(timer);
    }
  }

  private isExcluded(repo: GitHubRepo): boolean {
    return this.excludePatterns.some((p) => p.test(repo.name) || (repo.description ? p.test(repo.description) : false));
  }

  private toDto(repo: GitHubRepo, rank: number): AiRepoDTO {
    const [owner = repo.owner?.login ?? '', name = repo.name] = repo.full_name.split('/');
    const license = repo.license?.spdx_id && repo.license.spdx_id !== 'NOASSERTION' ? repo.license.spdx_id : (repo.license?.name ?? null);
    return {
      rank,
      fullName: repo.full_name,
      owner,
      name,
      ownerAvatarUrl: repo.owner?.avatar_url ?? null,
      description: repo.description,
      url: repo.html_url,
      homepage: repo.homepage && /^https?:\/\//i.test(repo.homepage) ? repo.homepage : null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      language: repo.language,
      topics: (repo.topics ?? []).slice(0, this.settings.maxTopics),
      license,
      pushedAt: repo.pushed_at,
    };
  }

  private fallbackFor(categoryId: string): AiRepoDTO[] {
    return this.fallback
      .filter((r) => r.categories.includes(categoryId))
      .slice(0, this.settings.count)
      .map((r, i) => {
        const [owner = '', name = r.fullName] = r.fullName.split('/');
        return {
          rank: i + 1,
          fullName: r.fullName,
          owner,
          name,
          ownerAvatarUrl: null,
          description: r.description,
          url: `https://github.com/${r.fullName}`,
          homepage: null,
          stars: null,
          forks: null,
          openIssues: null,
          language: r.language,
          topics: [],
          license: null,
          pushedAt: null,
        };
      });
  }
}
