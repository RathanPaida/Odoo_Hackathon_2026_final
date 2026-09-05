import { Queue } from "bullmq";
import { redis } from "@/lib/redis";

export const quoteStateQueue = new Queue("quote-state", { connection: redis });

export async function enqueueQuoteStateChanged(quoteId: string) {
  await quoteStateQueue.add("quoteStateChanged", { quoteId });
}
