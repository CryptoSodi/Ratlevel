import { buildApp } from "./app";

const PORT = Number(process.env.PORT ?? 4000);

async function main() {
  const app = await buildApp();
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`RatLevel API listening on http://localhost:${PORT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
