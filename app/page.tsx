import BranchFinder from "@/components/BranchFinder";
import { getCachedBranches } from "@/lib/branches-store";

export const revalidate = 60;

export default async function HomePage() {
  const branches = await getCachedBranches();
  return <BranchFinder initialBranches={branches} />;
}
