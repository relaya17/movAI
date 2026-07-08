import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "אבטחת מידע",
};

export default function SecurityPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-bold text-white">אבטחת מידע</h1>
      
      <div className="prose prose-invert max-w-none text-neutral-300">
        <p className="lead">
          ב-MoVAI אנו מתייחסים לאבטחת המידע שלכם ברצינות הגבוהה ביותר.
        </p>

        <h2>הצפנת נתונים</h2>
        <p>
          כל התקשורת עם האתר מוצפנת באמצעות TLS 1.3. סיסמאות מאוחסנות באמצעות 
          הצפנת bcrypt עם עלות חישוב גבוהה למניעת התקפות brute-force.
        </p>

        <h2>אימות דו-שלבי</h2>
        <p>
          אנו ממליצים להפעיל אימות דו-שלבי (2FA) לחשבונכם להגנה מוגברת.
        </p>

        <h2>ניטור ובקרה</h2>
        <p>
          המערכות שלנו מנוטרות 24/7 לזיהוי פעילות חשודה. אנו מיישמים 
          rate limiting ומנגנוני הגנה מפני התקפות DDoS.
        </p>

        <h2>תאימות</h2>
        <p>
          אנו פועלים בהתאם לתקני OWASP Top 10 ומבצעים סקירות אבטחה תקופתיות.
        </p>

        <h2>דיווח על חולשות אבטחה</h2>
        <p>
          אם גיליתם חולשת אבטחה, אנא דווחו לנו בכתובת security@relaya.com.
          אנו מתחייבים לטפל בכל דיווח ברצינות.
        </p>

        <p className="mt-8 text-sm text-neutral-500">
          עדכון אחרון: ינואר 2027
        </p>
      </div>
    </div>
  );
}
