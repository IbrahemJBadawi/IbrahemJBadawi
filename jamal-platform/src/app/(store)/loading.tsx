import { ProductGridSkeleton, Skeleton } from "@/components/ui/States";

export default function Loading() {
  return (
    <div className="container-page py-10">
      <Skeleton className="mb-8 h-8 w-48" />
      <ProductGridSkeleton />
    </div>
  );
}
