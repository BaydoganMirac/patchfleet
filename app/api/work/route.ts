import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { readProjection } from "@/lib/runtime/observation-store.mjs";
import { readLocalForm } from "@/lib/runtime/local-form.mjs";
import {
  applyWorkCommand,
  applyWorkControlCommand,
} from "@/lib/runtime/work-queue.mjs";

const SHAPES = {
  enqueue: ["action", "commandId", "createdAt", "expiresAt", "title", "instruction", "workingDirectory"],
  remove: ["action", "commandId", "createdAt", "expiresAt", "workItemId", "expectedItemRevision"],
  start: ["action", "commandId", "createdAt", "expiresAt", "workItemId", "expectedItemRevision"],
  cancel: ["action", "commandId", "createdAt", "expiresAt", "runId", "expectedRunRevision"],
};
const COMMAND_ID = /^cmd:[0-9a-f-]{36}$/;

function number(value: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new TypeError("invalid revision");
  return parsed;
}

function base(form: Record<string, string>, type: string) {
  if (!COMMAND_ID.test(form.commandId)) throw new TypeError("invalid command id");
  return {
    schemaVersion: 1,
    intentId: form.commandId,
    idempotencyKey: form.commandId,
    type,
    actorId: "local-owner",
    createdAt: form.createdAt,
    expiresAt: form.expiresAt,
  };
}

async function codexAvailable() {
  const projection = await readProjection();
  return projection?.observations.some(
    (item: { provider: { id: string; state: string } }) =>
      item.provider.id === "codex" && item.provider.state === "available",
  ) ?? false;
}

export async function POST(request: NextRequest) {
  let form: Record<string, string>;
  try {
    form = await readLocalForm(request, SHAPES) as Record<string, string>;
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    if (form.action === "enqueue") {
      await applyWorkCommand({
        ...base(form, "enqueue_work"),
        payload: {
          workItem: {
            schemaVersion: 1,
            workItemId: `work:${form.commandId.slice(4)}`,
            title: form.title,
            instruction: form.instruction,
            providerId: "codex",
            workingDirectory: form.workingDirectory,
            status: "queued",
            createdAt: form.createdAt,
            revision: 1,
          },
        },
      });
    } else if (form.action === "remove") {
      await applyWorkCommand({
        ...base(form, "remove_queued_work"),
        payload: {
          workItemId: form.workItemId,
          expectedItemRevision: number(form.expectedItemRevision),
        },
      });
    } else if (form.action === "start") {
      await applyWorkControlCommand({
        ...base(form, "start_work"),
        payload: {
          workItemId: form.workItemId,
          expectedItemRevision: number(form.expectedItemRevision),
        },
      }, { providerAvailable: await codexAvailable() });
    } else {
      await applyWorkControlCommand({
        ...base(form, "cancel_run"),
        payload: {
          runId: form.runId,
          expectedRunRevision: number(form.expectedRunRevision),
        },
      }, { providerAvailable: await codexAvailable() });
    }
    return NextResponse.redirect(new URL("/", request.headers.get("origin")!), 303);
  } catch (error) {
    if ((error as { outcomeUnknown?: boolean }).outcomeUnknown) {
      return new NextResponse("Codex outcome is pending; retry the same form.", { status: 503 });
    }
    const code = typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "INVALID_COMMAND";
    return new NextResponse(`Local work command failed (${code})`, { status: 400 });
  }
}
