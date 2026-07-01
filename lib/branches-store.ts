import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { promises as fs } from "fs";
import path from "path";
import { get, list, put } from "@vercel/blob";
import type { Branch } from "@/data/branches";

const branchesFile = path.join(process.cwd(), "data", "branches.json");
const BLOB_PATHNAME = "branches.json";

function useBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readBranchesFromBlob(): Promise<Branch[] | null> {
  try {
    const result = await get(BLOB_PATHNAME, { access: "private" });
    if (result?.statusCode !== 200 || !result.stream) return null;

    const raw = await new Response(result.stream).text();
    return JSON.parse(raw) as Branch[];
  } catch {
    try {
      const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
      if (!blobs.length) return null;
      const fallback = await get(blobs[0].pathname, { access: "private" });
      if (fallback?.statusCode !== 200 || !fallback.stream) return null;
      const raw = await new Response(fallback.stream).text();
      return JSON.parse(raw) as Branch[];
    } catch {
      return null;
    }
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
      access: "private",
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

export function invalidateBranchesCache(): void {
  revalidateTag("branches");
  revalidatePath("/");
}
