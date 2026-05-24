function App() {
  return (
    <div
      className="flex items-center justify-center h-screen"
      data-testid="app-root"
      style={{
        backgroundColor: 'rgb(var(--color-background))',
        color: 'rgb(var(--color-foreground))'
      }}
    >
      <div className="text-center">
        <h1
          className="text-4xl font-bold mb-4"
          style={{ color: 'rgb(var(--color-primary))' }}
        >
          LibraNia
        </h1>
        <p
          className="text-xl"
          style={{ color: 'rgb(var(--color-secondary))' }}
        >
          Knowledge Management System
        </p>
      </div>
    </div>
  );
}

export default App;
