import { Button } from "@/components/ui/button";

export default function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_2123_1707)">
              <path d="M50 102C50 121.891 57.9018 140.968 71.967 155.033C86.0322 169.098 105.109 177 125 177C144.891 177 163.968 169.098 178.033 155.033C192.098 140.968 200 121.891 200 102L50 102Z" fill="currentColor"/>
              <path d="M0 98C0 78.1088 7.90176 59.0322 21.967 44.967C36.0322 30.9018 55.1088 23 75 23C94.8912 23 113.968 30.9018 128.033 44.967C142.098 59.0322 150 78.1088 150 98L0 98Z" fill="currentColor"/>
            </g>
            <defs>
              <clipPath id="clip0_2123_1707">
                <rect width="200" height="200" fill="currentColor"/>
              </clipPath>
            </defs>
          </svg>
          <span className="text-lg font-instrument font-semibold">BureauAI</span>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a 
            href="#pricing" 
            className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
          >
            Pricing
          </a>
          <a 
            href="#company" 
            className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
          >
            Company
          </a>
          <a 
            href="#careers" 
            className="text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
          >
            Careers
          </a>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="outline" className="bg-card">
            Log in
          </Button>
          <Button>
            Sign up
          </Button>
        </div>
      </div>
    </header>
  );
}
