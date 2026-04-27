import { PrismaClient, type Prisma } from "../app/generated/prisma/client";
import { IngressSource } from "../app/generated/prisma/enums";

type CliOptions = {
  limit: number;
  onlyUnprocessed: boolean;
  source?: IngressSource;
  showPayload: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  const limitArg = argv.find((arg) => arg.startsWith("--limit="));
  const sourceArg = argv.find((arg) => arg.startsWith("--source="));

  const limit = Math.max(1, Number(limitArg?.split("=")[1] ?? 10));
  const onlyUnprocessed = argv.includes("--unprocessed");
  const showPayload = argv.includes("--payload");

  const rawSource = sourceArg?.split("=")[1]?.toUpperCase();
  const source = rawSource && rawSource in IngressSource ? (rawSource as IngressSource) : undefined;

  return { limit, onlyUnprocessed, source, showPayload };
}

function compactSummary(payload: unknown) {
  const event = (payload ?? {}) as Record<string, any>;

  return {
    idempotencyKey: event.idempotencyKey ?? null,
    uniqueKey: event.uniqueKey ?? null,
    amount: event.amount ?? null,
    jobDateTime: event.jobDateTime ?? null,
    documentType: event.documentType?.title ?? null,
    storeId: event.store?.id ?? null,
    storeName: event.store?.title ?? null,
    rowsCount: Array.isArray(event.rows) ? event.rows.length : 0,
    paymentsCount: Array.isArray(event.payments) ? event.payments.length : 0,
  };
}

async function main() {
  const prisma = new PrismaClient();
  const options = parseArgs(process.argv.slice(2));

  const where: Prisma.IngressEventWhereInput = {};
  if (options.onlyUnprocessed) {
    where.processedAt = null;
  }
  if (options.source) {
    where.source = options.source;
  }

  console.log("\nInspect ingress_events");
  console.log(`- limit: ${options.limit}`);
  console.log(`- unprocessed only: ${options.onlyUnprocessed ? "yes" : "no"}`);
  console.log(`- source: ${options.source ?? "all"}`);
  console.log(`- payload dump: ${options.showPayload ? "yes" : "no"}`);

  const events = await prisma.ingressEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: options.limit,
  });

  if (events.length === 0) {
    console.log("\nNo ingress events found with current filters.");
    await prisma.$disconnect();
    return;
  }

  console.log(`\nFound ${events.length} events:\n`);

  events.forEach((event, index) => {
    const summary = compactSummary(event.payload);

    console.log(`[${index + 1}] id=${event.id}`);
    console.log(`  source=${event.source} createdAt=${event.createdAt.toISOString()} processedAt=${event.processedAt ? event.processedAt.toISOString() : "null"}`);
    console.log(`  summary=${JSON.stringify(summary)}`);

    if (options.showPayload) {
      console.log("  payload=");
      console.log(JSON.stringify(event.payload, null, 2));
    }

    console.log("");
  });

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("Failed to inspect ingress events:", error);
  process.exitCode = 1;
});
