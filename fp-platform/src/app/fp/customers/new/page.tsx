import { redirect } from "next/navigation";
import { NewCustomerForm } from "@/components/fp/NewCustomerForm";
import { getCurrentFpUser } from "@/lib/auth";

export default async function NewCustomerPage() {
  const fp = await getCurrentFpUser();
  if (!fp) redirect("/fp/login");

  return <NewCustomerForm fpName={fp.name} />;
}
