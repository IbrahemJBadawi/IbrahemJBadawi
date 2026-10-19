import { z } from "zod";
import { optionalInt, optionalText } from "./common";

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, { error: "الاسم حرفان على الأقل" }).max(120),
  displayName: optionalText(60).refine((v) => v === null || v.length >= 2, { error: "الاسم الظاهر حرفان على الأقل" }),
  bio: optionalText(1000),
  directoryVisible: z.preprocess((v) => v === "on", z.boolean()),
  gender: z.enum(["", "male", "female"]).transform((v) => (v === "" ? null : v)),
  birthYear: optionalInt(1900, new Date().getFullYear()),
  country: optionalText(60),
  city: optionalText(60),
});
