import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";

const fastify = Fastify({
  // We already get logs from nginx, so disable here
  logger: false,
});

fastify.addHook("preHandler", (req, reply, done) => {
  if (req.url === "/env.js") {
    reply.header("Content-Type", "application/javascript; charset=utf8");
    reply.send(`window.API_URL = ${JSON.stringify(process.env.API_URL)};`);
  }
  done();
});

fastify.register(fastifyStatic, {
  root: path.join(import.meta.dirname, "dist"),
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

process.on("SIGTERM", () => {
  fastify.close().then(() => {
    process.exit(0);
  });
});
