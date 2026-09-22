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
  claim: "Affirmation",
  evidence: "Preuve",
  objection: "Objection",
  conclusion: "Conclusion",
};
export const relationLabel: Record<Link["type"], string> = {
  support: "Soutien",
  cause: "Cause",
  refine: "Précision",
  contradict: "Contradiction",
};
export const statusLabel: Record<Step["status"] & string, string> = {
  verified: "Vérifié",
  partial: "Appui partiel",
  to_verify: "À vérifier",
};
export const statusDetail: Record<Step["status"] & string, string> = {
  verified:
    "Le passage cité soutient cette étape. Il s’agit d’un contrôle automatique de fidélité au texte, pas d’une validation scientifique.",
  partial: "Le passage cité ne soutient qu’une partie de cette étape.",
  to_verify:
    "Soutien non confirmé : lisez le passage avant de vous fier à cette étape.",
};
export const linkStatusDetail: Record<Link["status"] & string, string> = {
  verified: "Les passages cités établissent cette relation.",
  partial: "Les passages cités n’établissent cette relation qu’en partie.",
  to_verify: "Relation non confirmée : comparez les deux passages.",
};
export const languageName: Record<string, string> = {
  zh: "中文",
  en: "English",
  fr: "Français",
};
