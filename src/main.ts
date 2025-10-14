import Fastify from "fastify";
import { config } from "@config/index";
import { registerRoutes } from "@presentation/routes";

const app = Fastify({
  logger: {
    level: config.server.env === "development" ? "info" : "error",
  },
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
