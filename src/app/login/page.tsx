import { redirect } from "next/navigation";

export default function LoginRedirect({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => query.append(key, v));
    }
  }
  const queryString = query.toString();
  redirect(`/auth/login${queryString ? `?${queryString}` : ""}`);
}
