import dotenv from "dotenv";

dotenv.config();

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function optionalEnv(name, fallback = undefined) {
  return process.env[name] || fallback;
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

