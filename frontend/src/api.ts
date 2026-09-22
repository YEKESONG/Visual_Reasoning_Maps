import type { components } from "./api-schema";
export type Flow = components["schemas"]["Flow"];
export type Step = components["schemas"]["Step"];
export type Link = components["schemas"]["Link"];
export type Sentence = components["schemas"]["Sentence"];
export type Document = components["schemas"]["Document"];
export type Suggestion = components["schemas"]["Suggestion"];
export type Metadata = components["schemas"]["Metadata"];
export type Explanation = components["schemas"]["Explanation"];
export type TaskAccepted = components["schemas"]["TaskAccepted"];
export type Health = { status: string; configured: boolean; model: string };
export type TaskEvent = {
  step: string;
  progress: number;
  status: "running" | "done" | "error";
  doc_id?: string;
  error?: string;
  params?: Record<string, string>;
};
export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(
      "Connexion impossible. Vérifiez que le serveur fonctionne puis réessayez.",
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : "La requête a échoué. Réessayez.",
    );
  }
  return response.json() as Promise<T>;
}
export const typeLabel: Record<Step["type"], string> = {
  question: "Question",
  premise: "Prémisse",
  claim: "Argument",
  evidence: "Preuve",
  objection: "Objection",
  conclusion: "Conclusion",
};
export const relationLabel: Record<Link["type"], string> = {
  support: "Soutien",
  cause: "Causalité",
  refine: "Précision",
  contradict: "Contradiction",
};
export const statusLabel = {
  verified: "Appui vérifié par le modèle",
  partial: "Appui partiel",
  to_verify: "À vérifier",
};
