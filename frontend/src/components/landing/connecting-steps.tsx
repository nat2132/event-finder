import React, { useEffect, useRef } from 'react';

interface ConnectingStepsProps {
  steps: number;
  activeStep?: number;
  className?: string;
}

export function ConnectingSteps({ 
  steps = 3, 
  activeStep = -1, 
  className = '' 
}: ConnectingStepsProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const animate = () => {
      if (!svgRef.current) return;
      
      const paths = svgRef.current.querySelectorAll('.connecting-path');
      
      paths.forEach((path, index) => {
        const pathElement = path as SVGPathElement;
        const length = pathElement.getTotalLength();
        
        // Reset the path and make it invisible
        pathElement.style.transition = 'none';
        pathElement.style.strokeDasharray = `${length} ${length}`;
        pathElement.style.strokeDashoffset = `${length}`;
        pathElement.getBoundingClientRect(); // Trigger reflow
        
        // Animate the path
        pathElement.style.transition = `stroke-dashoffset 1.5s ease-in-out ${index * 0.5}s`;
        pathElement.style.strokeDashoffset = '0';
      });
    };
    
    animate();
    
    // Re-animate when activeStep changes
    const interval = setInterval(animate, 5000);
    
    return () => clearInterval(interval);
  }, [activeStep]);

  const renderStepConnections = () => {
    const connections = [];
    
    for (let i = 0; i < steps - 1; i++) {
      connections.push(
        <line
          key={`connection-${i}`}
          className={`connecting-path text-primary ${i < activeStep ? 'active' : ''}`}
          x1={-200 + i * 200}
          y1={30}
          x2={400 + (i + 1) * 200}
          y2={30}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      );
    }
    
    return connections;
  };

  return (
    <div className={`relative w-full ${className}`}>
      <svg 
        ref={svgRef}
        className="w-full h-20 absolute top-0 left-0 z-0"
        viewBox={`0 0 ${steps * 200},100`}
        preserveAspectRatio="xMidYMid meet"
      >
        {renderStepConnections()}
      </svg>
    </div>
  );
}