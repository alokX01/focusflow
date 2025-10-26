export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Test 1: Basic Colors */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            ✅ Tailwind v4 is Working!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            If you see this styled correctly, your setup is perfect.
          </p>
        </div>

        {/* Test 2: Custom Colors (CSS Variables) */}
        <div className="bg-primary text-primary-foreground rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-2">Primary Color Test</h2>
          <p>This uses CSS variable colors from globals.css</p>
        </div>

        {/* Test 3: shadcn/ui Colors */}
        <div className="bg-card text-card-foreground border border-border rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-2">Card Component Test</h2>
          <p className="text-muted-foreground">
            This uses shadcn/ui color variables
          </p>
        </div>

        {/* Test 4: Grid Pattern */}
        <div className="relative overflow-hidden bg-background rounded-xl p-8 border border-border">
          <div className="absolute inset-0 bg-grid-white/[0.02]" />
          <div className="relative">
            <h2 className="text-2xl font-bold mb-2">Grid Pattern Test</h2>
            <p className="text-muted-foreground">
              You should see a subtle grid pattern in the background
            </p>
          </div>
        </div>

        {/* Test 5: Animations */}
        <div className="bg-accent text-accent-foreground rounded-xl p-6 animate-fade-in">
          <h2 className="text-2xl font-bold mb-2">Animation Test</h2>
          <p>This should have faded in smoothly</p>
        </div>

        {/* Test 6: Hover Effects */}
        <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-4 px-8 rounded-xl transition-all hover:shadow-xl hover:scale-[1.02]">
          Hover Over Me! 🎯
        </button>

        {/* Test 7: Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-secondary text-secondary-foreground rounded-lg p-4">
            <h3 className="font-bold">Box 1</h3>
          </div>
          <div className="bg-secondary text-secondary-foreground rounded-lg p-4">
            <h3 className="font-bold">Box 2</h3>
          </div>
          <div className="bg-secondary text-secondary-foreground rounded-lg p-4">
            <h3 className="font-bold">Box 3</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
