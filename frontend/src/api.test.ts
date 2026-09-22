import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { messages } from "./translations";

const reply = (body: string, status: number) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body, { status })),
  );

describe("request errors", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the server's own message when there is one", async () => {
    reply(JSON.stringify({ detail: "Document introuvable." }), 404);
    await expect(api("/api/docs/x")).rejects.toThrow("Document introuvable.");
  });
  it("points to the server terminal after an unhandled server error", async () => {
    reply("Internal Server Error", 500);
    const error = await api("/api/docs/x").catch((e: Error) => e);
    expect((error as Error).message).toMatch(/^Erreur du serveur/);
    expect((error as Error).message in messages).toBe(true);
  });
  it("keeps the generic message for other failures without detail", async () => {
    reply("", 400);
    await expect(api("/api/docs/x")).rejects.toThrow(
      "La requête a échoué. Réessayez.",
    );
  });
  it("says when the server cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(api("/api/health")).rejects.toThrow(/^Connexion impossible/);
  });
});
