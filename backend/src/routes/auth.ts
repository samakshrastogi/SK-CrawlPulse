import { Router } from "express";
import { HttpError } from "../lib/HttpError";
import { requestRegistrationOtp, verifyRegistrationOtp } from "../modules/auth/emailOtp";

export const authRouter = Router();

authRouter.post("/register/send-otp", async (req, res, next) => {
  try {
    const result = await requestRegistrationOtp({
      email: req.body?.email,
      name: typeof req.body?.name === "string" ? req.body.name : "",
    });

    if (!result.ok) {
      throw new HttpError(400, result.reason);
    }

    res.json({
      message: "Verification code sent.",
      expiresInMinutes: result.expiresInMinutes,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/register/verify-otp", (req, res, next) => {
  try {
    const result = verifyRegistrationOtp(req.body?.email, req.body?.otp);
    if (!result.ok) {
      throw new HttpError(400, result.reason);
    }

    res.json({
      verified: true,
      email: result.email,
      name: result.name,
    });
  } catch (error) {
    next(error);
  }
});
