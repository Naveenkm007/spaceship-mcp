import { SpaceshipApiError } from "./spaceship-client.js";

export const toTextResult = (
  text: string,
  structuredContent?: Record<string, unknown>,
) => ({
  content: [{ type: "text" as const, text }],
  ...(structuredContent ? { structuredContent } : {}),
});

export const toErrorResult = (error: unknown) => {
  if (error instanceof SpaceshipApiError) {
    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Spaceship API error: ${error.message}`,
            `Status: ${error.status}`,
            error.details ? `Details: ${JSON.stringify(error.details, null, 2)}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: error instanceof Error ? error.message : String(error),
      },
    ],
    isError: true,
  };
};
