import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpaceshipClient, SpaceshipApiError } from "./spaceship-client.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const jsonResponse = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const emptyResponse = (): Response => new Response(null, { status: 204 });

describe("SpaceshipClient", () => {
  let client: SpaceshipClient;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockFetch.mockReset();
    client = new SpaceshipClient("test-key", "test-secret", "https://api.test.com");
  });

  describe("request building", () => {
    it("sends auth headers on every request", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }));

      await client.listDnsRecords("example.com", { take: 10, skip: 0 });

      const [, init] = mockFetch.mock.calls[0];
      const headers = init.headers as Headers;
      expect(headers.get("X-API-Key")).toBe("test-key");
      expect(headers.get("X-API-Secret")).toBe("test-secret");
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("encodes domain in URL path", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }));

      await client.listDnsRecords("ex ample.com", { take: 10, skip: 0 });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("ex%20ample.com");
    });

    it("strips trailing slash from baseUrl", () => {
      const c = new SpaceshipClient("k", "s", "https://api.test.com/");
      // The baseUrl should have the trailing slash removed
      // We can verify by making a request
      mockFetch.mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }));
      c.listDnsRecords("example.com", { take: 10, skip: 0 });
      const [url] = mockFetch.mock.calls[0];
      expect(url).not.toContain("//v1");
    });
  });

  describe("listDnsRecords", () => {
    it("builds correct query params", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }));

      await client.listDnsRecords("example.com", { take: 100, skip: 50, orderBy: "name" });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("take=100");
      expect(url).toContain("skip=50");
      expect(url).toContain("orderBy=name");
    });
  });

  describe("listAllDnsRecords", () => {
    it("paginates through all pages", async () => {
      const page1 = Array.from({ length: 500 }, (_, i) => ({
        type: "A",
        name: `r${i}`,
        address: "1.2.3.4",
      }));
      const page2 = [{ type: "A", name: "last", address: "1.2.3.4" }];

      mockFetch
        .mockResolvedValueOnce(jsonResponse({ items: page1, total: 501 }))
        .mockResolvedValueOnce(jsonResponse({ items: page2, total: 501 }));

      const result = await client.listAllDnsRecords("example.com");

      expect(result).toHaveLength(501);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("stops on empty page", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ items: [], total: 0 }));

      const result = await client.listAllDnsRecords("example.com");

      expect(result).toHaveLength(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("saveDnsRecords", () => {
    it("sends PUT with force:true", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        { type: "A", name: "@", address: "1.2.3.4", ttl: 300 },
      ]);

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("PUT");
      const body = JSON.parse(init.body);
      expect(body.force).toBe(true);
      expect(body.items).toHaveLength(1);
      expect(body.items[0].type).toBe("A");
    });
  });

  describe("deleteDnsRecords", () => {
    it("sends DELETE with record identifiers", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.deleteDnsRecords("example.com", [{ name: "@", type: "A" }]);

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("DELETE");
      const body = JSON.parse(init.body);
      expect(body).toEqual([{ name: "@", type: "A" }]);
    });
  });

  describe("error handling", () => {
    it("throws SpaceshipApiError on non-ok response with JSON body", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ code: "NOT_FOUND" }), {
          status: 404,
          headers: { "content-type": "application/json" },
        }),
      );

      await expect(client.getDomain("nonexistent.com")).rejects.toThrow(SpaceshipApiError);

      try {
        mockFetch.mockResolvedValueOnce(
          new Response(JSON.stringify({ code: "NOT_FOUND" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          }),
        );
        await client.getDomain("nonexistent.com");
      } catch (e) {
        expect(e).toBeInstanceOf(SpaceshipApiError);
        expect((e as SpaceshipApiError).status).toBe(404);
      }
    });

    it("handles 204 no-content response", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      // setAutoRenew returns Promise<void>, so await should not throw
      await expect(client.setAutoRenew("example.com", true)).resolves.toBeUndefined();
    });
  });

  describe("domain operations", () => {
    it("checkDomainAvailability calls correct endpoint", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ domain: "test.com", available: true }));

      const result = await client.checkDomainAvailability("test.com");

      expect(result.available).toBe(true);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/v1/domains/test.com/available");
    });

    it("checkDomainsAvailability posts multiple domains", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse([
          { domain: "a.com", available: true },
          { domain: "b.com", available: false },
        ]),
      );

      const result = await client.checkDomainsAvailability(["a.com", "b.com"]);

      expect(result).toHaveLength(2);
      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("POST");
    });

    it("updateNameservers sends PUT with nameservers", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.updateNameservers("example.com", ["ns1.fly.io", "ns2.fly.io"]);

      const [, init] = mockFetch.mock.calls[0];
      expect(init.method).toBe("PUT");
      const body = JSON.parse(init.body);
      expect(body.items).toEqual(["ns1.fly.io", "ns2.fly.io"]);
    });
  });

  describe("buildRecordPayload (via saveDnsRecords)", () => {
    it("builds MX record from preference/exchange", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        { type: "MX", name: "@", preference: 10, exchange: "mail.example.com", ttl: 3600 },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].preference).toBe(10);
      expect(body.items[0].exchange).toBe("mail.example.com");
    });

    it("builds MX record from value string", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        { type: "MX", name: "@", value: "10 mail.example.com", ttl: 3600 },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].preference).toBe(10);
      expect(body.items[0].exchange).toBe("mail.example.com");
    });

    it("builds SRV record from structured fields", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        {
          type: "SRV",
          name: "_sip._tcp",
          priority: 10,
          weight: 60,
          port: 5060,
          target: "sip.example.com",
        },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].priority).toBe(10);
      expect(body.items[0].service).toBe("_sip");
      expect(body.items[0].protocol).toBe("_tcp");
    });

    it("builds CNAME from cname field", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        { type: "CNAME", name: "www", cname: "example.com" },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].cname).toBe("example.com");
    });

    it("throws for invalid MX value format", async () => {
      await expect(
        client.saveDnsRecords("example.com", [{ type: "MX", name: "@", value: "invalid" }]),
      ).rejects.toThrow("Invalid MX record format");
    });

    it("throws for MX without required fields", async () => {
      await expect(
        client.saveDnsRecords("example.com", [{ type: "MX", name: "@" }]),
      ).rejects.toThrow("MX record must have");
    });

    it("throws for SRV without required fields", async () => {
      await expect(
        client.saveDnsRecords("example.com", [{ type: "SRV", name: "_sip._tcp" }]),
      ).rejects.toThrow("SRV record must have");
    });

    it("builds ALIAS record from aliasName", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        { type: "ALIAS", name: "@", aliasName: "example.herokudns.com", ttl: 3600 },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].aliasName).toBe("example.herokudns.com");
      expect(body.items[0]).not.toHaveProperty("value");
    });

    it("builds CAA record from flag/tag/value", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        { type: "CAA", name: "@", flag: 0, tag: "issue", value: "letsencrypt.org", ttl: 3600 },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].flag).toBe(0);
      expect(body.items[0].tag).toBe("issue");
      expect(body.items[0].value).toBe("letsencrypt.org");
    });

    it("builds HTTPS record from structured fields", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        {
          type: "HTTPS",
          name: "@",
          svcPriority: 1,
          targetName: "cdn.example.com",
          svcParams: "alpn=h2,h3",
          ttl: 3600,
        },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].svcPriority).toBe(1);
      expect(body.items[0].targetName).toBe("cdn.example.com");
      expect(body.items[0].svcParams).toBe("alpn=h2,h3");
    });

    it("builds NS record from nameserver", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        { type: "NS", name: "sub", nameserver: "ns1.example.com", ttl: 3600 },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].nameserver).toBe("ns1.example.com");
    });

    it("builds PTR record from pointer", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        { type: "PTR", name: "4.3.2.1", pointer: "host.example.com", ttl: 3600 },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].pointer).toBe("host.example.com");
    });

    it("builds SVCB record from structured fields", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        {
          type: "SVCB",
          name: "@",
          svcPriority: 0,
          targetName: "svc.example.com",
          ttl: 3600,
        },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].svcPriority).toBe(0);
      expect(body.items[0].targetName).toBe("svc.example.com");
    });

    it("builds TLSA record from structured fields", async () => {
      mockFetch.mockResolvedValueOnce(emptyResponse());

      await client.saveDnsRecords("example.com", [
        {
          type: "TLSA",
          name: "_443._tcp",
          port: "_443",
          protocol: "_tcp",
          usage: 3,
          selector: 1,
          matching: 1,
          associationData: "abcdef",
          ttl: 3600,
        },
      ]);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.items[0].port).toBe("_443");
      expect(body.items[0].protocol).toBe("_tcp");
      expect(body.items[0].usage).toBe(3);
      expect(body.items[0].selector).toBe(1);
      expect(body.items[0].matching).toBe(1);
      expect(body.items[0].associationData).toBe("abcdef");
    });
  });
});
