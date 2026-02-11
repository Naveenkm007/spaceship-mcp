import * as z from "zod/v4";
import type { DnsRecord } from "./types.js";

export const WebRecordTypeSchema = z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "SRV"]);

export const ExpectedRecordSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("A"),
    name: z.string().min(1).max(255),
    address: z.string().min(7).max(45),
    ttl: z.number().int().min(60).max(3600).optional(),
  }),
  z.object({
    type: z.literal("AAAA"),
    name: z.string().min(1).max(255),
    address: z.string().min(2).max(45),
    ttl: z.number().int().min(60).max(3600).optional(),
  }),
  z.object({
    type: z.literal("CNAME"),
    name: z.string().min(1).max(255),
    cname: z.string().min(1).max(255),
    ttl: z.number().int().min(60).max(3600).optional(),
  }),
  z.object({
    type: z.literal("MX"),
    name: z.string().min(1).max(255),
    exchange: z.string().min(1).max(255),
    preference: z.number().int().min(0).max(65535),
    ttl: z.number().int().min(60).max(3600).optional(),
  }),
  z.object({
    type: z.literal("TXT"),
    name: z.string().min(1).max(255),
    value: z.string().min(1).max(65535),
    ttl: z.number().int().min(60).max(3600).optional(),
  }),
  z.object({
    type: z.literal("SRV"),
    name: z.string().min(1).max(255),
    service: z.string().min(2).max(63),
    protocol: z.string().min(2).max(63),
    priority: z.number().int().min(0).max(65535),
    weight: z.number().int().min(0).max(65535),
    port: z.number().int().min(1).max(65535),
    target: z.string().min(1).max(255),
    ttl: z.number().int().min(60).max(3600).optional(),
  }),
]);

export const expectedToRecord = (expected: z.infer<typeof ExpectedRecordSchema>): DnsRecord => {
  const withOptionalTtl = <T extends object>(record: T, ttl?: number): T & { ttl?: number } =>
    ttl === undefined ? record : { ...record, ttl };

  switch (expected.type) {
    case "A":
    case "AAAA":
      return withOptionalTtl(
        { type: expected.type, name: expected.name, address: expected.address },
        expected.ttl,
      );
    case "CNAME":
      return withOptionalTtl(
        { type: "CNAME", name: expected.name, cname: expected.cname },
        expected.ttl,
      );
    case "MX":
      return withOptionalTtl(
        { type: "MX", name: expected.name, exchange: expected.exchange, preference: expected.preference },
        expected.ttl,
      );
    case "TXT":
      return withOptionalTtl(
        { type: "TXT", name: expected.name, value: expected.value },
        expected.ttl,
      );
    case "SRV":
      return withOptionalTtl(
        {
          type: "SRV",
          name: expected.name,
          service: expected.service,
          protocol: expected.protocol,
          priority: expected.priority,
          weight: expected.weight,
          port: expected.port,
          target: expected.target,
        },
        expected.ttl,
      );
    default:
      return expected satisfies never;
  }
};
