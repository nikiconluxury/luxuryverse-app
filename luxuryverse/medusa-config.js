const dotenv = require("dotenv")
const path = require("path")

let ENV_FILE_NAME = ""
switch (process.env.NODE_ENV) {
  case "production":
    ENV_FILE_NAME = ".env.production"
    break
  case "staging":
    ENV_FILE_NAME = ".env.staging"
    break
  case "test":
    ENV_FILE_NAME = ".env.test"
    break
  case "development":
  default:
    ENV_FILE_NAME = ".env"
    break
}

try {
  dotenv.config({ path: path.join(process.cwd(), ENV_FILE_NAME) })
  console.log(process.env.SENDGRID_API_KEY)
} catch (e) {
  console.log("Error loading .env file:", e)
}

// const ADMIN_CORS = process.env.ADMIN_CORS || "http://localhost:7000,http://localhost:7001"
// const ADMIN_CORS = process.env.ADMIN_CORS || "http://localhost:9000"
const ADMIN_CORS = process.env.ADMIN_CORS || "http://localhost:9000"
const STORE_CORS = process.env.STORE_CORS || "http://localhost:8000"
const DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost/medusa-starter-default"

/** @type {import('@medusajs/medusa').ConfigModule} */
module.exports = {
  projectConfig: {
    redis_url: process.env.REDIS_URL,
    database_url: DATABASE_URL,
    database_type: "postgres",
    store_cors: STORE_CORS,
    admin_cors: ADMIN_CORS,
    redis_url: process.env.REDIS_URL,
    database_extra:
      process.env.NODE_ENV !== "development"
        ? { ssl: { rejectUnauthorized: false } }
        : {},
  },
  plugins: [
    `medusa-fulfillment-manual`,
    `medusa-payment-manual`,
    {
      resolve: `@medusajs/file-local`,
      options: {
        upload_dir: "uploads",
      },
    },
    {
      resolve: "@medusajs/admin",
      /** @type {import('@medusajs/admin').PluginOptions} */
      options: {
        autoRebuild: true,
        develop: {
          open: process.env.OPEN_BROWSER !== "false",
        },
      },
    },
    // {
    //   resolve: `medusa-plugin-algolia`,
    //   options: {
    //     applicationId: process.env.ALGOLIA_APP_ID || "H5TUZTZ3T8",
    //     adminApiKey: process.env.ALGOLIA_ADMIN_API_KEY || "5bd929fe0c5b9a09583feab9bb3d8e09",
    //     settings: {
    //       products: {
    //         indexSettings: {
    //           searchableAttributes: ["title", "description","subtitle"],
    //           attributesToRetrieve: [
    //             "id",
    //             "title",
    //             "subtitle",
    //             "description",
    //             "handle",
    //             "options",
    //             "images",
    //           ],
    //         },},},  
    //   },
    // },
  ],
  modules: {
    eventBus: {
      resolve: '@medusajs/event-bus-redis',
      options: {
        redisUrl: process.env.REDIS_URL
      }
    },
    cacheService: {
      resolve: '@medusajs/cache-redis',
      options: {
        redisUrl: process.env.REDIS_URL,
        ttl: 30,
      }
    }
  },
  featureFlags: {
    product_categories: true,
  },
}

// Custom loader for CryptAPI
module.exports.loaders = [
  {
    resolve: 'cryptapiLoader',
    loader: async (container, options) => {
      await require('./src/loaders/eth')(container, options)
    },
  },
]