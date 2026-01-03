'use client';

import { useEffect, useState } from "react";

interface LoadingAnimationProps {
  stage: "preparing" | "processing" | "generating";
}

const loadingStages = {
  preparing: {
    title: "Preparing your intake",
    subtitle: "Analyzing your immigration needs",
    progress: 25,
  },
  processing: {
    title: "Researching requirements",
    subtitle: "Searching government sources",
    progress: 65,
  },
  generating: {
    title: "Generating your plan",
    subtitle: "Creating personalized guidance",
    progress: 90,
  },
};

export default function LoadingAnimation({ stage }: LoadingAnimationProps) {
  const [progress, setProgress] = useState(0);
  const currentStage = loadingStages[stage];

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(currentStage.progress);
    }, 300);
    return () => clearTimeout(timer);
  }, [stage, currentStage.progress]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm mx-auto text-center space-y-12">
        {/* Minimal loading spinner */}
        <div className="relative mx-auto w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 border-gray-200"></div>
          <div className="absolute inset-0 rounded-full border-2 border-black border-t-transparent animate-spin"></div>
        </div>

        {/* Clean text */}
        <div className="space-y-3">
          <h2 className="text-lg font-medium text-black">
            {currentStage.title}
          </h2>
          <p className="text-sm text-gray-600">
            {currentStage.subtitle}
          </p>
        </div>

        {/* Minimal progress bar */}
        <div className="w-full max-w-xs mx-auto">
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div 
              className="h-full bg-black rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}