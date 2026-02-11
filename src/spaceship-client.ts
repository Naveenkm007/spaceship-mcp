import type {
  DnsRecord,
  DnsRecordToDelete,
  OrderBy,
  ListDnsRecordsResponse,
  Domain,
  ListDomainsResponse,
  DomainAvailability,
} from "./types.js";

export class SpaceshipApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export class SpaceshipClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(apiKey: string, apiSecret: string, baseUrl = "https://spaceship.dev/api") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  // --- DNS Records ---

  async listDnsRecords(
    domain: string,
    options: { take: number; skip: number; orderBy?: OrderBy },
  ): Promise<ListDnsRecordsResponse> {
    const query = new URLSearchParams({
      take: String(options.take),
      skip: String(options.skip),
    });

    if (options.orderBy) {
      query.set("orderBy", options.orderBy);
    }

    const path = `/v1/dns/records/${encodeURIComponent(domain)}?${query.toString()}`;
    return this.request<ListDnsRecordsResponse>(path);
  }

  async listAllDnsRecords(domain: string, orderBy?: OrderBy): Promise<DnsRecord[]> {
    const pageSize = 500;
    const all: DnsRecord[] = [];
    let skip = 0;
    let total = Number.POSITIVE_INFINITY;

    while (skip < total) {
      const response = await this.listDnsRecords(domain, {
        take: pageSize,
        skip,
        ...(orderBy ? { orderBy } : {}),
      });

      all.push(...response.items);
      total = response.total;
      skip += response.items.length;

      if (response.items.length === 0) {
        break;
      }
    }

    return all;
  }

  async saveDnsRecords(domain: string, records: DnsRecord[]): Promise<void> {
    const payload = {
      force: true,
      items: records.map((record) => this.buildRecordPayload(record)),
    };

    await this.request(`/v1/dns/records/${encodeURIComponent(domain)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }

  async deleteDnsRecords(domain: string, records: DnsRecordToDelete[]): Promise<void> {
    await this.request(`/v1/dns/records/${encodeURIComponent(domain)}`, {
      method: "DELETE",
      body: JSON.stringify(records),
    });
  }

  // --- Domains ---

  async listDomains(options: { take: number; skip: number }): Promise<ListDomainsResponse> {
    const query = new URLSearchParams({
      take: String(options.take),
      skip: String(options.skip),
    });

    return this.request<ListDomainsResponse>(`/v1/domains?${query.toString()}`);
  }

  async listAllDomains(): Promise<Domain[]> {
    const pageSize = 100;
    const all: Domain[] = [];
    let skip = 0;
    let total = Number.POSITIVE_INFINITY;

    while (skip < total) {
      const response = await this.listDomains({ take: pageSize, skip });
      all.push(...response.items);
      total = response.total;
      skip += response.items.length;

      if (response.items.length === 0) {
        break;
      }
    }

    return all;
  }

  async getDomain(domain: string): Promise<Domain> {
    return this.request<Domain>(`/v1/domains/${encodeURIComponent(domain)}`);
  }

  async checkDomainAvailability(domain: string): Promise<DomainAvailability> {
    return this.request<DomainAvailability>(
      `/v1/domains/${encodeURIComponent(domain)}/available`,
    );
  }

  async checkDomainsAvailability(domains: string[]): Promise<DomainAvailability[]> {
    return this.request<DomainAvailability[]>("/v1/domains/available", {
      method: "POST",
      body: JSON.stringify({ domainNames: domains }),
    });
  }

  async updateNameservers(domain: string, nameservers: string[]): Promise<void> {
    await this.request(`/v1/domains/${encodeURIComponent(domain)}/nameservers`, {
      method: "PUT",
      body: JSON.stringify({ items: nameservers }),
    });
  }

  async setAutoRenew(domain: string, enabled: boolean): Promise<void> {
    await this.request(`/v1/domains/${encodeURIComponent(domain)}/autorenew`, {
      method: "PUT",
      body: JSON.stringify({ autoRenew: enabled }),
    });
  }

  async setTransferLock(domain: string, locked: boolean): Promise<void> {
    await this.request(`/v1/domains/${encodeURIComponent(domain)}/transfer/lock`, {
      method: "PUT",
      body: JSON.stringify({ isLocked: locked }),
    });
  }

  async getAuthCode(domain: string): Promise<{ authCode: string }> {
    return this.request<{ authCode: string }>(
      `/v1/domains/${encodeURIComponent(domain)}/transfer/auth-code`,
    );
  }

  // --- Private ---

  private buildRecordPayload(record: DnsRecord): Record<string, unknown> {
    const item: Record<string, unknown> = {
      name: record.name,
      type: record.type,
      ...(record.ttl !== undefined ? { ttl: record.ttl } : {}),
    };

    switch (record.type.toUpperCase()) {
      case "MX":
        if (record.preference !== undefined && record.exchange) {
          item.preference = record.preference;
          item.exchange = record.exchange;
        } else if (record.priority !== undefined && record.exchange) {
          item.preference = record.priority;
          item.exchange = record.exchange;
        } else if (record.value) {
          const parts = record.value.trim().split(/\s+/);
          if (parts.length >= 2) {
            item.preference = parseInt(parts[0], 10);
            item.exchange = parts.slice(1).join(" ");
          } else {
            throw new Error(
              `Invalid MX record format. Expected "priority exchange" but got: ${record.value}`,
            );
          }
        } else {
          throw new Error("MX record must have preference/exchange or value field");
        }
        break;

      case "SRV":
        if (
          record.priority !== undefined &&
          record.weight !== undefined &&
          record.port !== undefined &&
          record.target
        ) {
          item.priority = record.priority;
          item.weight = record.weight;
          item.port = record.port;
          item.target = record.target;

          const nameParts = record.name.split(".");
          if (nameParts.length >= 2 && nameParts[0].startsWith("_") && nameParts[1].startsWith("_")) {
            item.service = record.service ?? nameParts[0];
            item.protocol = record.protocol ?? nameParts[1];
          } else {
            item.service = record.service ?? "";
            item.protocol = record.protocol ?? "";
          }
        } else if (record.value) {
          const parts = record.value.trim().split(/\s+/);
          if (parts.length >= 4) {
            item.priority = parseInt(parts[0], 10);
            item.weight = parseInt(parts[1], 10);
            item.port = parseInt(parts[2], 10);
            item.target = parts[3];

            const nameParts = record.name.split(".");
            if (nameParts.length >= 2 && nameParts[0].startsWith("_") && nameParts[1].startsWith("_")) {
              item.service = nameParts[0];
              item.protocol = nameParts[1];
            } else {
              throw new Error(
                `Invalid SRV record name format. Expected _service._protocol but got: ${record.name}`,
              );
            }
          } else {
            throw new Error(
              `Invalid SRV record format. Expected "priority weight port target" but got: ${record.value}`,
            );
          }
        } else {
          throw new Error("SRV record must have priority/weight/port/target or value field");
        }
        break;

      case "CNAME":
        item.cname = record.cname ?? record.value;
        break;

      case "A":
      case "AAAA":
        item.address = record.address ?? record.value;
        break;

      default:
        item.value = record.value;
        break;
    }

    return item;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("X-API-Key", this.apiKey);
    headers.set("X-API-Secret", this.apiSecret);
    headers.set("Content-Type", "application/json");

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (response.status === 204) {
      return null as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => "");

    if (!response.ok) {
      throw new SpaceshipApiError(
        `Spaceship API request failed: ${response.status} ${response.statusText}`,
        response.status,
        body,
      );
    }

    return body as T;
  }
}
