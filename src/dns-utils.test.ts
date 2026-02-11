import { describe, it, expect } from "vitest";
import {
  normalizeDomain,
  normalizeName,
  normalizeHost,
  recordFingerprint,
  recordComparableValue,
  extractComparableFields,
  summarizeByType,
  isLikelyVercelRecord,
} from "./dns-utils.js";
import type { DnsRecord } from "./types.js";

describe("normalizeDomain", () => {
  it("lowercases and trims", () => {
    expect(normalizeDomain("  Example.COM  ")).toBe("example.com");
  });

  it("strips trailing dot", () => {
    expect(normalizeDomain("example.com.")).toBe("example.com");
  });
});

describe("normalizeName", () => {
  it("lowercases and strips trailing dot", () => {
    expect(normalizeName("WWW.")).toBe("www");
  });
});

describe("normalizeHost", () => {
  it("lowercases and strips trailing dot", () => {
    expect(normalizeHost("Mail.Example.COM.")).toBe("mail.example.com");
  });
});

describe("recordComparableValue", () => {
  it("returns address for A records", () => {
    expect(recordComparableValue({ type: "A", name: "@", address: "1.2.3.4" })).toBe("1.2.3.4");
  });

  it("returns normalized cname for CNAME records", () => {
    expect(recordComparableValue({ type: "CNAME", name: "www", cname: "Example.COM." })).toBe("example.com");
  });

  it("returns preference:exchange for MX records", () => {
    expect(
      recordComparableValue({ type: "MX", name: "@", preference: 10, exchange: "Mail.Example.COM." }),
    ).toBe("10:mail.example.com");
  });

  it("returns value for TXT records", () => {
    expect(recordComparableValue({ type: "TXT", name: "@", value: "v=spf1 -all" })).toBe("v=spf1 -all");
  });

  it("returns composite for SRV records", () => {
    const record: DnsRecord = {
      type: "SRV",
      name: "_sip._tcp",
      service: "_sip",
      protocol: "_tcp",
      priority: 10,
      weight: 60,
      port: 5060,
      target: "sip.example.com.",
    };
    expect(recordComparableValue(record)).toBe("_sip:_tcp:10:60:5060:sip.example.com");
  });

  it("returns composite for ALIAS records", () => {
    expect(recordComparableValue({ type: "ALIAS", name: "@", aliasName: "Example.COM." })).toBe("example.com");
  });

  it("returns composite for CAA records", () => {
    expect(
      recordComparableValue({ type: "CAA", name: "@", flag: 0, tag: "issue", value: "letsencrypt.org" }),
    ).toBe("0:issue:letsencrypt.org");
  });

  it("returns composite for HTTPS records", () => {
    const record: DnsRecord = {
      type: "HTTPS",
      name: "@",
      svcPriority: 1,
      targetName: "cdn.example.com",
      svcParams: "alpn=h2,h3",
    };
    expect(recordComparableValue(record)).toBe("1:cdn.example.com:alpn=h2,h3::");
  });

  it("returns nameserver for NS records", () => {
    expect(recordComparableValue({ type: "NS", name: "sub", nameserver: "ns1.Example.COM." })).toBe("ns1.example.com");
  });

  it("returns pointer for PTR records", () => {
    expect(recordComparableValue({ type: "PTR", name: "4.3.2.1", pointer: "Host.Example.COM." })).toBe("host.example.com");
  });

  it("returns composite for SVCB records", () => {
    const record: DnsRecord = {
      type: "SVCB",
      name: "@",
      svcPriority: 0,
      targetName: "svc.example.com",
    };
    expect(recordComparableValue(record)).toBe("0:svc.example.com:::");
  });

  it("returns composite for TLSA records", () => {
    const record: DnsRecord = {
      type: "TLSA",
      name: "_443._tcp",
      port: "_443",
      protocol: "_tcp",
      usage: 3,
      selector: 1,
      matching: 1,
      associationData: "AB CD EF",
    };
    expect(recordComparableValue(record)).toBe("_443:_tcp:3:1:1:abcdef");
  });

  it("returns empty string for truly unknown types", () => {
    expect(recordComparableValue({ type: "UNKNOWN", name: "@" })).toBe("");
  });

  it("handles A record with missing address", () => {
    expect(recordComparableValue({ type: "A", name: "@" })).toBe("");
  });

  it("handles AAAA record with missing address", () => {
    expect(recordComparableValue({ type: "AAAA", name: "@" })).toBe("");
  });

  it("handles ALIAS with missing aliasName", () => {
    expect(recordComparableValue({ type: "ALIAS", name: "@" })).toBe("");
  });

  it("handles CAA with missing fields", () => {
    expect(recordComparableValue({ type: "CAA", name: "@" })).toBe("0::");
  });

  it("handles CNAME with missing cname", () => {
    expect(recordComparableValue({ type: "CNAME", name: "www" })).toBe("");
  });

  it("handles HTTPS with missing fields", () => {
    expect(recordComparableValue({ type: "HTTPS", name: "@" })).toBe("::::");
  });

  it("handles MX with missing fields", () => {
    expect(recordComparableValue({ type: "MX", name: "@" })).toBe("-1:");
  });

  it("handles NS with missing nameserver", () => {
    expect(recordComparableValue({ type: "NS", name: "sub" })).toBe("");
  });

  it("handles PTR with missing pointer", () => {
    expect(recordComparableValue({ type: "PTR", name: "1" })).toBe("");
  });

  it("handles SRV with missing fields", () => {
    expect(recordComparableValue({ type: "SRV", name: "_sip._tcp" })).toBe(":::::");
  });

  it("handles TLSA with missing fields", () => {
    expect(recordComparableValue({ type: "TLSA", name: "_443._tcp" })).toBe(":::::");
  });

  it("handles TXT with missing value", () => {
    expect(recordComparableValue({ type: "TXT", name: "@" })).toBe("");
  });

  it("handles SVCB with all fields", () => {
    expect(recordComparableValue({
      type: "SVCB", name: "@", svcPriority: 1, targetName: "svc.example.com",
      svcParams: "alpn=h2", port: "_443", scheme: "_https",
    })).toBe("1:svc.example.com:alpn=h2:_443:_https");
  });
});

describe("recordFingerprint", () => {
  it("generates fingerprint without TTL", () => {
    const fp = recordFingerprint({ type: "A", name: "@", address: "1.2.3.4", ttl: 300 }, false);
    expect(fp).toBe("A|@|1.2.3.4|");
  });

  it("includes TTL when requested", () => {
    const fp = recordFingerprint({ type: "A", name: "@", address: "1.2.3.4", ttl: 300 }, true);
    expect(fp).toBe("A|@|1.2.3.4|300");
  });

  it("uses empty string for TTL when includeTtl=true but ttl is undefined", () => {
    const fp = recordFingerprint({ type: "A", name: "@", address: "1.2.3.4" }, true);
    expect(fp).toBe("A|@|1.2.3.4|");
  });

  it("normalizes name case", () => {
    const fp = recordFingerprint({ type: "A", name: "WWW", address: "1.2.3.4" }, false);
    expect(fp).toBe("A|www|1.2.3.4|");
  });
});

describe("extractComparableFields", () => {
  it("extracts A record fields", () => {
    expect(extractComparableFields({ type: "A", name: "@", address: "1.2.3.4", ttl: 300 })).toEqual({
      type: "A",
      name: "@",
      address: "1.2.3.4",
      ttl: 300,
    });
  });

  it("extracts CNAME record fields", () => {
    expect(extractComparableFields({ type: "CNAME", name: "www", cname: "example.com" })).toEqual({
      type: "CNAME",
      name: "www",
      cname: "example.com",
      ttl: undefined,
    });
  });

  it("extracts MX record fields", () => {
    expect(
      extractComparableFields({ type: "MX", name: "@", exchange: "mail.example.com", preference: 10 }),
    ).toEqual({
      type: "MX",
      name: "@",
      exchange: "mail.example.com",
      preference: 10,
      ttl: undefined,
    });
  });

  it("extracts SRV record fields", () => {
    const record: DnsRecord = {
      type: "SRV",
      name: "_sip._tcp",
      service: "_sip",
      protocol: "_tcp",
      priority: 10,
      weight: 60,
      port: 5060,
      target: "sip.example.com",
    };
    expect(extractComparableFields(record)).toEqual({
      type: "SRV",
      name: "_sip._tcp",
      service: "_sip",
      protocol: "_tcp",
      priority: 10,
      weight: 60,
      port: 5060,
      target: "sip.example.com",
      ttl: undefined,
    });
  });

  it("extracts ALIAS record fields", () => {
    expect(extractComparableFields({ type: "ALIAS", name: "@", aliasName: "example.com" })).toEqual({
      type: "ALIAS",
      name: "@",
      aliasName: "example.com",
      ttl: undefined,
    });
  });

  it("extracts CAA record fields", () => {
    expect(
      extractComparableFields({ type: "CAA", name: "@", flag: 0, tag: "issue", value: "letsencrypt.org" }),
    ).toEqual({
      type: "CAA",
      name: "@",
      flag: 0,
      tag: "issue",
      value: "letsencrypt.org",
      ttl: undefined,
    });
  });

  it("extracts HTTPS record fields", () => {
    expect(
      extractComparableFields({
        type: "HTTPS",
        name: "@",
        svcPriority: 1,
        targetName: "cdn.example.com",
        svcParams: "alpn=h2",
        port: "_443",
        scheme: "_https",
        ttl: 3600,
      }),
    ).toEqual({
      type: "HTTPS",
      name: "@",
      svcPriority: 1,
      targetName: "cdn.example.com",
      svcParams: "alpn=h2",
      port: "_443",
      scheme: "_https",
      ttl: 3600,
    });
  });

  it("extracts NS record fields", () => {
    expect(extractComparableFields({ type: "NS", name: "sub", nameserver: "ns1.example.com" })).toEqual({
      type: "NS",
      name: "sub",
      nameserver: "ns1.example.com",
      ttl: undefined,
    });
  });

  it("extracts PTR record fields", () => {
    expect(extractComparableFields({ type: "PTR", name: "4.3.2.1", pointer: "host.example.com" })).toEqual({
      type: "PTR",
      name: "4.3.2.1",
      pointer: "host.example.com",
      ttl: undefined,
    });
  });

  it("extracts TLSA record fields", () => {
    expect(
      extractComparableFields({
        type: "TLSA",
        name: "_443._tcp",
        port: "_443",
        protocol: "_tcp",
        usage: 3,
        selector: 1,
        matching: 1,
        associationData: "abcdef",
        scheme: "_tcp",
      }),
    ).toEqual({
      type: "TLSA",
      name: "_443._tcp",
      port: "_443",
      protocol: "_tcp",
      usage: 3,
      selector: 1,
      matching: 1,
      associationData: "abcdef",
      scheme: "_tcp",
      ttl: undefined,
    });
  });

  it("extracts TXT record fields", () => {
    expect(extractComparableFields({ type: "TXT", name: "@", value: "v=spf1 -all" })).toEqual({
      type: "TXT",
      name: "@",
      value: "v=spf1 -all",
      ttl: undefined,
    });
  });

  it("extracts unknown type with common fields only", () => {
    expect(extractComparableFields({ type: "UNKNOWN", name: "@", value: "test" })).toEqual({
      type: "UNKNOWN",
      name: "@",
      ttl: undefined,
    });
  });
});

describe("summarizeByType", () => {
  it("counts records by type", () => {
    const records: DnsRecord[] = [
      { type: "A", name: "@", address: "1.2.3.4" },
      { type: "A", name: "www", address: "1.2.3.4" },
      { type: "CNAME", name: "blog", cname: "example.com" },
      { type: "mx", name: "@", exchange: "mail.example.com", preference: 10 },
    ];
    expect(summarizeByType(records)).toEqual({ A: 2, CNAME: 1, MX: 1 });
  });

  it("returns empty object for no records", () => {
    expect(summarizeByType([])).toEqual({});
  });
});

describe("isLikelyVercelRecord", () => {
  it("detects known Vercel IPv4", () => {
    expect(isLikelyVercelRecord({ type: "A", name: "@", address: "76.76.21.21" })).toBe(true);
  });

  it("detects Vercel IP range 216.198.79.x", () => {
    expect(isLikelyVercelRecord({ type: "A", name: "@", address: "216.198.79.100" })).toBe(true);
  });

  it("detects Vercel CNAME", () => {
    expect(isLikelyVercelRecord({ type: "CNAME", name: "www", cname: "cname.vercel-dns.com" })).toBe(true);
  });

  it("rejects non-Vercel A record", () => {
    expect(isLikelyVercelRecord({ type: "A", name: "@", address: "1.2.3.4" })).toBe(false);
  });

  it("rejects non-Vercel CNAME", () => {
    expect(isLikelyVercelRecord({ type: "CNAME", name: "www", cname: "example.fly.dev" })).toBe(false);
  });
});
