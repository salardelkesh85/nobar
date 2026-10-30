import { cityName, LISTINGS, provinceOfCity, SHOP_TYPE_FA, SHOPS } from "@nobar/demo";
import { formatFaNumber } from "@nobar/fa";
import { Badge, RatingStars } from "@nobar/ui";
import type { Metadata } from "next";
import { Table } from "@/components/shell";

export const metadata: Metadata = { title: "غرفه‌ها" };

export default function ShopsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">غرفه‌ها</h1>
      <Table head={["غرفه", "نوع", "شهر", "آگهی", "امتیاز", "لغو ۹۰ روز", "مهلت تأیید", "وضعیت"]}>
        {SHOPS.map((s) => (
          <tr key={s.id}>
            <td className="font-bold">{s.name}</td>
            <td>{SHOP_TYPE_FA[s.type]}</td>
            <td>{cityName(s.cityId)}، {provinceOfCity(s.cityId)?.name}</td>
            <td>{formatFaNumber(LISTINGS.filter((l) => l.shopId === s.id).length)}</td>
            <td><RatingStars value={s.ratingAvg} count={s.ratingCount} className="text-xs" /></td>
            <td>{s.cancellations90d > 2 ? <Badge tone="warn">{formatFaNumber(s.cancellations90d)}</Badge> : formatFaNumber(s.cancellations90d)}</td>
            <td>{formatFaNumber(s.acceptanceSlaHours)} ساعت</td>
            <td><Badge tone="brand">فعال</Badge></td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
