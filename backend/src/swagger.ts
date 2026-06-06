import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Express } from "express";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Restaurant POS API",
      version: "1.0.0",
      description: "REST API endpoints for the Restaurant Admin POS application, including tables, menu, orders, payments, reports, and administrative functions.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development Server",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
          description: "Traffic filtering key for mobile client endpoints",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Access token JWT for administrative endpoints",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./dist/src/routes/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("Swagger API docs initialized at /api-docs");
}
