import { headers } from "next/headers";
import PostPageClient from "./PostPageClient";

export const dynamic = "force-dynamic";

export default async function PostPage() {
  const reqHeaders = await headers();
  const stateSlug = reqHeaders.get("x-state-slug");
  const stateName = reqHeaders.get("x-state-name");

  return (
    <PostPageClient
      stateName={stateName ?? undefined}
      stateSlug={stateSlug ?? undefined}
    />
  );
}
