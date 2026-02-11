import type { DnsRecord } from "./types.js";

export const normalizeDomain = (input: string): string =>
  input.trim().replace(/\.$/, "").toLowerCase();

export const normalizeName = (input: string): string =>
  input.trim().replace(/\.$/, "").toLowerCase();

export const normalizeHost = (input: string): string =>
  input.trim().replace(/\.$/, "").toLowerCase();

export const recordComparableValue = (record: DnsRecord): string => {
  const type = record.type.toUpperCase();

  switch (type) {
    case "A":
    case "AAAA":
      return String(record.address ?? "").trim();
    case "CNAME":
      return normalizeHost(String(record.cname ?? ""));
    case "MX":
      return `${Number(record.preference ?? -1)}:${normalizeHost(String(record.exchange ?? ""))}`;
    case "TXT":
      return String(record.value ?? "");
    case "SRV":
      return [
        String(record.service ?? ""),
        String(record.protocol ?? ""),
        String(record.priority ?? ""),
        String(record.weight ?? ""),
        String(record.port ?? ""),
        normalizeHost(String(record.target ?? "")),
      ].join(":");
    default:
      return "";
  }
};

export const recordFingerprint = (record: DnsRecord, includeTtl: boolean): string => {
  const type = record.type.toUpperCase();
  const name = normalizeName(record.name);
  const value = recordComparableValue(record);
  const ttl = includeTtl ? String(record.ttl ?? "") : "";
  return `${type}|${name}|${value}|${ttl}`;
};

export const extractComparableFields = (record: DnsRecord): Record<string, unknown> => {
  const type = record.type.toUpperCase();
  const common = { type, name: record.name, ttl: record.ttl };

  switch (type) {
    case "A":
    case "AAAA":
      return { ...common, address: record.address };
    case "CNAME":
      return { ...common, cname: record.cname };
    case "MX":
      return { ...common, exchange: record.exchange, preference: record.preference };
    case "TXT":
      return { ...common, value: record.value };
    case "SRV":
      return {
        ...common,
        service: record.service,
        protocol: record.protocol,
        priority: record.priority,
        weight: record.weight,
        port: record.port,
        target: record.target,
      };
    default:
      return { ...common };
  }
};

export const summarizeByType = (records: DnsRecord[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const record of records) {
    const key = record.type.toUpperCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

const KnownVercelIpv4 = new Set(["76.76.21.21"]);

export const isLikelyVercelRecord = (record: DnsRecord): boolean => {
  const type = record.type.toUpperCase();

  if (type === "A" && typeof record.address === "string") {
    if (KnownVercelIpv4.has(record.address)) return true;
    if (record.address.startsWith("216.198.79.")) return true;
  }

  const hostFields = [record.cname, record.exchange, record.target, record.value]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();

  return hostFields.includes("vercel");
};
