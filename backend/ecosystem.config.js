module.exports = {
  apps: [
    {
      name: "restaurant-backend-service",
      script: "./dist/src/server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
