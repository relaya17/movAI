import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { uploads } from "./creator";
import { users } from "./auth";

export const contentReportStatusEnum = pgEnum("content_report_status", ["pending", "resolved", "dismissed"]);

/**
 * Persisted trust & safety reports for user uploads (report-actions.ts).
 * Previously this flow only sent an email (sendContentReportEmail) with no
 * durable record and nothing an admin could review from a UI - this table
 * is what /admin/reports reads from, same "real record, not just an email"
 * upgrade dubbing_permission_requests already got.
 */
export const contentReports = pgTable("content_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadId: uuid("upload_id")
    .notNull()
    .references(() => uploads.id, { onDelete: "cascade" }),
  reporterUserId: text("reporter_user_id").references(() => users.id, { onDelete: "set null" }),
  reporterEmail: text("reporter_email"),
  reason: text("reason").notNull(),
  status: contentReportStatusEnum("status").notNull().default("pending"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
