import { useEffect, useState } from "react";
import { listReviews, listApproved, subscribe, type Review } from "@/services/reviews-store";

/** Todas as avaliações (admin). */
export function useReviews(): Review[] {
  const [list, setList] = useState<Review[]>(listReviews);
  useEffect(() => subscribe(() => setList(listReviews())), []);
  return list;
}
/** Só avaliações aprovadas (landing). */
export function useApprovedReviews(): Review[] {
  const [list, setList] = useState<Review[]>(listApproved);
  useEffect(() => subscribe(() => setList(listApproved())), []);
  return list;
}
