/**
 * ScoreGauge Component
 * Radial progress gauge with animated score display
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/card';

// ============================================================================
// INTERFACES
// ============================================================================

interface ScoreGaugeProps {
  percentage: number;
  grade: string;
  gradeName: string;
  confidence: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  percentage,
  grade,
  gradeName,
  confidence,
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);

  /**
   * Animate percentage on mount/change
   */
  useEffect(() => {
    const duration = 1500; // 1.5 seconds
    const steps = 60;
    const increment = percentage / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;

      if (step >= steps) {
        setAnimatedPercentage(percentage);
        clearInterval(timer);
      } else {
        setAnimatedPercentage(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [percentage]);

  /**
   * Get color based on grade
   */
  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A':
        return '#10b981'; // green-500
      case 'B':
        return '#3b82f6'; // blue-500
      case 'C':
        return '#f59e0b'; // amber-500
      case 'D':
        return '#f97316'; // orange-500
      case 'F':
        return '#ef4444'; // red-500
      default:
        return '#6366f1'; // indigo-500
    }
  };

  const color = getGradeColor(grade);
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardContent className="py-8">
        <div className="flex flex-col items-center">
          {/* Radial Progress */}
          <div className="relative w-[200px] h-[200px]">
            <svg
              className="transform -rotate-90"
              width="200"
              height="200"
              viewBox="0 0 200 200"
            >
              {/* Background Circle */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-800"
              />

              {/* Progress Circle */}
              <motion.circle
                cx="100"
                cy="100"
                r={radius}
                stroke={color}
                strokeWidth="12"
                fill="transparent"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </svg>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-5xl font-bold text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {animatedPercentage}%
              </motion.span>
              <motion.span
                className="text-xl font-medium mt-1"
                style={{ color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Grade {grade}
              </motion.span>
            </div>
          </div>

          {/* Grade Name */}
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <p className="text-2xl font-bold text-white">{gradeName}</p>
            <p className="text-sm text-slate-400 mt-2">
              AI Confidence: <span className="font-medium text-slate-300">{confidence}%</span>
            </p>
          </motion.div>

          {/* Performance Indicator */}
          <motion.div
            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-full"
            style={{
              backgroundColor: `${color}15`,
              borderColor: `${color}30`,
              borderWidth: 1,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.2 }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-medium" style={{ color }}>
              {percentage >= 85
                ? 'Excellent Performance'
                : percentage >= 70
                ? 'Good Performance'
                : percentage >= 55
                ? 'Average Performance'
                : percentage >= 40
                ? 'Needs Improvement'
                : 'Poor Performance'}
            </span>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScoreGauge;
