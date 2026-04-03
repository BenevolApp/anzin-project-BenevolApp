// Source unique de vérité pour les QueryKeys TanStack Query
// Utilisé par web et mobile — jamais redéfini ailleurs

export const queryKeys = {
  profiles: {
    all: ["profiles"] as const,
    detail: (id: string) => ["profiles", id] as const,
  },
  missions: {
    all: ["missions"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["missions", "list", filters] as const,
    detail: (id: string) => ["missions", id] as const,
  },
  organisations: {
    all: ["organisations"] as const,
    detail: (id: string) => ["organisations", id] as const,
  },
  missionApplications: {
    byMission: (missionId: string) =>
      ["mission-applications", missionId] as const,
    byBenevole: (benevoleId: string) =>
      ["mission-applications", "benevole", benevoleId] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    human: ["notifications", "human"] as const,
  },
} as const;
