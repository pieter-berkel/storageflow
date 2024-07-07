import { z } from "zod";

export const fileInfoSchema = z.object({
  name: z.string().min(0).max(255), // TODO: check if file name is valid (regex)
  size: z.number(),
  type: z.string().regex(/^\w+\/[-+.\w]+$/gm),
});

export type FileInfo = z.infer<typeof fileInfoSchema>;
