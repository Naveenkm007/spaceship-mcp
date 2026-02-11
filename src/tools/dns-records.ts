import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SpaceshipClient } from "../spaceship-client.js";
import type { DnsRecord } from "../types.js";
import { normalizeDomain, summarizeByType, extractComparableFields } from "../dns-utils.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerDnsRecordTools = (server: McpServer, client: SpaceshipClient): void => {
  server.registerTool(
    "list_dns_records",
    {
      title: "List DNS Records",
      description:
        "List all DNS records for a domain. Uses pagination and can fetch all pages automatically.",
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("Domain name, e.g. example.com"),
        fetchAll: z.boolean().default(true).describe("Fetch all pages (recommended)."),
        take: z
          .number()
          .int()
          .min(1)
          .max(500)
          .default(500)
          .describe("Items per page when fetchAll=false."),
        skip: z.number().int().min(0).default(0).describe("Offset when fetchAll=false."),
        orderBy: z.enum(["type", "-type", "name", "-name"]).optional(),
      }),
    },
    async ({ domain, fetchAll, take, skip, orderBy }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);

        const records = fetchAll
          ? await client.listAllDnsRecords(normalizedDomain, orderBy)
          : (
              await client.listDnsRecords(normalizedDomain, {
                take,
                skip,
                ...(orderBy ? { orderBy } : {}),
              })
            ).items;

        const summary = summarizeByType(records);

        return toTextResult(
          [
            `Domain: ${normalizedDomain}`,
            `Records returned: ${records.length}`,
            `By type: ${JSON.stringify(summary)}`,
          ].join("\n"),
          {
            domain: normalizedDomain,
            count: records.length,
            byType: summary,
            items: records.map(extractComparableFields),
          },
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_dns_record",
    {
      title: "Create DNS Record",
      description:
        'Create DNS records for a domain. Supports all record types. For MX use "priority exchange" value format, for SRV use "priority weight port target".',
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        records: z
          .array(
            z.object({
              name: z.string().describe("Record name (subdomain, use @ for root)"),
              type: z.string().describe("Record type (A, AAAA, CNAME, MX, TXT, SRV, etc.)"),
              value: z.string().describe("Record value"),
              ttl: z.number().int().min(60).max(86400).default(3600).describe("TTL in seconds"),
            }),
          )
          .min(1),
      }),
    },
    async ({ domain, records }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        const dnsRecords: DnsRecord[] = records.map((r) => ({
          name: r.name,
          type: r.type,
          value: r.value,
          ttl: r.ttl,
        }));

        await client.saveDnsRecords(normalizedDomain, dnsRecords);

        return toTextResult(
          `Successfully created ${records.length} DNS record(s) for ${normalizedDomain}`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "update_dns_records",
    {
      title: "Update DNS Records",
      description:
        'Update DNS records for a domain. Uses force overwrite. For MX use "priority exchange" value format, for SRV use "priority weight port target".',
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        records: z
          .array(
            z.object({
              name: z.string().describe("Record name (subdomain, use @ for root)"),
              type: z.string().describe("Record type (A, AAAA, CNAME, MX, TXT, SRV, etc.)"),
              value: z.string().describe("Record value"),
              ttl: z.number().int().min(60).max(86400).default(3600).describe("TTL in seconds"),
            }),
          )
          .min(1),
      }),
    },
    async ({ domain, records }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        const dnsRecords: DnsRecord[] = records.map((r) => ({
          name: r.name,
          type: r.type,
          value: r.value,
          ttl: r.ttl,
        }));

        await client.saveDnsRecords(normalizedDomain, dnsRecords);

        return toTextResult(
          `Successfully updated ${records.length} DNS record(s) for ${normalizedDomain}`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "delete_dns_records",
    {
      title: "Delete DNS Records",
      description: "Delete DNS records from a domain by name and type.",
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        records: z
          .array(
            z.object({
              name: z.string().describe("Record name (subdomain)"),
              type: z.string().describe("Record type (A, AAAA, CNAME, MX, TXT, SRV, etc.)"),
            }),
          )
          .min(1),
      }),
    },
    async ({ domain, records }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        await client.deleteDnsRecords(normalizedDomain, records);

        return toTextResult(
          `Successfully deleted ${records.length} DNS record(s) from ${normalizedDomain}`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
