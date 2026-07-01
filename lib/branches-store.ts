import { unstable_cache } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { list, put } from "@vercel/blob";
import type { Branch } from "@/data/branches";

const branchesFile = path.join(process.cwd(), "data", "branches.json");
const BLOB_PATHNAME = "branches.json";

function useBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readBranchesFromBlob(): Promise<Branch[] | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
    const blob = blobs.find((item) => item.pathname === BLOB_PATHNAME) ?? blobs[0];
    if (!blob?.url) return null;

    const response = await fetch(blob.url, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as Branch[];
  } catch {
    return null;
  }
}

async function readBranchesFromFile(): Promise<Branch[]> {
  const raw = await fs.readFile(branchesFile, "utf8");
  return JSON.parse(raw) as Branch[];
}

export async function getBranches(): Promise<Branch[]> {
  if (useBlobStorage()) {
    const fromBlob = await readBranchesFromBlob();
    if (fromBlob) return fromBlob;
  }

  return readBranchesFromFile();
}

export const getCachedBranches = unstable_cache(
  async () => getBranches(),
  ["branches-list"],
  { revalidate: 60, tags: ["branches"] }
);

export async function saveBranches(branches: Branch[]): Promise<Branch[]> {
  const payload = JSON.stringify(branches, null, 2);

  if (useBlobStorage()) {
    await put(BLOB_PATHNAME, payload, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return branches;
  }

  try {
    await fs.writeFile(branchesFile, payload, "utf8");
    return branches;
  } catch (error) {
    if (process.env.VERCEL) {
      throw new Error(
        "Cannot save on Vercel without Blob storage. In Vercel → Storage → Create Blob store, then redeploy."
      );
    }
    throw error;
  }
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
