import { redirect } from "next/navigation";

export default function Home() {
  // Later: check sessie → /login of /platform. Voor nu direct het dashboard.
  redirect("/platform");
}
