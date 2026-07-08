export const metadata = { title: "הצהרת נגישות" };

export default function AccessibilityPage(): React.ReactElement {
  return (
    <>
      <h1>הצהרת נגישות</h1>
      <p>
        אתר MoVAI פועל להנגשה בהתאם לתקן WCAG 2.1 ברמה AA ולתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות
        לשירות), התשע"ג-2013.
      </p>

      <h2>אמצעי נגישות שיושמו</h2>
      <ul className="list-disc pr-5">
        <li>ניווט מלא במקלדת, כולל דילוג לתוכן הראשי</li>
        <li>טקסט חלופי (alt) משמעותי לכל תמונה/פוסטר</li>
        <li>ניגודיות צבעים בהתאם לתקן AA</li>
        <li>כיבוד הגדרת prefers-reduced-motion</li>
        <li>תמיכה בכתוביות לתוכן וידאו כשהמקור מספק אותן</li>
      </ul>

      <h2>פנייה בנושא נגישות</h2>
      <p>נתקלתם בבעיית נגישות? נשמח לתיקון - צרו קשר בכתובת [accessibility@ תתעדכן].</p>
    </>
  );
}
