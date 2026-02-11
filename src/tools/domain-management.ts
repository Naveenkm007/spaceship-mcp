import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import type { SpaceshipClient } from "../spaceship-client.js";
import { normalizeDomain } from "../dns-utils.js";
import { toTextResult, toErrorResult } from "../tool-result.js";

export const registerDomainManagementTools = (server: McpServer, client: SpaceshipClient): void => {
  server.registerTool(
    "list_domains",
    {
      title: "List Domains",
      description: "List all domains in the Spaceship account.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: z.object({
        fetchAll: z.boolean().default(true).describe("Fetch all pages."),
        take: z.number().int().min(1).max(100).default(100).describe("Items per page when fetchAll=false."),
        skip: z.number().int().min(0).default(0).describe("Offset when fetchAll=false."),
      }),
    },
    async ({ fetchAll, take, skip }) => {
      try {
        if (fetchAll) {
          const domains = await client.listAllDomains();
          return toTextResult(
            [
              `Total domains: ${domains.length}`,
              ...domains.map((d) => `  - ${d.name}${d.expirationDate ? ` (expires: ${d.expirationDate})` : ""}`),
            ].join("\n"),
            { count: domains.length, domains },
          );
        }

        const response = await client.listDomains({ take, skip });
        return toTextResult(
          [
            `Total: ${response.total}, showing ${response.items.length} (skip: ${skip})`,
            ...response.items.map((d) => `  - ${d.name}`),
          ].join("\n"),
          { total: response.total, items: response.items } as Record<string, unknown>,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_domain",
    {
      title: "Get Domain Details",
      description: "Get detailed information about a specific domain.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
      }),
    },
    async ({ domain }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        const info = await client.getDomain(normalizedDomain);

        return toTextResult(
          [
            `Domain: ${info.name}`,
            info.registrationDate ? `Registered: ${info.registrationDate}` : null,
            info.expirationDate ? `Expires: ${info.expirationDate}` : null,
            info.autoRenew !== undefined ? `Auto-renew: ${info.autoRenew}` : null,
            info.privacyLevel ? `Privacy: ${info.privacyLevel}` : null,
            info.status ? `Status: ${info.status}` : null,
            info.nameservers?.hosts ? `Nameservers: ${info.nameservers.hosts.join(", ")}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          info,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "check_domain_availability",
    {
      title: "Check Domain Availability",
      description: "Check if one or more domains are available for registration.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: z.object({
        domains: z
          .array(z.string().min(4).max(255))
          .min(1)
          .max(20)
          .describe("Domain name(s) to check"),
      }),
    },
    async ({ domains }) => {
      try {
        if (domains.length === 1) {
          const result = await client.checkDomainAvailability(normalizeDomain(domains[0]));
          return toTextResult(
            `${result.domain}: ${result.available ? "AVAILABLE" : "NOT AVAILABLE"}${result.price?.register ? ` ($${result.price.register})` : ""}`,
            result,
          );
        }

        const results = await client.checkDomainsAvailability(
          domains.map(normalizeDomain),
        );

        const lines = results.map(
          (r) =>
            `${r.domain}: ${r.available ? "AVAILABLE" : "NOT AVAILABLE"}${r.price?.register ? ` ($${r.price.register})` : ""}`,
        );

        return toTextResult(lines.join("\n"), { results } as Record<string, unknown>);
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "update_nameservers",
    {
      title: "Update Nameservers",
      description: "Update the nameservers for a domain.",
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        nameservers: z
          .array(z.string().min(1))
          .min(1)
          .max(6)
          .describe("List of nameserver hostnames"),
      }),
    },
    async ({ domain, nameservers }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        await client.updateNameservers(normalizedDomain, nameservers);

        return toTextResult(
          `Successfully updated nameservers for ${normalizedDomain}: ${nameservers.join(", ")}`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "set_auto_renew",
    {
      title: "Set Auto-Renew",
      description: "Enable or disable auto-renewal for a domain.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        enabled: z.boolean().describe("Enable (true) or disable (false) auto-renewal"),
      }),
    },
    async ({ domain, enabled }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        await client.setAutoRenew(normalizedDomain, enabled);

        return toTextResult(
          `Auto-renewal ${enabled ? "enabled" : "disabled"} for ${normalizedDomain}`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "set_transfer_lock",
    {
      title: "Set Transfer Lock",
      description: "Enable or disable transfer lock for a domain.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
        locked: z.boolean().describe("Lock (true) or unlock (false) the domain"),
      }),
    },
    async ({ domain, locked }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        await client.setTransferLock(normalizedDomain, locked);

        return toTextResult(
          `Transfer lock ${locked ? "enabled" : "disabled"} for ${normalizedDomain}`,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );

  server.registerTool(
    "get_auth_code",
    {
      title: "Get Auth/EPP Code",
      description: "Retrieve the authorization/EPP code for domain transfer.",
      annotations: { readOnlyHint: true, openWorldHint: true },
      inputSchema: z.object({
        domain: z.string().min(4).max(255).describe("The domain name"),
      }),
    },
    async ({ domain }) => {
      try {
        const normalizedDomain = normalizeDomain(domain);
        const result = await client.getAuthCode(normalizedDomain);

        return toTextResult(
          `Auth code for ${normalizedDomain}: ${result.authCode}`,
          result,
        );
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
};
