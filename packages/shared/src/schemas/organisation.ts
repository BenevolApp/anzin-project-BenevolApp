import { z } from "zod";

export const organisationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  createdAt: z.string().datetime({ offset: true }),
});
export type Organisation = z.infer<typeof organisationSchema>;
