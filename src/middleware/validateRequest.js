import { validationResult } from "express-validator";

export function validateRequest(req, res, next) {
  console.log("Validating request:", req.headers);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}
