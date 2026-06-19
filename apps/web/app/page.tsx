import Link from "next/link";

const citizenActions = [
  {
    title: "الإبلاغ عن ازدحام مروري",
    description: "أرسل بلاغًا عن الازدحام مع الموقع والوصف وصورة اختيارية.",
    href: "/reports",
  },
  {
    title: "الإبلاغ عن حفرة أو ضرر في الطريق",
    description: "بلّغ عن ضرر في الطريق من دون أي تقدير وهمي للعمق أو الحجم.",
    href: "/reports",
  },
  {
    title: "الإبلاغ عن مشكلة نفايات",
    description: "أخبر البلدية بمكان تراكم النفايات أو الحاجة إلى مراجعة الجمع.",
    href: "/reports",
  },
  {
    title: "الإبلاغ عن حادث أمني أو سلامة عامة",
    description: "أرسل وصفًا حذرًا للسلامة العامة لمراجعة البلدية يدويًا.",
    href: "/reports",
  },
  {
    title: "إرشاد مسارات المشي",
    description: "اطّلع على حالة عدم التوفر الحالية والبيانات المطلوبة لإرشاد آمن.",
    href: "/mobility",
  },
  {
    title: "إرشاد المسارات البديلة",
    description: "تحقق من جاهزية التوجيه من دون توصيات مرور حيّة وهمية.",
    href: "/mobility",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-6">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase text-teal-700">واجهة المواطن</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
            خدمات المواطنين في CityMind Tripoli
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-700">
            بلّغ عن مشكلة في المدينة من هاتفك، ويمكنك إرفاق صورة أو مشاركة موقع GPS مؤقتًا، ثم تحصل على تأكيد واضح للبلاغ.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-teal-700 px-5 text-base font-semibold text-white hover:bg-teal-800"
            href="/reports"
          >
            بلّغ عن مشكلة
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 px-5 text-base font-semibold text-slate-800 hover:bg-slate-50"
            href="/map"
          >
            عرض الخريطة العامة
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="إجراءات المواطن">
        {citizenActions.map((action) => (
          <Link
            className="min-h-32 rounded-md border border-slate-200 bg-white p-4 shadow-sm hover:border-teal-300 hover:shadow-md"
            href={action.href}
            key={action.title}
          >
            <h2 className="text-lg font-semibold text-slate-950">{action.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        تحليل الصور بالذكاء الاصطناعي ونماذج المرور والتوجيه الرسمي وبيانات الحرارة والظل وجودة الأرصفة غير مهيأة بعد. البيانات التجريبية معلّمة بوضوح ولا يجب اعتبارها إرشادًا بلديًا رسميًا.
      </section>
    </div>
  );
}
