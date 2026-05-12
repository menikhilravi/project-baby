export type NurseryOwner = "room" | "safety" | "supplies";

export const defaultNurseryChecklist: Record<NurseryOwner, string[]> = {
  room: [
    "Crib / bassinet assembled",
    "Crib mattress & waterproof cover",
    "Dresser / changing table set up",
    "Blackout curtains installed",
    "Baby monitor set up",
    "Diaper pail in place",
    "Rocking chair / glider",
  ],
  safety: [
    "Outlet covers installed",
    "Cabinet locks on low cabinets",
    "Smoke & CO detectors tested",
    "Stair gates installed",
    "Cords & blinds secured",
    "Pediatrician selected",
    "Hospital route planned",
  ],
  supplies: [
    "Diapers (newborn & size 1)",
    "Wipes & diaper cream",
    "Swaddle blankets (4+)",
    "Onesies (newborn & 3M)",
    "Nursing / formula supplies",
    "Baby wash & lotion",
    "Thermometer & first aid kit",
  ],
};

export const nurseryOwnerCopy: Record<NurseryOwner, { label: string; emoji: string }> = {
  room:     { label: "Room",     emoji: "🛏️" },
  safety:   { label: "Safety",   emoji: "🔒" },
  supplies: { label: "Supplies", emoji: "🧴" },
};
