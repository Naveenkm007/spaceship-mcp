# spaceship-mcp

[![npm version](https://img.shields.io/npm/v/spaceship-mcp.svg)](https://www.npmjs.com/package/spaceship-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-122%20passing-brightgreen.svg)]()
[![MCP](https://img.shields.io/badge/MCP-compatible-purple.svg)](https://modelcontextprotocol.io)

A community-built [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for the [Spaceship](https://spaceship.com) API. Manage domains, DNS records, contacts, marketplace listings, and more — all through natural language via any MCP-compatible AI client.

> **Note:** This is an unofficial, community-maintained project and is not affiliated with or endorsed by Spaceship.

## Features

- **47 tools** across 8 categories covering the full Spaceship API
- **13 DNS record types** with dedicated, type-safe creation tools (A, AAAA, ALIAS, CAA, CNAME, HTTPS, MX, NS, PTR, SRV, SVCB, TLSA, TXT)
- **Complete domain lifecycle** — register, renew, transfer, and restore domains
- **SellerHub integration** — list domains for sale and generate checkout links
- **DNS alignment analysis** — compare expected vs actual records to catch misconfigurations
- **WHOIS privacy and contact management** with TLD-specific attribute support
- **Input validation** via Zod schemas on every tool for safe, predictable operations
- **122 unit tests** for reliability

## Supported Clients

This MCP server works with any client that supports the Model Context Protocol, including:

| Client | Setup Method |
|---|---|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (CLI) | `claude mcp add` CLI command |
| [Claude Desktop](https://claude.ai/download) | JSON config file |
| [Codex CLI](https://github.com/openai/codex) (OpenAI) | `codex mcp add` CLI command or TOML config |
| [Gemini CLI](https://github.com/google-gemini/gemini-cli) (Google) | `gemini mcp add` CLI command or JSON config |
| [Cursor](https://cursor.com) | JSON config file |
| [Windsurf](https://codeium.com/windsurf) | JSON config file |
| [VS Code](https://code.visualstudio.com/) (Copilot) | JSON config file or Command Palette |
| [Zed](https://zed.dev) | JSON settings file |
| [Cline](https://github.com/cline/cline) | UI settings or JSON config |
| Any MCP-compatible client | See [Other Clients](#other-mcp-clients) below |

## Installation

### Claude Code

```bash
claude mcp add --scope user spaceship-mcp \
  --env SPACESHIP_API_KEY=your-key \
  --env SPACESHIP_API_SECRET=your-secret \
  -- npx spaceship-mcp
```

### Claude Desktop

Add to your Claude Desktop config file:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "spaceship-mcp": {
      "command": "npx",
      "args": ["spaceship-mcp"],
      "env": {
        "SPACESHIP_API_KEY": "your-key",
        "SPACESHIP_API_SECRET": "your-secret"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project directory (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "spaceship-mcp": {
      "command": "npx",
      "args": ["spaceship-mcp"],
      "env": {
        "SPACESHIP_API_KEY": "your-key",
        "SPACESHIP_API_SECRET": "your-secret"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "spaceship-mcp": {
      "command": "npx",
      "args": ["spaceship-mcp"],
      "env": {
        "SPACESHIP_API_KEY": "your-key",
        "SPACESHIP_API_SECRET": "your-secret"
      }
    }
  }
}
```

### VS Code (Copilot)

Add to `.vscode/mcp.json` in your project directory:

```json
{
  "servers": {
    "spaceship-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["spaceship-mcp"],
      "env": {
        "SPACESHIP_API_KEY": "your-key",
        "SPACESHIP_API_SECRET": "your-secret"
      }
    }
  }
}
```

Or use the Command Palette: `Cmd+Shift+P` > `MCP: Add Server` > select **stdio**.

### Codex CLI (OpenAI)

```bash
codex mcp add spaceship-mcp \
  --env SPACESHIP_API_KEY=your-key \
  --env SPACESHIP_API_SECRET=your-secret \
  -- npx spaceship-mcp
```

Or add to `~/.codex/config.toml`:

```toml
[mcp_servers.spaceship-mcp]
command = "npx"
args = ["spaceship-mcp"]
env = { "SPACESHIP_API_KEY" = "your-key", "SPACESHIP_API_SECRET" = "your-secret" }
```

### Gemini CLI (Google)

```bash
gemini mcp add spaceship-mcp -- npx spaceship-mcp
```

Or add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "spaceship-mcp": {
      "command": "npx",
      "args": ["spaceship-mcp"],
      "env": {
        "SPACESHIP_API_KEY": "your-key",
        "SPACESHIP_API_SECRET": "your-secret"
      }
    }
  }
}
```

### Zed

Add to your Zed settings file (`~/.zed/settings.json` on macOS, `~/.config/zed/settings.json` on Linux):

```json
{
  "context_servers": {
    "spaceship-mcp": {
      "command": "npx",
      "args": ["spaceship-mcp"],
      "env": {
        "SPACESHIP_API_KEY": "your-key",
        "SPACESHIP_API_SECRET": "your-secret"
      }
    }
  }
}
```

### Other MCP Clients

For any MCP-compatible client, use this server configuration:

- **Command:** `npx`
- **Args:** `["spaceship-mcp"]`
- **Environment variables:** `SPACESHIP_API_KEY` and `SPACESHIP_API_SECRET`

## Configuration

Two environment variables are required:

| Variable | Description |
|---|---|
| `SPACESHIP_API_KEY` | Your Spaceship API key |
| `SPACESHIP_API_SECRET` | Your Spaceship API secret |

You can obtain API credentials from your [Spaceship account settings](https://spaceship.com).

## Available Tools

### DNS Records

| Tool | Description |
|---|---|
| `list_dns_records` | List all DNS records for a domain with pagination |
| `save_dns_records` | Save (upsert) DNS records — replaces records with the same name and type |
| `delete_dns_records` | Delete DNS records by name and type |

### Type-Specific Record Creation

Each DNS record type has a dedicated tool with type-safe parameters and validation.

| Tool | Description |
|---|---|
| `create_a_record` | Create an A record (IPv4 address) |
| `create_aaaa_record` | Create an AAAA record (IPv6 address) |
| `create_alias_record` | Create an ALIAS record (CNAME flattening at zone apex) |
| `create_caa_record` | Create a CAA record (Certificate Authority Authorization) |
| `create_cname_record` | Create a CNAME record (canonical name) |
| `create_https_record` | Create an HTTPS record (SVCB-compatible) |
| `create_mx_record` | Create an MX record (mail exchange) |
| `create_ns_record` | Create an NS record (nameserver delegation) |
| `create_ptr_record` | Create a PTR record (reverse DNS) |
| `create_srv_record` | Create an SRV record (service locator) |
| `create_svcb_record` | Create an SVCB record (general service binding) |
| `create_tlsa_record` | Create a TLSA record (DANE/TLS certificate association) |
| `create_txt_record` | Create a TXT record (text data) |

### Domain Management

| Tool | Description |
|---|---|
| `list_domains` | List all domains in the account with pagination |
| `get_domain` | Get detailed domain information |
| `check_domain_availability` | Check availability for up to 20 domains at once |
| `update_nameservers` | Update nameservers for a domain |
| `set_auto_renew` | Toggle auto-renewal for a domain |
| `set_transfer_lock` | Toggle transfer lock for a domain |
| `get_auth_code` | Get the transfer auth/EPP code |

### Domain Lifecycle

| Tool | Description |
|---|---|
| `register_domain` | Register a new domain (financial operation, async) |
| `renew_domain` | Renew a domain registration (financial operation, async) |
| `restore_domain` | Restore a domain from redemption grace period (financial operation, async) |
| `transfer_domain` | Transfer a domain to Spaceship (financial operation, async) |
| `get_transfer_status` | Check the status of a domain transfer |
| `get_async_operation` | Poll the status of an async operation by its operation ID |

### Contacts & Privacy

| Tool | Description |
|---|---|
| `save_contact` | Create or update a reusable contact profile |
| `get_contact` | Retrieve a saved contact by ID |
| `save_contact_attributes` | Save TLD-specific contact attributes (e.g. tax IDs) |
| `get_contact_attributes` | Retrieve all stored contact attributes |
| `update_domain_contacts` | Update domain contacts (registrant, admin, tech, billing) |
| `set_privacy_level` | Set WHOIS privacy level (high or public) |
| `set_email_protection` | Toggle contact form display in WHOIS |

### Personal Nameservers

| Tool | Description |
|---|---|
| `list_personal_nameservers` | List vanity/glue nameservers for a domain |
| `update_personal_nameserver` | Create or update a personal nameserver (glue record) |
| `delete_personal_nameserver` | Delete a personal nameserver |

### SellerHub

| Tool | Description |
|---|---|
| `list_sellerhub_domains` | List domains for sale on the marketplace |
| `create_sellerhub_domain` | List a domain for sale with pricing |
| `get_sellerhub_domain` | Get listing details |
| `update_sellerhub_domain` | Update listing price and currency |
| `delete_sellerhub_domain` | Remove a listing from the marketplace |
| `create_checkout_link` | Generate a buy-now checkout link for a listing |
| `get_verification_records` | Get DNS verification records for a listing |

### Analysis

| Tool | Description |
|---|---|
| `check_dns_alignment` | Compare expected vs actual DNS records to detect missing or unexpected entries |

## Example Usage

Once connected, you can interact with the Spaceship API using natural language:

- "List all my domains"
- "Check if example.com is available for registration"
- "Create an A record for api.example.com pointing to 203.0.113.10"
- "Set up MX records for example.com to use Google Workspace"
- "Enable WHOIS privacy on example.com"
- "Check if my DNS records for example.com match what I expect"
- "List my domains for sale on SellerHub"
- "Transfer example.com to Spaceship"

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Project Structure

```
src/
  index.ts                    # Entry point (stdio transport)
  server.ts                   # MCP server setup, registers all tool modules
  spaceship-client.ts         # Spaceship API HTTP client
  schemas.ts                  # Shared Zod validation schemas
  types.ts                    # TypeScript interfaces
  tools/
    dns-records.ts            # List, save, delete DNS records
    dns-record-creators.ts    # 13 type-specific DNS record creation tools
    domain-management.ts      # Domain listing, settings, nameservers
    domain-lifecycle.ts       # Registration, renewal, transfer, restore
    contacts-privacy.ts       # Contact profiles and WHOIS privacy
    personal-nameservers.ts   # Vanity/glue nameserver management
    sellerhub.ts              # Marketplace listing and checkout tools
    analysis.ts               # DNS alignment analysis
```

## Requirements

- Node.js >= 20
- A [Spaceship](https://spaceship.com) account with API credentials

## License

MIT - see [LICENSE](LICENSE) for details.
