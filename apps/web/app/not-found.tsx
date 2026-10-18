import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <p className="text-sm font-bold text-teal-700">404</p>
      <h1 className="text-xl font-bold text-slate-950">الصفحة غير موجودة</h1>
      <p className="text-sm leading-6 text-slate-600">
        الرابط الذي فتحته غير متاح في CityMind Tripoli. تحقق من العنوان أو عد إلى الصفحة الرئيسية.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link className="city-primary-button" href="/">
          الصفحة الرئيسية
        </Link>
        <Link className="city-secondary-button" href="/reports">
          إرسال بلاغ
        </Link>
      </div>
    </div>
  );
}
