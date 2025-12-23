import { redirect } from "next/navigation";

import { AuthedHome } from "@/components/AuthedHome";
import { getAuthenticatedUser } from "@/server/auth/session";

export default async function Home() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth");
  }

  return <AuthedHome />;
}
