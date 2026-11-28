import { describe, expect, it } from "vitest";
import { matchCatalog, colorDistance, recommendedSize, type StudioItem } from "@/lib/style-studio";
const item=(id:string, patch:Partial<StudioItem>={}):StudioItem=>({id,slug:id,name_ar:id,category_slug:"women",price:"100",sale_price:null,currency_code:"ILS",colors:["#1d1b18"],availability:"available",is_demo:true,...patch});
const opts={budget:100,currency:"ILS",category:"",color:"#1d1b18",occasion:"daily" as const};
describe("style studio",()=>{
 it("uses sale prices and rejects unavailable or different-currency products",()=>{
  expect(matchCatalog([item("sale",{price:"120",sale_price:"90"}),item("usd",{currency_code:"USD"}),item("out",{availability:"out_of_stock"}),item("expensive",{price:"101"})],opts).map(p=>p.id)).toEqual(["sale"]);
 });
 it("ranks matching colors first and respects categories",()=>{
  expect(matchCatalog([item("light",{colors:["#ffffff"]}),item("dark"),item("bag",{category_slug:"bags"})],{...opts,category:"women"}).map(p=>p.id)).toEqual(["dark","light"]);
 });
 it("does not suggest unavailable sizes or invent measurements",()=>{
  expect(recommendedSize(" m ",[{size:"M",availability:"out_of_stock"},{size:"L",availability:"available"}])).toBeNull();
  expect(recommendedSize(" m ",[{size:"M",availability:"available"}])).toBe("M");
 });
 it("handles invalid hex values",()=>expect(colorDistance("bad","#ffffff")).toBe(Infinity));
});
