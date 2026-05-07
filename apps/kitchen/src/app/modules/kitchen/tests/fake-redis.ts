type SortedMember = {
  score: number;
  member: string;
};

export class FakeRedis {
  readonly strings = new Map<string, string>();
  readonly hashes = new Map<string, Record<string, string>>();
  readonly sets = new Map<string, Set<string>>();
  readonly sortedSets = new Map<string, SortedMember[]>();
  readonly lists = new Map<string, string[]>();
  readonly published: Array<{ channel: string; payload: string }> = [];
  readonly expirations = new Map<string, number>();

  async set(key: string, value: string, ...args: unknown[]): Promise<'OK' | null> {
    if (args.includes('NX') && this.strings.has(key)) {
      return null;
    }
    this.strings.set(key, value);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.strings.delete(key)) removed += 1;
      if (this.hashes.delete(key)) removed += 1;
      if (this.sets.delete(key)) removed += 1;
      if (this.sortedSets.delete(key)) removed += 1;
      if (this.lists.delete(key)) removed += 1;
    }
    return removed;
  }

  async exists(...keys: string[]): Promise<number> {
    let n = 0;
    for (const key of keys) {
      if (
        this.strings.has(key) ||
        this.hashes.has(key) ||
        this.sets.has(key) ||
        this.sortedSets.has(key) ||
        this.lists.has(key)
      ) {
        n += 1;
      }
    }
    return n;
  }

  async get(key: string): Promise<string | null> {
    return this.strings.get(key) ?? null;
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.strings.get(key) || 0) + 1;
    this.strings.set(key, String(next));
    return next;
  }

  async hset(key: string, value: Record<string, string | number>): Promise<number> {
    const hash = this.hashes.get(key) || {};
    for (const [field, fieldValue] of Object.entries(value)) {
      hash[field] = String(fieldValue);
    }
    this.hashes.set(key, hash);
    return Object.keys(value).length;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return { ...(this.hashes.get(key) || {}) };
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key) || new Set<string>();
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        added += 1;
      }
      set.add(member);
    }
    this.sets.set(key, set);
    return added;
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    const set = this.sets.get(key);
    if (!set) {
      return 0;
    }
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed += 1;
      }
    }
    return removed;
  }

  async smembers(key: string): Promise<string[]> {
    return [...(this.sets.get(key) || new Set<string>())];
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    const zset = (this.sortedSets.get(key) || []).filter((entry) => entry.member !== member);
    zset.push({ score: Number(score), member });
    zset.sort((a, b) => a.score - b.score || a.member.localeCompare(b.member));
    this.sortedSets.set(key, zset);
    return 1;
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    const zset = this.sortedSets.get(key) || [];
    const next = zset.filter((entry) => !members.includes(entry.member));
    this.sortedSets.set(key, next);
    return zset.length - next.length;
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    const zset = this.sortedSets.get(key) || [];
    const end = stop === -1 ? undefined : stop + 1;
    return zset.slice(start, end).map((entry) => entry.member);
  }

  async zrangebyscore(
    key: string,
    min: number | string,
    max: number | string,
    _limit: 'LIMIT',
    offset: number,
    count: number,
  ): Promise<string[]> {
    const minScore = min === '-inf' ? Number.NEGATIVE_INFINITY : Number(min);
    const maxScore = max === '+inf' ? Number.POSITIVE_INFINITY : Number(max);
    return (this.sortedSets.get(key) || [])
      .filter((entry) => entry.score >= minScore && entry.score <= maxScore)
      .slice(offset, offset + count)
      .map((entry) => entry.member);
  }

  async rpush(key: string, value: string): Promise<number> {
    const list = this.lists.get(key) || [];
    list.push(value);
    this.lists.set(key, list);
    return list.length;
  }

  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    const list = this.lists.get(key) || [];
    const normalizedStart = start < 0 ? Math.max(list.length + start, 0) : start;
    const normalizedStop = stop < 0 ? list.length + stop : stop;
    this.lists.set(key, list.slice(normalizedStart, normalizedStop + 1));
    return 'OK';
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.expirations.set(key, seconds);
    return 1;
  }

  async publish(channel: string, payload: string): Promise<number> {
    this.published.push({ channel, payload });
    return 1;
  }

  multi(): this {
    return this;
  }

  async exec(): Promise<[]> {
    return [];
  }
}

export function redisService(redis: FakeRedis): { getClient: () => FakeRedis } {
  return { getClient: () => redis };
}
