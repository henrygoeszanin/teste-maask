import Fastify from "fastify";
import { config } from "@config/index";
import { registerRoutes } from "@presentation/routes";
import { SocketGateway } from "@presentation/gateways/SocketGateway";
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
  origin: config.server.env === "development" ? "*" : config.cors.origin,
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
  transform: ({ schema, url }) => {
    // Adiciona exemplos aos schemas se existirem
    const transformedSchema = { ...schema };

    if (schema.body && (schema.body as any)._examples) {
      transformedSchema.body = {
        ...schema.body,
        examples: (schema.body as any)._examples,
      };
    }

    if (schema.response) {
      const transformedResponse: any = {};
      for (const [statusCode, responseSchema] of Object.entries(
        schema.response
      )) {
        if (responseSchema._examples) {
          transformedResponse[statusCode] = {
            ...responseSchema,
            examples: responseSchema._examples,
          };
        } else {
          transformedResponse[statusCode] = responseSchema;
        }
      }
      transformedSchema.response = transformedResponse;
    }

    return { schema: transformedSchema, url };
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

  // Retorna formato compatível com os schemas de erro
  reply.status(statusCode).send({
    error: message,
  });
});

// Inicializa Socket.IO Gateway
const socketGateway = new SocketGateway(app);
console.info("✅ Socket.IO Gateway inicializado");

// Start server
const start = async () => {
  try {
    // Register routes (passa socketGateway para as rotas)
    await registerRoutes(app, socketGateway);

    await app.listen({
      port: config.server.port,
      host: config.server.host,
    });

    console.info(
      `🚀 Server is running on http://${config.server.host}:${config.server.port}`
    );
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Inicia o servidor
void start();
