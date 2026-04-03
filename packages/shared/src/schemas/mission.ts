import { z } from "zod";

export const missionStatusSchema = z.enum([
  "draft",
  "published",
  "cancelled",
  "completed",
]);
export type MissionStatus = z.infer<typeof missionStatusSchema>;

export const missionSchema = z.object({
  id: z.string().uuid(),
  organisationId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  status: missionStatusSchema,
  beneficiaireId: z.string().uuid().nullable(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});
export type Mission = z.infer<typeof missionSchema>;

export const createMissionSchema = missionSchema.pick({
  title: true,
  description: true,
  beneficiaireId: true,
});
export type CreateMission = z.infer<typeof createMissionSchema>;
