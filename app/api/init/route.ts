// In app/api/init/route.ts
import { createIndexes } from "@/lib/mongodb-indexes";

export async function GET() {
  await createIndexes();
  return Response.json({ success: true });
}
