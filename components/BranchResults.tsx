import { BranchCard } from "@/components/BranchCard";
import type { BranchWithDistance } from "@/lib/distance";
import type { Language } from "@/lib/translations";

type Props = {
  branches: BranchWithDistance[];
  language: Language;
  featuredCount?: number;
};

export function BranchResults({ branches, language, featuredCount = 0 }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {branches.map((branch, index) => (
        <BranchCard key={branch.id} branch={branch} language={language} featured={index < featuredCount} />
      ))}
    </div>
  );
}
