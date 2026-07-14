export default function Home() {
  return (
    <main>
      <p className="eyebrow">Local-only console</p>
      <h1>Patchfleet</h1>
      <p className="summary">
        This secure shell is ready on your machine. Provider observation and
        controls have not been implemented yet.
      </p>
      <section aria-labelledby="foundation-status">
        <h2 id="foundation-status">Foundation status</h2>
        <p>
          The console accepts loopback requests only and does not connect to
          Patchfleet Cloud.
        </p>
      </section>
    </main>
  );
}
