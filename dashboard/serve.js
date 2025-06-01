import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";

const fastify = Fastify({ logger: true });

fastify.get("/env.js", (req, reply) => {
  reply.header("Content-Type", "application/javascript; charset=utf8");
  reply.send(`window.API_URL = ${JSON.stringify(process.env.API_URL)}`);
});

fastify.register(fastifyStatic, {
  root: path.join(__dirname, "dist"),
  wildcard: false,
});

fastify.get("*", (req, reply) => {
  reply.header("Content-Type", "text/html; charset=utf8").send(indexContent);
});

fastify.listen({ port: 3002, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    throw err;
  }
  console.log(`Server listening on ${address}`);
});

process.on("SIGTERM", () => {
  fastify.close().then(() => {
    process.exit(0);
  });
});
