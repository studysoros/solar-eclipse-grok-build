import { z } from 'zod';

export const PredictedEclipseUISchema = z.object({
  jd: z.number(),
  date: z.string(),
  separationDeg: z.number(),
  type: z.enum(['Total', 'Annular', 'Partial', 'None']),
  note: z.string(),
  isInCatalog: z.boolean().optional(),
});

export type PredictedEclipseUI = z.infer<typeof PredictedEclipseUISchema>;
