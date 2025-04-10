import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import passport from 'passport';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { checkJwtSecret } from './middleware/checkJwtSecret';
import { apiLimiter, authLimiter } from './middleware/rateLimiter';
import { helmetConfig, additionalSecurityHeaders } from './middleware/security';
import './middleware/passport'; // Import passport configuration

dotenv.config();

const app = express();

// Security middleware
app.use(helmetConfig);
app.use(additionalSecurityHeaders);

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());
app.use(checkJwtSecret);

// Apply rate limiting
app.use('/api/', apiLimiter); // General API rate limiting
app.use('/api/auth/', authLimiter); // Stricter auth route rate limiting

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Finance Tracker API',
      version: '1.0.0',
      description: 'Finance Tracker API Documentation',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Add routes
app.use('/', routes);

// Handle undefined routes
app.use('*', notFound);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});