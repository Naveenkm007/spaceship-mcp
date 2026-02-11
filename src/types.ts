export interface DnsRecord {
  type: string;
  name: string;
  ttl?: number;
  group?: string;
  address?: string;
  cname?: string;
  exchange?: string;
  preference?: number;
  value?: string;
  service?: string;
  protocol?: string;
  priority?: number;
  weight?: number;
  port?: number;
  target?: string;
  [key: string]: unknown;
}

export interface DnsRecordToDelete {
  name: string;
  type: string;
}

export interface ListDnsRecordsResponse {
  items: DnsRecord[];
  total: number;
}

export type OrderBy = "type" | "-type" | "name" | "-name";

export interface Domain {
  name: string;
  unicode?: string;
  isPremium?: boolean;
  registrationDate?: string;
  expirationDate?: string;
  autoRenew?: boolean;
  privacyLevel?: string;
  status?: string;
  nameservers?: string[];
  [key: string]: unknown;
}

export interface ListDomainsResponse {
  items: Domain[];
  total: number;
}

export interface DomainAvailability {
  domain: string;
  available: boolean;
  price?: {
    register?: number;
    renew?: number;
    currency?: string;
  };
  [key: string]: unknown;
}
