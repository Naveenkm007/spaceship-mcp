import { describe, it, expect } from "vitest";
import * as z from "zod/v4";
import { ExpectedRecordSchema, expectedToRecord } from "./schemas.js";

describe("ExpectedRecordSchema", () => {
  it("validates a valid A record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "A",
      name: "@",
      address: "1.2.3.4",
      ttl: 300,
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid AAAA record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "AAAA",
      name: "@",
      address: "2001:db8::1",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid CNAME record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "CNAME",
      name: "www",
      cname: "example.com",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid MX record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "MX",
      name: "@",
      exchange: "mail.example.com",
      preference: 10,
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid TXT record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "TXT",
      name: "@",
      value: "v=spf1 -all",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid SRV record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "SRV",
      name: "_sip._tcp",
      service: "_sip",
      protocol: "_tcp",
      priority: 10,
      weight: 60,
      port: 5060,
      target: "sip.example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts TTL up to 86400", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "A",
      name: "@",
      address: "1.2.3.4",
      ttl: 86400,
    });
    expect(result.success).toBe(true);
  });

  it("rejects TTL above 86400", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "A",
      name: "@",
      address: "1.2.3.4",
      ttl: 86401,
    });
    expect(result.success).toBe(false);
  });

  it("rejects TTL below 60", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "A",
      name: "@",
      address: "1.2.3.4",
      ttl: 59,
    });
    expect(result.success).toBe(false);
  });

  it("validates a valid ALIAS record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "ALIAS",
      name: "@",
      aliasName: "example.herokudns.com",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid CAA record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "CAA",
      name: "@",
      flag: 0,
      tag: "issue",
      value: "letsencrypt.org",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid HTTPS record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "HTTPS",
      name: "@",
      svcPriority: 1,
      targetName: "cdn.example.com",
      svcParams: "alpn=h2,h3",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid NS record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "NS",
      name: "sub",
      nameserver: "ns1.example.com",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid PTR record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "PTR",
      name: "4.3.2.1",
      pointer: "host.example.com",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid SVCB record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "SVCB",
      name: "_dns.example.com",
      svcPriority: 1,
      targetName: "dns.example.com",
    });
    expect(result.success).toBe(true);
  });

  it("validates a valid TLSA record", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "TLSA",
      name: "_443._tcp",
      port: "_443",
      protocol: "_tcp",
      usage: 3,
      selector: 1,
      matching: 1,
      associationData: "abcdef0123456789",
    });
    expect(result.success).toBe(true);
  });

  it("rejects CAA record without required flag field", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "CAA",
      name: "@",
      value: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown record type", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "UNKNOWN",
      name: "@",
      value: "test",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = ExpectedRecordSchema.safeParse({
      type: "A",
      name: "",
      address: "1.2.3.4",
    });
    expect(result.success).toBe(false);
  });
});

describe("expectedToRecord", () => {
  it("converts A record", () => {
    const input = ExpectedRecordSchema.parse({ type: "A", name: "@", address: "1.2.3.4", ttl: 300 });
    expect(expectedToRecord(input)).toEqual({ type: "A", name: "@", address: "1.2.3.4", ttl: 300 });
  });

  it("converts AAAA record", () => {
    const input = ExpectedRecordSchema.parse({ type: "AAAA", name: "@", address: "2001:db8::1" });
    expect(expectedToRecord(input)).toEqual({ type: "AAAA", name: "@", address: "2001:db8::1" });
  });

  it("converts CNAME record", () => {
    const input = ExpectedRecordSchema.parse({ type: "CNAME", name: "www", cname: "example.com" });
    expect(expectedToRecord(input)).toEqual({ type: "CNAME", name: "www", cname: "example.com" });
  });

  it("converts MX record", () => {
    const input = ExpectedRecordSchema.parse({
      type: "MX",
      name: "@",
      exchange: "mail.example.com",
      preference: 10,
      ttl: 3600,
    });
    expect(expectedToRecord(input)).toEqual({
      type: "MX",
      name: "@",
      exchange: "mail.example.com",
      preference: 10,
      ttl: 3600,
    });
  });

  it("converts TXT record", () => {
    const input = ExpectedRecordSchema.parse({ type: "TXT", name: "@", value: "v=spf1 -all" });
    expect(expectedToRecord(input)).toEqual({ type: "TXT", name: "@", value: "v=spf1 -all" });
  });

  it("converts SRV record", () => {
    const input = ExpectedRecordSchema.parse({
      type: "SRV",
      name: "_sip._tcp",
      service: "_sip",
      protocol: "_tcp",
      priority: 10,
      weight: 60,
      port: 5060,
      target: "sip.example.com",
    });
    expect(expectedToRecord(input)).toEqual({
      type: "SRV",
      name: "_sip._tcp",
      service: "_sip",
      protocol: "_tcp",
      priority: 10,
      weight: 60,
      port: 5060,
      target: "sip.example.com",
    });
  });

  it("converts ALIAS record", () => {
    const input = ExpectedRecordSchema.parse({ type: "ALIAS", name: "@", aliasName: "example.herokudns.com" });
    expect(expectedToRecord(input)).toEqual({ type: "ALIAS", name: "@", aliasName: "example.herokudns.com" });
  });

  it("converts CAA record", () => {
    const input = ExpectedRecordSchema.parse({
      type: "CAA",
      name: "@",
      flag: 0,
      tag: "issue",
      value: "letsencrypt.org",
    });
    expect(expectedToRecord(input)).toEqual({
      type: "CAA",
      name: "@",
      flag: 0,
      tag: "issue",
      value: "letsencrypt.org",
    });
  });

  it("converts HTTPS record", () => {
    const input = ExpectedRecordSchema.parse({
      type: "HTTPS",
      name: "@",
      svcPriority: 1,
      targetName: "cdn.example.com",
      svcParams: "alpn=h2",
    });
    expect(expectedToRecord(input)).toEqual({
      type: "HTTPS",
      name: "@",
      svcPriority: 1,
      targetName: "cdn.example.com",
      svcParams: "alpn=h2",
      port: undefined,
      scheme: undefined,
    });
  });

  it("converts NS record", () => {
    const input = ExpectedRecordSchema.parse({ type: "NS", name: "sub", nameserver: "ns1.example.com" });
    expect(expectedToRecord(input)).toEqual({ type: "NS", name: "sub", nameserver: "ns1.example.com" });
  });

  it("converts PTR record", () => {
    const input = ExpectedRecordSchema.parse({ type: "PTR", name: "4.3.2.1", pointer: "host.example.com" });
    expect(expectedToRecord(input)).toEqual({ type: "PTR", name: "4.3.2.1", pointer: "host.example.com" });
  });

  it("converts SVCB record", () => {
    const input = ExpectedRecordSchema.parse({
      type: "SVCB",
      name: "@",
      svcPriority: 0,
      targetName: "svc.example.com",
    });
    expect(expectedToRecord(input)).toEqual({
      type: "SVCB",
      name: "@",
      svcPriority: 0,
      targetName: "svc.example.com",
      svcParams: undefined,
      port: undefined,
      scheme: undefined,
    });
  });

  it("converts TLSA record", () => {
    const input = ExpectedRecordSchema.parse({
      type: "TLSA",
      name: "_443._tcp",
      port: "_443",
      protocol: "_tcp",
      usage: 3,
      selector: 1,
      matching: 1,
      associationData: "abcdef",
    });
    expect(expectedToRecord(input)).toEqual({
      type: "TLSA",
      name: "_443._tcp",
      port: "_443",
      protocol: "_tcp",
      usage: 3,
      selector: 1,
      matching: 1,
      associationData: "abcdef",
      scheme: undefined,
    });
  });

  it("omits ttl when undefined", () => {
    const input = ExpectedRecordSchema.parse({ type: "A", name: "@", address: "1.2.3.4" });
    const result = expectedToRecord(input);
    expect(result).not.toHaveProperty("ttl");
  });
});
