import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  description: "كيف تجمع منصة CityMind Tripoli بياناتك الشخصية وتستخدمها وتحميها، وحقوقك بموجب القانون اللبناني رقم 81/2018.",
};

// Keep in step with PRIVACY_POLICY_VERSION on the API: the accepted version is
// recorded when a resident registers.
const POLICY_VERSION = "2026-09-23";
const CONTROLLER = process.env.NEXT_PUBLIC_DATA_CONTROLLER_NAME || "الجهة المشغّلة لمنصة CityMind Tripoli";
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

function Contact() {
  return CONTACT_EMAIL ? (
    <a className="font-semibold text-teal-700 underline" dir="ltr" href={`mailto:${CONTACT_EMAIL}`}>
      {CONTACT_EMAIL}
    </a>
  ) : (
    <span className="font-semibold">إدارة المنصة</span>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:px-6">
      <main className="mx-auto max-w-3xl space-y-8 rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <header className="space-y-2">
          <p className="text-sm font-semibold uppercase text-teal-700">CityMind Tripoli</p>
          <h1 className="text-2xl font-semibold text-slate-950 sm:text-3xl">سياسة الخصوصية</h1>
          <p className="text-sm text-slate-500">
            الإصدار {POLICY_VERSION}. تشرح هذه الصفحة البيانات التي نجمعها ولماذا، وكيف نحميها، وحقوقك بموجب القانون
            اللبناني رقم 81/2018 المتعلق بالمعاملات الإلكترونية والبيانات ذات الطابع الشخصي.
          </p>
        </header>

        <Section title="من المسؤول عن بياناتك">
          <p>
            المسؤول عن معالجة البيانات في هذه المنصة هو {CONTROLLER}. لأي سؤال أو طلب يتعلق ببياناتك تواصل معنا عبر{" "}
            <Contact />.
          </p>
        </Section>

        <Section title="البيانات التي نجمعها">
          <ul className="list-disc space-y-2 pr-5">
            <li>
              <strong>بيانات الحساب:</strong> الاسم الكامل والبريد الإلكتروني وكلمة المرور. لا نحفظ كلمة المرور نفسها،
              بل بصمة مشفّرة لا يمكن استرجاع كلمة المرور منها.
            </li>
            <li>
              <strong>البلاغات:</strong> العنوان والوصف والفئة ودرجة الخطورة والحي، والموقع الذي تختاره على الخريطة أو
              تشاركه عبر GPS أو تكتبه يدويًا. لا نطلب موقعك إلا عند ضغطك على زر مشاركة الموقع.
            </li>
            <li>
              <strong>الصور:</strong> الصورة التي تختارها تبقى على جهازك كمعاينة فقط؛ نحفظ اسم الملف ونوعه وحجمه، ولا
              تُرفع الصورة نفسها في الإصدار الحالي.
            </li>
            <li>
              <strong>أسئلة المساعد:</strong> نص السؤال بعد حذف أرقام الهاتف وعناوين البريد الإلكتروني منه، والإجابة.
            </li>
            <li>
              <strong>بيانات تقنية وأمنية:</strong> سجل بالعمليات الحساسة (مثل الدخول وتغيير حالة البلاغات) مع البريد
              الإلكتروني لصاحب العملية ووقتها. عنوان IP يُستخدم للحد من محاولات الاختراق ويُحفظ على شكل بصمة غير قابلة
              للعكس، ويظهر في سجلات الخادم لفترة قصيرة لأغراض الأمان.
            </li>
          </ul>
        </Section>

        <Section title="لماذا نستخدمها">
          <ul className="list-disc space-y-2 pr-5">
            <li>لاستلام بلاغاتك ومتابعتها وإحالتها إلى الجهة المختصة في البلدية أو الشرطة أو الصليب الأحمر أو الدفاع المدني.</li>
            <li>لإنشاء حسابك وحمايته، وإرسال رسائل تأكيد البريد وإعادة تعيين كلمة المرور.</li>
            <li>لإعداد إحصاءات مجمّعة عن أحياء طرابلس تساعد في التخطيط، من دون تحديد هوية الأشخاص.</li>
          </ul>
          <p>لا نبيع بياناتك ولا نستخدمها للإعلانات، ولا نستخدم ملفات تتبّع أو تحليلات من جهات خارجية.</p>
        </Section>

        <Section title="من يرى بياناتك">
          <ul className="list-disc space-y-2 pr-5">
            <li>
              <strong>الموظفون المخوّلون فقط:</strong> يرى موظفو البلدية تفاصيل البلاغات، وترى كل جهة طوارئ فئة البلاغات
              الخاصة بها فقط. لا يظهر بريدك الإلكتروني للجهات.
            </li>
            <li>
              <strong>الخريطة العامة:</strong> تعرض موقعًا تقريبيًا (بدقة نحو 100 متر) للبلاغات العامة، ولا تعرض الوصف أو
              اسم صاحب البلاغ. عنوان البلاغ لا يُنشر إلا بعد مراجعة موظف له. بلاغات الحوادث الأمنية والحالات الطبية
              ومخاطر الحريق لا يُنشر موقعها إطلاقًا.
            </li>
            <li>
              <strong>مزوّدو الخدمات:</strong> مزوّد البريد الإلكتروني الذي يرسل رسائل الحساب. وإذا فعّلت الجهة المشغّلة
              مساعدًا ذكيًا مستضافًا (Google Gemini أو OpenAI)، يُرسل إليه نص سؤالك بعد حذف بيانات التواصل منه، من دون
              اسمك أو بريدك.
            </li>
            <li>أي جهة رسمية عندما يفرض القانون ذلك.</li>
          </ul>
        </Section>

        <Section title="مدة الاحتفاظ">
          <ul className="list-disc space-y-2 pr-5">
            <li>الحساب: طالما هو قائم، أو حتى تطلب حذفه.</li>
            <li>البلاغات: كسجلات بلدية وفق سياسة الأرشفة لدى الجهة المشغّلة.</li>
            <li>أسئلة المساعد: تُحذف تلقائيًا بعد المدة التي تحددها الجهة المشغّلة (180 يومًا افتراضيًا).</li>
            <li>بيانات الحد من المحاولات: تُحذف تلقائيًا بعد ساعة تقريبًا.</li>
          </ul>
        </Section>

        <Section title="كيف نحمي بياناتك">
          <p>
            الاتصال بالمنصة مشفّر بالكامل (HTTPS)، وجلسة الدخول محفوظة في ملف تعريف ارتباط محمي لا تستطيع السكربتات
            قراءته، وتنتهي الجلسة تلقائيًا. يقتصر الوصول إلى البيانات على الأدوار المخوّلة، وتُسجَّل العمليات الحساسة.
          </p>
          <p>
            نستخدم ملف تعريف ارتباط واحدًا ضروريًا لتسجيل الدخول فقط، ونحفظ في متصفحك معلومات الجلسة الأساسية (اسمك
            وبريدك ودورك) لتسريع عرض الواجهة، وتُمسح عند تسجيل الخروج. لا نستخدم ملفات ارتباط إعلانية أو تحليلية.
          </p>
        </Section>

        <Section title="حقوقك">
          <p>بموجب القانون رقم 81/2018 يحق لك:</p>
          <ul className="list-disc space-y-2 pr-5">
            <li>معرفة البيانات المحفوظة عنك والحصول على نسخة منها.</li>
            <li>تصحيح البيانات غير الدقيقة.</li>
            <li>طلب حذف حسابك وبياناتك، مع مراعاة ما يجب الاحتفاظ به قانونًا كسجل بلدي.</li>
            <li>الاعتراض على معالجة بياناتك لأسباب مشروعة.</li>
          </ul>
          <p>
            لممارسة أي من هذه الحقوق راسلنا عبر <Contact /> من البريد المسجّل في حسابك. سنرد خلال مدة معقولة وبعد التحقق
            من هويتك.
          </p>
        </Section>

        <Section title="حالات الطوارئ">
          <p>
            المنصة ليست خدمة طوارئ ولا ترسل البلاغات تلقائيًا إلى أي جهة. في حال وجود خطر فوري على الحياة اتصل مباشرة
            بالصليب الأحمر اللبناني (140) أو الدفاع المدني (125) أو قوى الأمن الداخلي (112).
          </p>
        </Section>

        <Section title="التعديلات على هذه السياسة">
          <p>
            إذا غيّرنا هذه السياسة تغييرًا جوهريًا سنحدّث رقم الإصدار أعلاه ونعلمك داخل المنصة قبل تطبيق التغيير.
          </p>
        </Section>

        <footer className="flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-sm">
          <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/">
            العودة إلى CityMind Tripoli
          </Link>
          <Link className="font-semibold text-teal-700 hover:text-teal-800" href="/register">
            إنشاء حساب
          </Link>
        </footer>
      </main>
    </div>
  );
}
