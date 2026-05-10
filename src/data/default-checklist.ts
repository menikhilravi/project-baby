export type Owner = "mom" | "dad" | "baby";

export const defaultChecklist: Record<Owner, string[]> = {
  mom: [
    "Robe & slippers",
    "Toiletries",
    "Phone charger",
    "Going-home outfit",
    "Lip balm & water bottle",
  ],
  dad: [
    "Snacks & water",
    "Change of clothes",
    "Camera & charger",
    "Power bank",
    "Toiletries",
  ],
  baby: [
    "Going-home outfit",
    "Swaddle blanket",
    "Newborn diapers",
    "Pediatrician contact info",
    "Car seat (installed)",
  ],
};

export const ownerCopy: Record<Owner, { label: string; emoji: string }> = {
  mom: { label: "Mom", emoji: "🌷" },
  dad: { label: "Dad", emoji: "☕" },
  baby: { label: "Baby", emoji: "🧸" },
};
