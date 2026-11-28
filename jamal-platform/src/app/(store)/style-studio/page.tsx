import { Suspense } from "react";
import { listProducts } from "@/lib/data/catalog";
import { StyleStudio } from "@/components/catalog/StyleStudio";
import { ProductGridSkeleton } from "@/components/ui/States";
export const metadata = { title: "JAMAL Studio — منسق الإطلالات", description: "اكتشف قطعًا تناسب ميزانيتك وألوانك المفضلة." };
async function Content() {
 const {items} = await listProducts({pageSize:60});
 return <StyleStudio items={items}/>;
}
export default function StudioPage() {
 return <><section className="container-page py-10 md:py-16"><p className="jamal-overline">JAMAL / STYLE STUDIO</p><h1 className="mt-3 text-3xl font-extrabold md:text-5xl">إطلالتك تبدأ من هنا.</h1><p className="mt-3 max-w-xl text-sm leading-8 text-muted">اكتشف القطع المناسبة لمناسبتك وميزانيتك، أو استخرج لونًا من صورة لتجد درجات قريبة.</p></section><Suspense fallback={<div className="container-page"><ProductGridSkeleton count={4}/></div>}><Content/></Suspense></>;
}
