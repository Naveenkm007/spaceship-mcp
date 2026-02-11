# Spaceship MCP Server

MCP server for the Spaceship registrar API. Manage domains and DNS records through any MCP-compatible client.

## Warning

This MCP server gives AI agents direct control over your DNS records and domain settings. Incorrect changes can cause service disruption or domain takeover. Always review changes before confirming.

## Features

### DNS Record Management
- **list_dns_records** — List all DNS records for a domain
- **create_dns_record** — Create records (generic, all types)
- **update_dns_records** — Update records (force overwrite)
- **delete_dns_records** — Delete records by name and type

### Specialized Record Creation
Type-specific tools with explicit parameters:
- **create_a_record** — A record (IPv4)
- **create_aaaa_record** — AAAA record (IPv6)
- **create_cname_record** — CNAME record (alias)
- **create_mx_record** — MX record (mail exchange)
- **create_srv_record** — SRV record (service locator)
- **create_txt_record** — TXT record (SPF, DKIM, DMARC, etc.)

### Domain Management
- **list_domains** — List all domains in the account
- **get_domain** — Get domain details (registration, expiry, nameservers)
- **check_domain_availability** — Check if domains are available for registration
- **update_nameservers** — Update nameservers for a domain
- **set_auto_renew** — Enable/disable auto-renewal
- **set_transfer_lock** — Lock/unlock domain transfers
- **get_auth_code** — Retrieve EPP/auth code for transfers

### Analysis Tools
- **check_dns_alignment** — Compare expected vs actual DNS records
- **analyze_fly_cutover** — Plan Vercel to Fly migration (read-only)

## Requirements

- Node.js >= 20
- Spaceship API credentials with `domains:read`, `dnsrecords:read`, and `dnsrecords:write` permissions

## Install

```bash
pnpm install
pnpm build
```

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `SPACESHIP_API_KEY` | Spaceship API key | Yes |
| `SPACESHIP_API_SECRET` | Spaceship API secret | Yes |

Get credentials from the [Spaceship API Manager](https://www.spaceship.com/application/api-manager/).

## MCP Client Config

### Claude Code

```json
{
  "mcpServers": {
    "spaceship": {
      "command": "node",
      "args": ["/path/to/spaceship-mcp/dist/index.js"],
      "env": {
        "SPACESHIP_API_KEY": "your_api_key",
        "SPACESHIP_API_SECRET": "your_api_secret"
      }
    }
  }
}
```

### Development

```bash
SPACESHIP_API_KEY=... SPACESHIP_API_SECRET=... pnpm dev
```

## API Permissions

| Permission | Tools |
|------------|-------|
| `domains:read` | list_domains, get_domain, check_domain_availability |
| `domains:write` | update_nameservers, set_auto_renew, set_transfer_lock |
| `domains:transfer` | get_auth_code |
| `dnsrecords:read` | list_dns_records, check_dns_alignment, analyze_fly_cutover |
| `dnsrecords:write` | create/update/delete DNS record tools |
