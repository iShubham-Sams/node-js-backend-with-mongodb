import { z } from "zod";

export const publishVideoZodSchema = z.object({
  body: z.object({
    description: z
      .string({
        required_error: "Description required",
        invalid_type_error: "Description must be a string",
      })
      .min(10),
    title: z
      .string({
        required_error: "Title is required",
        invalid_type_error: "Title must be a string",
      })
      .min(10),
  }),
});
