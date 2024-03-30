const fastify = require("fastify")({ logger: true });
const fastifyStatic = require("@fastify/static");
const path = require("path");

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "dist"),
  wildcard: false,
});

fastify.get("*", (req, reply) => {
  reply.sendFile("index.html");
});

fastify.listen({ port: 3002, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    throw err;
  }
  console.log(`Server listening on ${address}`);
});
