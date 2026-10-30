import { cityName, commissionOf, itemsTotal, METHOD_FA, SHOP_ORDERS, SHOP_ORDER_STATUS_FA, SHOP_ORDER_TONE, shopById } from "@nobar/demo";
import { Badge, JalaliDate, Toman } from "@nobar/ui";
import type { Metadata } from "next";
import { Table } from "@/components/shell";

export const metadata: Metadata = { title: "سفارش‌ها" };

export default function OrdersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">سفارش‌ها</h1>
      <Table head={["کد", "تاریخ", "غرفه", "مقصد", "ارسال", "کالا", "کمیسیون", "وضعیت"]}>
        {SHOP_ORDERS.map((o) => (
          <tr key={o.code}>
            <td dir="ltr" className="text-end">{o.code}</td>
            <td><JalaliDate date={o.placedAt} format="short" /></td>
            <td>{shopById(o.shopId)?.name}</td>
            <td>{cityName(o.destCityId)}</td>
            <td>{METHOD_FA[o.method]}</td>
            <td><Toman rial={itemsTotal(o)} /></td>
            <td><Toman rial={commissionOf(o)} /></td>
            <td><Badge tone={SHOP_ORDER_TONE[o.status]}>{SHOP_ORDER_STATUS_FA[o.status]}</Badge></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
