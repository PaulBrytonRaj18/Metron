/**
 * Metron Cloud Sync & Conflict Resolution Engine (Phase 9)
 * Manages background and on-demand synchronization between SQLite and Supabase/Backend.
 * Implements Last-Write-Wins (LWW) conflict resolution and sync_queue drainage.
 */

import { getDatabase } from "../data/sqlite/database";
import { API_BASE_URL } from "./api";

export interface SyncStats {
  pushedCount: number;
  conflictsCount: number;
  pulledCount: number;
  timestamp: string;
  success: boolean;
  error?: string;
}

interface SyncQueueRow {
  id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  payload_json: string;
  created_at: string;
}

let lastSyncTimestamp: string | null = null;

/**
 * Returns the count of pending mutations in the local sync_queue.
 */
export async function getPendingSyncCount(): Promise<number> {
  try {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sync_queue;"
    );
    return row?.count || 0;
  } catch (err) {
    return 0;
  }
}

/**
 * Returns the timestamp of the last successful cloud sync.
 */
export function getLastSyncTimestamp(): string | null {
  return lastSyncTimestamp;
}

/**
 * Performs bidirectional synchronization:
 * 1. Drains local sync_queue to the cloud with LWW conflict resolution.
 * 2. Pulls remote updates since last sync and reconciles them into local SQLite.
 */
export async function performCloudSync(): Promise<SyncStats> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  let pushed = 0;
  let conflicts = 0;
  let pulled = 0;

  try {
    // ---------------------------------------------------------
    // STEP 1: PUSH LOCAL MUTATIONS (Drain sync_queue)
    // ---------------------------------------------------------
    const pendingItems = await db.getAllAsync<SyncQueueRow>(
      "SELECT id, entity_type, entity_id, action, payload_json, created_at FROM sync_queue ORDER BY id ASC LIMIT 50;"
    );

    if (pendingItems.length > 0) {
      const mutations = pendingItems.map((item) => {
        let payload: any = {};
        try {
          payload = JSON.parse(item.payload_json);
        } catch {
          payload = {};
        }
        return {
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          action: item.action,
          payload,
          client_updated_at: item.created_at,
        };
      });

      const pushRes = await fetch(`${API_BASE_URL}/sync/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ mutations }),
      });

      if (pushRes.ok) {
        const pushData = await pushRes.json();
        pushed = pushData.applied_count || 0;
        conflicts = pushData.conflicts_count || 0;

        // Delete processed mutations from local sync_queue
        const processedIds = pendingItems.map((p) => p.id);
        const placeholders = processedIds.map(() => "?").join(",");
        await db.runAsync(
          `DELETE FROM sync_queue WHERE id IN (${placeholders});`,
          processedIds
        );
      } else {
        console.warn("Cloud sync push encountered server status:", pushRes.status);
      }
    }

    // ---------------------------------------------------------
    // STEP 2: PULL REMOTE UPDATES (Reconcile delta changes)
    // ---------------------------------------------------------
    const pullRes = await fetch(`${API_BASE_URL}/sync/pull`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        since: lastSyncTimestamp || undefined,
      }),
    });

    if (pullRes.ok) {
      const pullData = await pullRes.json();
      const entities = pullData.entities || {};

      // Reconcile each entity group into local SQLite
      for (const [entityType, records] of Object.entries<any[]>(entities)) {
        for (const remote of records) {
          pulled++;
          await reconcileRemoteRecord(db, entityType, remote);
        }
      }

      lastSyncTimestamp = pullData.server_timestamp || now;
    }

    return {
      pushedCount: pushed,
      conflictsCount: conflicts,
      pulledCount: pulled,
      timestamp: now,
      success: true,
    };
  } catch (err: any) {
    console.warn("Cloud sync execution error (device offline or server unreachable):", err.message);
    return {
      pushedCount: pushed,
      conflictsCount: conflicts,
      pulledCount: pulled,
      timestamp: now,
      success: false,
      error: err.message || "Network unreachable",
    };
  }
}

/**
 * Reconciles a remote record into the local SQLite database.
 * If local record exists and remote.updated_at > local.updated_at, applies update.
 */
async function reconcileRemoteRecord(
  db: any,
  entityType: string,
  remote: Record<string, any>
): Promise<void> {
  const entityId = remote.id;
  if (!entityId) return;

  const validTables: Record<string, string> = {
    semesters: "semesters",
    subjects: "subjects",
    chapters: "chapters",
    assignments: "assignments",
    experiments: "experiments",
    exams: "exams",
    tasks: "tasks",
    history: "history",
    academic_events: "academic_events",
  };

  const tableName = validTables[entityType];
  if (!tableName) return;

  try {
    const existing = await db.getFirstAsync(
      `SELECT id, updated_at FROM ${tableName} WHERE id = ?;`,
      [entityId]
    );

    if (existing) {
      const remoteDt = new Date(remote.updated_at || 0).getTime();
      const localDt = new Date(existing.updated_at || 0).getTime();

      // Only overwrite if remote is strictly newer (LWW)
      if (remoteDt > localDt) {
        if (tableName === "tasks") {
          await db.runAsync(
            `UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, is_next_action = ?, updated_at = ? WHERE id = ?;`,
            [
              remote.title || "",
              remote.description || null,
              remote.priority || "medium",
              remote.status || "pending",
              remote.is_next_action ? 1 : 0,
              remote.updated_at,
              entityId,
            ]
          );
        } else if (tableName === "semesters") {
          await db.runAsync(
            `UPDATE semesters SET title = ?, academic_year = ?, semester_number = ?, is_active = ?, updated_at = ? WHERE id = ?;`,
            [
              remote.title || "",
              remote.academic_year || "",
              remote.semester_number || 1,
              remote.is_active ? 1 : 0,
              remote.updated_at,
              entityId,
            ]
          );
        } else if (tableName === "academic_events") {
          await db.runAsync(
            `UPDATE academic_events SET title = ?, start_date = ?, category = ?, google_event_id = ?, updated_at = ? WHERE id = ?;`,
            [
              remote.title || "",
              remote.start_date || "",
              remote.category || "instructional",
              remote.google_event_id || null,
              remote.updated_at,
              entityId,
            ]
          );
        }
      }
    }
  } catch (err) {
    console.warn(`Failed to reconcile remote entity ${tableName}/${entityId}:`, err);
  }
}
