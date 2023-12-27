import z from "zod";

export const registerUserZodSchema = z.object({
  body: z.object({
    username: z
      .string({
        required_error: "User name is required",
        invalid_type_error: "User name must be a string",
      })
      .min(8),
    email: z
      .string({
        required_error: "Email is required",
        invalid_type_error: "Please send valid email",
      })
      .email(),
    fullName: z.string({
      required_error: "Full name required",
    }),
    password: z.string({
      required_error: "Password required",
    }),
  }),
});
