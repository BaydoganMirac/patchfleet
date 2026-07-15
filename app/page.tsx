import { readProjection } from "@/lib/runtime/observation-store.mjs";

export const dynamic = "force-dynamic";

type Session = {
  providerSessionId: string;
  status: "completed" | "failed" | "interrupted" | "running" | "unknown";
  createdAt: string;
  lastObservedAt: string;
  terminalAt?: string;
};

type Projection = {
  provider: {
    state: "available" | "degraded" | "unavailable";
    version: string | null;
    capabilities: { recentObservation: boolean; explicitLiveStatus: boolean };
    error?: { code: string; message: string };
  };
  observedAt: string;
  sessions: Session[];
};

function time(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function shortId(value: string) {
  return value.length > 13 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function providerLabel(state: Projection["provider"]["state"]) {
  if (state === "available") return "Available";
  if (state === "degraded") return "Degraded";
  return "Unavailable";
}

async function loadProjection() {
  try {
    return { kind: "ready" as const, projection: (await readProjection()) as Projection | null };
  } catch {
    return { kind: "fatal" as const };
  }
}

export default async function Home() {
  const result = await loadProjection();

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">Local-only console</p>
          <h1>Patchfleet</h1>
          <p className="summary">
            Honest, restart-safe lifecycle metadata from the supported Codex app-server.
          </p>
        </div>
        <form action="/api/observe" method="post">
          <button type="submit">Refresh Codex</button>
        </form>
      </header>

      {result.kind === "fatal" ? (
        <section className="notice error" aria-labelledby="storage-error" role="alert">
          <h2 id="storage-error">Local storage needs attention</h2>
          <p>The durable observation projection is corrupt. No provider process was started.</p>
        </section>
      ) : result.projection === null ? (
        <section className="notice" aria-labelledby="never-observed">
          <h2 id="never-observed">Codex has not been observed</h2>
          <p>Refresh once to check the installed CLI and store a local snapshot.</p>
        </section>
      ) : (
        <Dashboard projection={result.projection} />
      )}
    </main>
  );
}

function Dashboard({ projection }: { projection: Projection }) {
  const { provider, sessions } = projection;
  return (
    <>
      <section className="provider" aria-labelledby="provider-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Provider</p>
            <h2 id="provider-title">Codex</h2>
          </div>
          <span className={`badge ${provider.state}`}>{providerLabel(provider.state)}</span>
        </div>
        <dl>
          <div>
            <dt>CLI version</dt>
            <dd>{provider.version ?? "Not available"}</dd>
          </div>
          <div>
            <dt>Recent observation</dt>
            <dd>{provider.capabilities.recentObservation ? "Supported" : "Unavailable"}</dd>
          </div>
          <div>
            <dt>Explicit live status</dt>
            <dd>{provider.capabilities.explicitLiveStatus ? "Supported" : "Unavailable"}</dd>
          </div>
        </dl>
        {provider.error ? (
          <p className="safe-error" role="status">
            {provider.error.message} <code>{provider.error.code}</code>
          </p>
        ) : null}
        <p className="snapshot">
          Stored local snapshot from <time dateTime={projection.observedAt}>{time(projection.observedAt)}</time>.
          It is not a live feed and remains available after restart.
        </p>
      </section>

      <section aria-labelledby="sessions-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Most recent</p>
            <h2 id="sessions-title">Codex sessions</h2>
          </div>
          <span className="count">{sessions.length} / 20</span>
        </div>
        {sessions.length === 0 ? (
          <p className="empty">No recent interactive sessions were returned.</p>
        ) : (
          <ul className="sessions">
            {sessions.map((session) => (
              <li key={session.providerSessionId}>
                <div>
                  <code>{shortId(session.providerSessionId)}</code>
                  <p>
                    Created <time dateTime={session.createdAt}>{time(session.createdAt)}</time>
                  </p>
                </div>
                <div className="session-state">
                  <span className={`badge ${session.status}`}>{session.status}</span>
                  <small>
                    {session.status === "unknown" ? "Live status not observed" : `Observed ${time(session.lastObservedAt)}`}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
