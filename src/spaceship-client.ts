import type {
  DnsRecord,
  DnsRecordToDelete,
  OrderBy,
  DomainOrderBy,
  ListDnsRecordsResponse,
  Domain,
  ListDomainsResponse,
  DomainAvailability,
  Contact,
  ContactAttribute,
  DomainContacts,
  DomainRegistrationRequest,
  DomainRenewalRequest,
  DomainTransferRequest,
  TransferStatus,
  AsyncOperation,
  PersonalNameserver,
  SellerHubDomain,
  ListSellerHubDomainsResponse,
  SellerHubCheckoutLink,
  SellerHubVerificationRecord,
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

  async listDomains(options: {
    take: number;
    skip: number;
    orderBy?: DomainOrderBy;
  }): Promise<ListDomainsResponse> {
    const query = new URLSearchParams({
      take: String(options.take),
      skip: String(options.skip),
    });

    if (options.orderBy) {
      query.set("orderBy", options.orderBy);
    }

    return this.request<ListDomainsResponse>(`/v1/domains?${query.toString()}`);
  }

  async listAllDomains(orderBy?: DomainOrderBy): Promise<Domain[]> {
    const pageSize = 100;
    const all: Domain[] = [];
    let skip = 0;
    let total = Number.POSITIVE_INFINITY;

    while (skip < total) {
      const response = await this.listDomains({
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

  // --- Domain Lifecycle ---

  async registerDomain(
    domain: string,
    options: DomainRegistrationRequest,
  ): Promise<{ operationId: string }> {
    return this.requestWithAsyncHeader(
      `/v1/domains/${encodeURIComponent(domain)}`,
      {
        method: "POST",
        body: JSON.stringify(options),
      },
    );
  }

  async renewDomain(
    domain: string,
    options: DomainRenewalRequest,
  ): Promise<{ operationId: string }> {
    return this.requestWithAsyncHeader(
      `/v1/domains/${encodeURIComponent(domain)}/renew`,
      {
        method: "POST",
        body: JSON.stringify(options),
      },
    );
  }

  async restoreDomain(domain: string): Promise<{ operationId: string }> {
    return this.requestWithAsyncHeader(
      `/v1/domains/${encodeURIComponent(domain)}/restore`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
  }

  async transferDomain(
    domain: string,
    options: DomainTransferRequest,
  ): Promise<{ operationId: string }> {
    return this.requestWithAsyncHeader(
      `/v1/domains/${encodeURIComponent(domain)}/transfer`,
      {
        method: "POST",
        body: JSON.stringify(options),
      },
    );
  }

  async getTransferStatus(domain: string): Promise<TransferStatus> {
    return this.request<TransferStatus>(
      `/v1/domains/${encodeURIComponent(domain)}/transfer`,
    );
  }

  // --- Privacy ---

  async setPrivacyLevel(domain: string, level: "high" | "public"): Promise<void> {
    await this.request(
      `/v1/domains/${encodeURIComponent(domain)}/privacy/preference`,
      {
        method: "PUT",
        body: JSON.stringify({ privacyLevel: level }),
      },
    );
  }

  async setEmailProtection(domain: string, contactForm: boolean): Promise<void> {
    await this.request(
      `/v1/domains/${encodeURIComponent(domain)}/privacy/email-protection-preference`,
      {
        method: "PUT",
        body: JSON.stringify({ contactForm }),
      },
    );
  }

  // --- Domain Contacts ---

  async updateDomainContacts(domain: string, contacts: DomainContacts): Promise<void> {
    await this.request(
      `/v1/domains/${encodeURIComponent(domain)}/contacts`,
      {
        method: "PUT",
        body: JSON.stringify(contacts),
      },
    );
  }

  // --- Contacts ---

  async saveContact(contact: Contact): Promise<Contact> {
    return this.request<Contact>("/v1/contacts", {
      method: "PUT",
      body: JSON.stringify(contact),
    });
  }

  async getContact(contactId: string): Promise<Contact> {
    return this.request<Contact>(`/v1/contacts/${encodeURIComponent(contactId)}`);
  }

  async saveContactAttributes(attributes: ContactAttribute[]): Promise<void> {
    await this.request("/v1/contacts/attributes", {
      method: "PUT",
      body: JSON.stringify({ attributes }),
    });
  }

  async getContactAttributes(): Promise<ContactAttribute[]> {
    return this.request<ContactAttribute[]>("/v1/contacts/attributes");
  }

  // --- Async Operations ---

  async getAsyncOperation(operationId: string): Promise<AsyncOperation> {
    return this.request<AsyncOperation>(
      `/v1/async-operations/${encodeURIComponent(operationId)}`,
    );
  }

  // --- Personal Nameservers ---

  async listPersonalNameservers(domain: string): Promise<PersonalNameserver[]> {
    return this.request<PersonalNameserver[]>(
      `/v1/domains/${encodeURIComponent(domain)}/personal-nameservers`,
    );
  }

  async updatePersonalNameserver(
    domain: string,
    host: string,
    ips: string[],
  ): Promise<void> {
    await this.request(
      `/v1/domains/${encodeURIComponent(domain)}/personal-nameservers/${encodeURIComponent(host)}`,
      {
        method: "PUT",
        body: JSON.stringify({ ips }),
      },
    );
  }

  async deletePersonalNameserver(domain: string, host: string): Promise<void> {
    await this.request(
      `/v1/domains/${encodeURIComponent(domain)}/personal-nameservers/${encodeURIComponent(host)}`,
      {
        method: "DELETE",
      },
    );
  }

  // --- SellerHub ---

  async listSellerHubDomains(options: {
    take: number;
    skip: number;
  }): Promise<ListSellerHubDomainsResponse> {
    const query = new URLSearchParams({
      take: String(options.take),
      skip: String(options.skip),
    });

    return this.request<ListSellerHubDomainsResponse>(
      `/v1/sellerhub/domains?${query.toString()}`,
    );
  }

  async createSellerHubDomain(data: {
    domain: string;
    price?: number;
    currency?: string;
  }): Promise<SellerHubDomain> {
    return this.request<SellerHubDomain>("/v1/sellerhub/domains", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getSellerHubDomain(id: string): Promise<SellerHubDomain> {
    return this.request<SellerHubDomain>(
      `/v1/sellerhub/domains/${encodeURIComponent(id)}`,
    );
  }

  async updateSellerHubDomain(
    id: string,
    data: { price?: number; currency?: string },
  ): Promise<SellerHubDomain> {
    return this.request<SellerHubDomain>(
      `/v1/sellerhub/domains/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
  }

  async deleteSellerHubDomain(id: string): Promise<void> {
    await this.request(
      `/v1/sellerhub/domains/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  }

  async createCheckoutLink(data: {
    sellerHubDomainId: string;
  }): Promise<SellerHubCheckoutLink> {
    return this.request<SellerHubCheckoutLink>("/v1/sellerhub/checkout-links", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getVerificationRecords(id: string): Promise<SellerHubVerificationRecord[]> {
    return this.request<SellerHubVerificationRecord[]>(
      `/v1/sellerhub/domains/${encodeURIComponent(id)}/verification-records`,
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

      case "ALIAS":
        item.aliasName = record.aliasName ?? record.value;
        break;

      case "CAA":
        item.flag = record.flag;
        item.tag = record.tag;
        item.value = record.value;
        break;

      case "CNAME":
        item.cname = record.cname ?? record.value;
        break;

      case "HTTPS":
      case "SVCB":
        item.svcPriority = record.svcPriority;
        item.targetName = record.targetName;
        if (record.svcParams !== undefined) item.svcParams = record.svcParams;
        if (record.port !== undefined) item.port = record.port;
        if (record.scheme !== undefined) item.scheme = record.scheme;
        break;

      case "A":
      case "AAAA":
        item.address = record.address ?? record.value;
        break;

      case "NS":
        item.nameserver = record.nameserver ?? record.value;
        break;

      case "PTR":
        item.pointer = record.pointer ?? record.value;
        break;

      case "TLSA":
        item.port = record.port;
        item.protocol = record.protocol;
        item.usage = record.usage;
        item.selector = record.selector;
        item.matching = record.matching;
        item.associationData = record.associationData;
        if (record.scheme !== undefined) item.scheme = record.scheme;
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

  private async requestWithAsyncHeader(
    path: string,
    init: RequestInit,
  ): Promise<{ operationId: string }> {
    const headers = new Headers(init.headers);
    headers.set("X-API-Key", this.apiKey);
    headers.set("X-API-Secret", this.apiSecret);
    headers.set("Content-Type", "application/json");

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const operationId = response.headers.get("spaceship-async-operationid") ?? "";

    if (response.status === 204 || response.status === 202) {
      return { operationId };
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

    return { operationId };
  }
}
