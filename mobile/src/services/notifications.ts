/**
 * Metron State-Aware Notification Engine
 * Sourced directly from PRD Section 17 and TAD Section 12.
 *
 * Implements multi-tier escalation (3 days, 1 day, day-of) and
 * STATE-AWARE CANCELLATION:
 * When an assignment is marked submitted/graded, or a task is completed,
 * all pending reminder alerts for that entity are immediately purged.
 */

export type NotificationUrgency = "info" | "warning" | "urgent";

export interface ScheduledReminder {
  id: string;
  entityId: string;
  entityType: "assignment" | "experiment" | "task" | "exam";
  title: string;
  body: string;
  triggerDate: string;
  urgency: NotificationUrgency;
  isCancelled: boolean;
}

class NotificationService {
  private scheduledReminders: Map<string, ScheduledReminder> = new Map();

  /**
   * Schedules a multi-tier reminder for an upcoming academic milestone/task.
   */
  scheduleMilestoneReminders(params: {
    entityId: string;
    entityType: "assignment" | "experiment" | "task" | "exam";
    title: string;
    dueDate: string;
    courseCode?: string;
  }) {
    const { entityId, entityType, title, dueDate, courseCode } = params;
    const dueTime = new Date(dueDate).getTime();
    if (isNaN(dueTime)) return;

    const prefix = courseCode ? `[${courseCode}] ` : "";

    // Tier 1: 3 Days Before (Informational)
    const tMinus3 = new Date(dueTime - 3 * 24 * 60 * 60 * 1000).toISOString();
    this.addReminder({
      id: `rem_${entityId}_t3`,
      entityId,
      entityType,
      title: `${prefix}Approaching Deadline (3 Days)`,
      body: `"${title}" is due in 3 days. Begin drafting to avoid last-minute stress.`,
      triggerDate: tMinus3,
      urgency: "info",
      isCancelled: false,
    });

    // Tier 2: 1 Day Before (Warning)
    const tMinus1 = new Date(dueTime - 1 * 24 * 60 * 60 * 1000).toISOString();
    this.addReminder({
      id: `rem_${entityId}_t1`,
      entityId,
      entityType,
      title: `${prefix}Urgent Deadline (Tomorrow)`,
      body: `"${title}" is due tomorrow! Complete and turn in soon.`,
      triggerDate: tMinus1,
      urgency: "warning",
      isCancelled: false,
    });

    // Tier 3: Morning Of (Urgent Focus)
    const dayOf = new Date(dueTime).toISOString();
    this.addReminder({
      id: `rem_${entityId}_t0`,
      entityId,
      entityType,
      title: `${prefix}Due Today!`,
      body: `"${title}" submission deadline is today. Verify file upload / turn-in.`,
      triggerDate: dayOf,
      urgency: "urgent",
      isCancelled: false,
    });
  }

  /**
   * CRITICAL RULE: State-Aware Cancellation.
   * Immediately purges and cancels all pending notifications for an entity
   * as soon as the student marks it submitted, completed, or graded.
   */
  cancelRemindersForEntity(entityId: string): number {
    let cancelledCount = 0;
    for (const [id, rem] of this.scheduledReminders.entries()) {
      if (rem.entityId === entityId && !rem.isCancelled) {
        rem.isCancelled = true;
        this.scheduledReminders.delete(id);
        cancelledCount++;
      }
    }
    return cancelledCount;
  }

  /**
   * Returns all currently active (non-cancelled) reminders.
   */
  getActiveReminders(): ScheduledReminder[] {
    return Array.from(this.scheduledReminders.values()).filter((r) => !r.isCancelled);
  }

  private addReminder(reminder: ScheduledReminder) {
    this.scheduledReminders.set(reminder.id, reminder);
  }
}

export const notifications = new NotificationService();
