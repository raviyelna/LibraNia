import { Link } from 'react-router-dom';
import { Brain, Search, Network, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function Home() {
  return (
    <div className="h-full overflow-y-auto scrollable">
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-primary/10 rounded-2xl">
            <Brain className="w-16 h-16 text-primary" />
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-bold text-foreground leading-tight">
          Your AI-Powered
          <br />
          <span className="text-primary">Knowledge Network</span>
        </h1>

        {/* Description */}
        <p className="text-xl md:text-2xl text-secondary max-w-2xl mx-auto leading-relaxed">
          LibraNia transforms information into interconnected knowledge. Ask questions, get verified answers, visualize connections.
        </p>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 pt-8 max-w-3xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg hover:bg-muted transition-colors duration-200">
            <Search className="w-10 h-10 text-primary" />
            <h3 className="font-semibold text-foreground">AI Research</h3>
            <p className="text-sm text-secondary">Multi-model verification ensures trustworthy answers</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg hover:bg-muted transition-colors duration-200">
            <Network className="w-10 h-10 text-primary" />
            <h3 className="font-semibold text-foreground">Neural Graph</h3>
            <p className="text-sm text-secondary">Visualize knowledge as 3D interconnected nodes</p>
          </div>
          <div className="flex flex-col items-center text-center space-y-3 p-6 rounded-lg hover:bg-muted transition-colors duration-200">
            <Sparkles className="w-10 h-10 text-primary" />
            <h3 className="font-semibold text-foreground">Local-First</h3>
            <p className="text-sm text-secondary">Your data stays on your machine, always</p>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/chat">
            <Button size="lg" className="w-full sm:w-auto min-w-[200px]">
              Start Exploring
            </Button>
          </Link>
          <Link to="/library">
            <Button variant="outline" size="lg" className="w-full sm:w-auto min-w-[200px]">
              View Library
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-20 text-center text-sm text-secondary">
        <p>Press <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono">Cmd+K</kbd> for quick navigation</p>
      </div>
      </div>
    </div>
  );
}
