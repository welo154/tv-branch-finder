import branchesData from "./branches.json";

export type Branch = {
  id: number;
  nameEn: string;
  nameAr: string;
  addressEn: string;
  addressAr: string;
  cityEn: string;
  cityAr: string;
  areaEn: string;
  areaAr: string;
  phone: string[];
  email?: string;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string;
  keywords: string[];
};

export const branches = branchesData as Branch[];
export default branches;
