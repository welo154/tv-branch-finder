import { unstable_cache } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import type { Branch } from "@/data/branches";

const branchesFile = path.join(process.cwd(), "data", "branches.json");

export async function getBranches(): Promise<Branch[]> {
  const raw = await fs.readFile(branchesFile, "utf8");
  return JSON.parse(raw) as Branch[];
}

export const getCachedBranches = unstable_cache(
  async () => getBranches(),
  ["branches-list"],
  { revalidate: 60, tags: ["branches"] }
);

export async function saveBranches(branches: Branch[]): Promise<Branch[]> {
  await fs.writeFile(branchesFile, JSON.stringify(branches, null, 2), "utf8");
  return branches;
}

export async function getBranchById(id: number): Promise<Branch | undefined> {
  const branches = await getBranches();
  return branches.find((branch) => branch.id === id);
}

export async function upsertBranch(branch: Branch): Promise<Branch[]> {
  const branches = await getBranches();
  const index = branches.findIndex((item) => item.id === branch.id);

  if (index === -1) {
    branches.push(branch);
  } else {
    branches[index] = branch;
  }

  return saveBranches(branches);
}

export async function deleteBranch(id: number): Promise<Branch[]> {
  const branches = await getBranches();
  return saveBranches(branches.filter((branch) => branch.id !== id));
}

export function getNextBranchId(branches: Branch[]): number {
  return branches.reduce((max, branch) => Math.max(max, branch.id), 0) + 1;
}
