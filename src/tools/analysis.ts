import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SpaceshipClient } from "../spaceship-client.js";
import type { DnsRecord } from "../types.js";
import {
  normalizeDomain,
  normalizeName,
  normalizeHost,
  recordFingerprint,
  extractComparableFields,
  summarizeByType,
  isLikelyVercelRecord,
} from "../dns-utils.js";
import { WebRecordTypeSchema, ExpectedRecordSchema, expectedToRecord } from "../schemas.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerAnalysisTools = (server: McpServer, client: SpaceshipClient): void => {
  server.registerTool(
    "check_dns_alignment",
    {
      title: "Check DNS Alignment",
      description:
        "Compare expected DNS records to current Spaceship records. Returns missing and unexpected records.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: z.object({
        domain: z.string().min(4).max(255),
        expectedRecords: z.array(ExpectedRecordSchema).min(1),
        includeTtlInMatch: z.boolean().default(false),
        includeUnexpectedOfTypes: z
          .array(WebRecordTypeSchema)
          .default(["A", "AAAA", "CNAME", "MX", "TXT", "SRV"]),
      }),
    },
    async ({ domain, expectedRecords, includeTtlInMatch, includeUnexpectedOfTypes }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        const actual = await client.listAllDnsRecords(normalizedDomain);
        const actualFiltered = actual.filter((record) =>
          includeUnexpectedOfTypes.includes(
            record.type.toUpperCase() as z.infer<typeof WebRecordTypeSchema>,
          ),
        );

        const expectedAsRecords = expectedRecords.map(expectedToRecord);
        const actualByFingerprint = new Map<string, DnsRecord[]>();

        for (const record of actualFiltered) {
          const key = recordFingerprint(record, includeTtlInMatch);
          const records = actualByFingerprint.get(key) ?? [];
          records.push(record);
          actualByFingerprint.set(key, records);
        }

        const missing: DnsRecord[] = [];
        const matchedFingerprints = new Set<string>();

        for (const expected of expectedAsRecords) {
          const key = recordFingerprint(expected, includeTtlInMatch);
          if ((actualByFingerprint.get(key)?.length ?? 0) > 0) {
            matchedFingerprints.add(key);
          } else {
            missing.push(expected);
          }
        }

        const unexpected = actualFiltered.filter(
          (record) => !matchedFingerprints.has(recordFingerprint(record, includeTtlInMatch)),
        );

        return toTextResult(
          [
            `Domain: ${normalizedDomain}`,
            `Expected records: ${expectedAsRecords.length}`,
            `Missing: ${missing.length}`,
            `Unexpected (${includeUnexpectedOfTypes.join(",")} only): ${unexpected.length}`,
          ].join("\n"),
          {
            domain: normalizedDomain,
            includeTtlInMatch,
            missing: missing.map(extractComparableFields),
            unexpected: unexpected.map(extractComparableFields),
          },
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "analyze_fly_cutover",
    {
      title: "Analyze Fly Cutover",
      description:
        "Analyze current web DNS records for root/www and propose upserts/deletes for a Vercel -> Fly cutover. Read-only, does not modify DNS.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: z.object({
        domain: z.string().min(4).max(255),
        flyApexA: z.string().optional().describe("Fly IPv4 for root @ record"),
        flyApexAAAA: z.string().optional().describe("Fly IPv6 for root @ record"),
        flyWwwCname: z.string().optional().describe("Fly CNAME target for www"),
      }),
    },
    async ({ domain, flyApexA, flyApexAAAA, flyWwwCname }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        const actual = await client.listAllDnsRecords(normalizedDomain);

        const webTypes = new Set(["A", "AAAA", "CNAME", "ALIAS"]);
        const webRecords = actual.filter(
          (record) =>
            webTypes.has(record.type.toUpperCase()) &&
            ["@", "www"].includes(normalizeName(record.name)),
        );

        const desired: DnsRecord[] = [];
        if (flyApexA) desired.push({ type: "A", name: "@", address: flyApexA.trim() });
        if (flyApexAAAA) desired.push({ type: "AAAA", name: "@", address: flyApexAAAA.trim() });
        if (flyWwwCname) desired.push({ type: "CNAME", name: "www", cname: normalizeHost(flyWwwCname) });

        const desiredFingerprints = new Set(desired.map((r) => recordFingerprint(r, false)));
        const actualFingerprints = new Set(webRecords.map((r) => recordFingerprint(r, false)));

        const upserts = desired.filter((r) => !actualFingerprints.has(recordFingerprint(r, false)));
        const deletes = webRecords.filter((r) => !desiredFingerprints.has(recordFingerprint(r, false)));
        const likelyVercel = webRecords.some(isLikelyVercelRecord);

        return toTextResult(
          [
            `Domain: ${normalizedDomain}`,
            `Current root/www web records: ${webRecords.length}`,
            `Likely Vercel-managed: ${likelyVercel ? "yes" : "no"}`,
            `Proposed upserts: ${upserts.length}`,
            `Proposed deletes: ${deletes.length}`,
            "Note: this tool is read-only and does not modify DNS.",
          ].join("\n"),
          {
            domain: normalizedDomain,
            likelyVercel,
            currentWebRecords: webRecords.map(extractComparableFields),
            proposedUpserts: upserts.map(extractComparableFields),
            proposedDeletes: deletes.map(extractComparableFields),
            preservedNonWebRecordCounts: summarizeByType(
              actual.filter(
                (record) =>
                  !(
                    webTypes.has(record.type.toUpperCase()) &&
                    ["@", "www"].includes(normalizeName(record.name))
                  ),
              ),
            ),
          },
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
