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

export const loginUserZodSchema = z.object({
  body: z.object({
    username: z
      .string({
        required_error: "Email or username required",
        invalid_type_error: "User name must be a string",
      })
      .min(8)
      .optional(),
    email: z
      .string({
        required_error: "Email is required",
        invalid_type_error: "Please send valid email",
      })
      .email()
      .optional(),
    password: z.string({
      required_error: "Password required",
    }),
  }),
});

export const changeUserPasswordZodSchema = z.object({
  body: z
    .object({
      oldPassword: z.string({
        required_error: "Old password required",
        invalid_type_error: "Old password must be a string",
      }),
      newPassword: z.string({
        required_error: "New password required",
        invalid_type_error: "New password must be a string",
      }),
      confirmNewPassword: z.string({
        required_error: "Confirm password required",
        invalid_type_error: "New password must be a string",
      }),
    })
    .refine((val) => val.newPassword == val.confirmNewPassword, {
      message: "New password and Confirm password not same",
    }),
});

export const updateAccountDetailsZodSchema = z.object({
  body: z.object({
    fullName: z.string({
      required_error: "Full name is required",
      invalid_type_error: "Full name must be a string",
    }),
    email: z
      .string({
        required_error: "Email is required",
        invalid_type_error: "Please send valid email",
      })
      .email(),
  }),
});

export const getUserProfileChannelZodSchema = z.object({
  params: z.object({
    username: z.string({
      required_error: "User name is required",
      invalid_type_error: "User name must be a string",
    }),
  }),
});
