import { Request } from "express";
export interface CustomRequest extends Request {
  user?: any; // Replace YourUserType with the actual type of your user object
}
