import { redirect } from "next/navigation";

export default function Home() {
  // Automatically sends user to the dashboard
  redirect("/dashboard");
}