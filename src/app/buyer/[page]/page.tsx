import type { Metadata } from "next";
import { RoleModulePage } from "@/components/RoleModulePage";

type Props = {
  params: { page: string };
  searchParams: Record<string, string | string[] | undefined>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `${params.page.replace(/-/g, " ")} | Kasafide` };
}

export default function BuyerModuleRoute({ params, searchParams }: Props) {
  return <RoleModulePage role="buyer" page={params.page} searchParams={searchParams} />;
}
