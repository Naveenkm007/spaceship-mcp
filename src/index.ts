#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SpaceshipClient } from "./spaceship-client.js";
import { createServer } from "./server.js";

const apiKey = process.env.SPACESHIP_API_KEY;
const apiSecret = process.env.SPACESHIP_API_SECRET;

if (!apiKey || !apiSecret) {
  console.error("Missing required env vars: SPACESHIP_API_KEY and SPACESHIP_API_SECRET");
  process.exit(1);
}

const client = new SpaceshipClient(apiKey, apiSecret);
const server = createServer(client);

const main = async (): Promise<void> => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
};

main().catch((error) => {
  console.error("Spaceship MCP server failed:", error);
  process.exit(1);
});
