import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// ...

const zodValidate =
  (schema: z.ZodObject<z.ZodRawShape, "strip">) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsedSchema = await schema.parseAsync(req);
      if (!parsedSchema) {
        throw new Error("please send right data");
      }
      if (parsedSchema.body) {
        req.body = parsedSchema.body;
      }

      if (parsedSchema.params) {
        req.params = parsedSchema.params;
      }

      if (parsedSchema.query) {
        req.query = parsedSchema.query;
      }

      return next();
    } catch (error) {
      return res.status(400).json(error);
    }
  };

export default zodValidate;
