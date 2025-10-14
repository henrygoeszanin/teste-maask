import Fastify from "fastify";
import { config } from "@config/index";
import { registerRoutes } from "@presentation/routes";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import cors from "@fastify/cors";
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";

const app = Fastify({
  logger: {
    level: config.server.env === "development" ? "info" : "error",
  },
}).withTypeProvider<ZodTypeProvider>();

// Set validator and serializer
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// CORS configuration
app.register(cors, {
  origin: config.server.env === "development" ? "*" : false,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
});

// Swagger/OpenAPI configuration
app.register(swagger, {
  openapi: {
    info: {
      title: "Maask Backend API",
      description: "API para gerenciamento de perfis de navegador",
      version: "1.0.0",
    },
    servers: [
      {
        url: `http://${config.server.host}:${config.server.port}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
});

app.register(swaggerUI, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: false,
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode ?? 500;
  const message = error.message || "Internal Server Error";

  request.log.error(error);

  reply.status(statusCode).send({
    error: {
      message,
      statusCode,
    },
  });
});

// Register routes
registerRoutes(app);

// Start server
const start = async () => {
  try {
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    console.log(
      `🚀 Server is running on http://${config.server.host}:${config.server.port}`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
