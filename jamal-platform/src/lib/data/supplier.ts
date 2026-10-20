import "server-only";
import { asAnon, asSystem } from "@/lib/db";
import { getSupplierProduct, listSupplierOrders, listSupplierProducts } from "@/lib/suppliers/portal";

export const listGovernorates = () =>
  asAnon((tx) => tx.query<{ id: string; name_ar: string }>("select id, name_ar from public.governorates where country_code = 'PS' order by sort_order"));

export const listCategoryOptions = () =>
  asAnon((tx) => tx.query<{ id: string; name_ar: string }>("select id, name_ar from public.categories where is_active order by sort_order, name_ar"));

export const supplierProducts = (supplierId: string) => asSystem((tx) => listSupplierProducts(tx, supplierId));
export const supplierProduct = (supplierId: string, id: string) => asSystem((tx) => getSupplierProduct(tx, supplierId, id));
export const supplierOrders = (supplierId: string) => asSystem((tx) => listSupplierOrders(tx, supplierId));
