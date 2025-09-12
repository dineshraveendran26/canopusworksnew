export default function AuthCodeError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold">Authentication Error</h2>
        <p className="text-muted-foreground">
          There was an error processing your authentication request. 
          The link may have expired or is invalid.
        </p>
        <a 
          href="/" 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Return Home
        </a>
      </div>
    </div>
  )
}
