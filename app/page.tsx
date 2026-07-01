import BranchFinder from "@/components/BranchFinder";
import { getBranches } from "@/lib/branches-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const branches = await getBranches();
  return <BranchFinder initialBranches={branches} />;
}
