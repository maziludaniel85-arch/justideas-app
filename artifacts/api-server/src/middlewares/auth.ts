import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface TokenPayload {
  utilizatorId: number;
  email: string;
  rol: string;
}

declare global {
  namespace Express {
    interface Request {
      utilizator?: TokenPayload;
    }
  }
}

export function autentificare(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ eroare: "Token de autentificare lipsă sau invalid." });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({ eroare: "Configurare server invalidă." });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as TokenPayload;
    req.utilizator = payload;
    next();
  } catch {
    res.status(401).json({ eroare: "Token expirat sau invalid. Autentificați-vă din nou." });
  }
}

export function semneazaToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET ?? "fallback-secret";
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}
