import { ok, toErrorResponse } from "@/lib/api";
import { getProfile, saveProfile } from "@/lib/store";
import { profileSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { profile, exists } = await getProfile();
    return ok({ profile, exists });
  } catch (e) {
    return toErrorResponse(e);
  }
}

export async function PUT(req: Request) {
  try {
    const data = profileSchema.parse(await req.json());
    await saveProfile(data);
    return ok({ profile: data });
  } catch (e) {
    return toErrorResponse(e);
  }
}
