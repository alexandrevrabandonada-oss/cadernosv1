const isAdminEnabled =
  process.env.NEXT_PUBLIC_ADMIN_ENABLED === 'true' || process.env.ADMIN_ENABLED === 'true';

export default function AdminPage() {
  if (!isAdminEnabled) {
    return (
      <main>
        <section className='card stack'>
          <h1 style={{ margin: 0 }}>Admin desabilitado</h1>
          <p style={{ margin: 0 }}>
            Ative <code>NEXT_PUBLIC_ADMIN_ENABLED=true</code> (ou <code>ADMIN_ENABLED=true</code>) para exibir a
            area admin.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className='card stack'>
        <h1 style={{ margin: 0 }}>Admin</h1>
        <p style={{ margin: 0 }}>Placeholder da area administrativa protegida por feature flag.</p>
      </section>
    </main>
  );
}