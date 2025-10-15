import "dotenv/config";

export const config = {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  },
  server: {
    port: parseInt(process.env.PORT || "3000", 10),
    host: process.env.HOST || "localhost",
    env: process.env.NODE_ENV || "development",
  },
  database: {
    url: process.env.DATABASE_URL || "",
  },
  security: {
    pepper: process.env.PEPPER || "default_pepper_value",
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || "15360", 10), // em KB
    timeCost: parseInt(process.env.ARGON2_TIME_COST || "2", 10), // quantas iterações
    parallelism: parseInt(process.env.ARGON2_PARALLELISM || "1", 10), // threads paralelos
    pepperVersion: parseInt(process.env.PEPPER_VERSION || "1", 10), // versão do pepper
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || "jwt_dev_secret",
    jwtRefreshSecret:
      process.env.JWT_REFRESH_SECRET || "jwt_dev_refresh_secret",
    accessTokenExpiresIn: parseInt(
      process.env.JWT_ACCESS_EXPIRES_IN || "900",
      10
    ), // 15 min
    refreshTokenExpiresIn: parseInt(
      process.env.JWT_REFRESH_EXPIRES_IN || "2592000",
      10
    ), // 30 dias
  },
  supabase: {
    url: process.env.SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || "user-data",
  },
} as const;
