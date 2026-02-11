import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SpaceshipClient } from "../spaceship-client.js";
import { normalizeDomain } from "../dns-utils.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerDnsRecordCreatorTools = (server: McpServer, client: SpaceshipClient): void => {
  server.registerTool(
    "create_a_record",
    {
      title: "Create A Record",
      description: "Create an A record (IPv4 address) for a domain.",
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        name: z.string().describe('Record name (subdomain, use "@" for root)'),
        address: z.string().describe('IPv4 address (e.g. "192.0.2.1")'),
        ttl: z.number().int().min(60).max(86400).default(3600).describe("TTL in seconds"),
      }),
    },
    async ({ domain, name, address, ttl }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        await client.saveDnsRecords(normalizedDomain, [
          { name, type: "A", address, ttl },
        ]);

        return toTextResult(
          `Successfully created A record: ${name}.${normalizedDomain} -> ${address}`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_aaaa_record",
    {
      title: "Create AAAA Record",
      description: "Create an AAAA record (IPv6 address) for a domain.",
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        name: z.string().describe('Record name (subdomain, use "@" for root)'),
        address: z.string().describe('IPv6 address (e.g. "2001:db8::1")'),
        ttl: z.number().int().min(60).max(86400).default(3600).describe("TTL in seconds"),
      }),
    },
    async ({ domain, name, address, ttl }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        await client.saveDnsRecords(normalizedDomain, [
          { name, type: "AAAA", address, ttl },
        ]);

        return toTextResult(
          `Successfully created AAAA record: ${name}.${normalizedDomain} -> ${address}`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_cname_record",
    {
      title: "Create CNAME Record",
      description: "Create a CNAME record (canonical name/alias) for a domain.",
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        name: z.string().describe("Record name (subdomain)"),
        cname: z.string().describe('Canonical name to point to (e.g. "example.com")'),
        ttl: z.number().int().min(60).max(86400).default(3600).describe("TTL in seconds"),
      }),
    },
    async ({ domain, name, cname, ttl }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        await client.saveDnsRecords(normalizedDomain, [
          { name, type: "CNAME", cname, ttl },
        ]);

        return toTextResult(
          `Successfully created CNAME record: ${name}.${normalizedDomain} -> ${cname}`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_mx_record",
    {
      title: "Create MX Record",
      description: "Create an MX record (mail exchange) for a domain.",
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        name: z.string().describe('Record name (subdomain, use "@" for root)'),
        priority: z.number().int().min(0).max(65535).describe("Priority (lower = higher priority)"),
        exchange: z.string().describe('Mail server hostname (e.g. "mail.example.com")'),
        ttl: z.number().int().min(60).max(86400).default(3600).describe("TTL in seconds"),
      }),
    },
    async ({ domain, name, priority, exchange, ttl }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        await client.saveDnsRecords(normalizedDomain, [
          { name, type: "MX", preference: priority, exchange, ttl },
        ]);

        return toTextResult(
          `Successfully created MX record: ${name}.${normalizedDomain} -> ${exchange} (priority: ${priority})`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_srv_record",
    {
      title: "Create SRV Record",
      description: "Create an SRV record (service locator) for a domain.",
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        name: z.string().describe('Service name (e.g. "_autodiscover._tcp")'),
        priority: z.number().int().min(0).max(65535).describe("Priority (lower = higher priority)"),
        weight: z.number().int().min(0).max(65535).describe("Weight for load balancing"),
        port: z.number().int().min(1).max(65535).describe("Port number"),
        target: z.string().describe('Target hostname (e.g. "autodiscover.example.com")'),
        ttl: z.number().int().min(60).max(86400).default(3600).describe("TTL in seconds"),
      }),
    },
    async ({ domain, name, priority, weight, port, target, ttl }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        await client.saveDnsRecords(normalizedDomain, [
          { name, type: "SRV", priority, weight, port, target, ttl },
        ]);

        return toTextResult(
          `Successfully created SRV record: ${name}.${normalizedDomain} -> ${target}:${port} (priority: ${priority}, weight: ${weight})`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "create_txt_record",
    {
      title: "Create TXT Record",
      description: "Create a TXT record (text data) for a domain. Useful for SPF, DKIM, DMARC, verification, etc.",
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        name: z.string().describe('Record name (subdomain, use "@" for root)'),
        value: z.string().describe('Text value (e.g. "v=spf1 include:example.com -all")'),
        ttl: z.number().int().min(60).max(86400).default(3600).describe("TTL in seconds"),
      }),
    },
    async ({ domain, name, value, ttl }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        await client.saveDnsRecords(normalizedDomain, [
          { name, type: "TXT", value, ttl },
        ]);

        return toTextResult(
          `Successfully created TXT record for ${name}.${normalizedDomain}`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
