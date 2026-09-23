/**
 * QuestionBreakdown Component
 * Displays detailed feedback for each question
 */

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import type { QuestionResult } from '../../api/types';

// ============================================================================
// INTERFACES
// ============================================================================

interface QuestionBreakdownProps {
  questions: QuestionResult[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export const QuestionBreakdown: React.FC<QuestionBreakdownProps> = ({ questions }) => {
  /**
   * Get score color and badge
   */
  const getScoreBadge = (earned: number, max: number) => {
    const percentage = (earned / max) * 100;
    
    let colorClass = '';
    let icon = null;

    if (percentage >= 80) {
      colorClass = 'bg-green-500/20 text-green-400 border-green-500/30';
      icon = <CheckCircle2 className="w-4 h-4" />;
    } else if (percentage >= 60) {
      colorClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      icon = <CheckCircle2 className="w-4 h-4" />;
    } else if (percentage >= 40) {
      colorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      icon = <AlertCircle className="w-4 h-4" />;
    } else {
      colorClass = 'bg-red-500/20 text-red-400 border-red-500/30';
      icon = <XCircle className="w-4 h-4" />;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
        {icon}
        {earned} / {max}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white">Question-by-Question Analysis</h3>

      {questions.map((question, index) => (
        <motion.div
          key={question.question_number}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="border-slate-800 bg-slate-900/50 hover:bg-slate-900/70 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-lg">
                  Question {question.question_number}
                </CardTitle>
                {getScoreBadge(question.earned, question.max_marks)}
              </div>
              {question.question && (
                <p className="text-sm text-slate-400 mt-2">{question.question}</p>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Similarity Score */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-300">Similarity</span>
                  <span className="text-sm font-medium text-slate-300">
                    {question.similarity_score}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <motion.div
                    className="h-2 rounded-full"
                    style={{
                      backgroundColor:
                        question.similarity_score >= 80
                          ? '#10b981'
                          : question.similarity_score >= 60
                          ? '#3b82f6'
                          : question.similarity_score >= 40
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${question.similarity_score}%` }}
                    transition={{ duration: 1, delay: index * 0.1 + 0.2 }}
                  />
                </div>
              </div>

              {/* Student Answer */}
              {question.student_answer && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <p className="text-xs font-medium text-slate-400 mb-1">Student Answer:</p>
                  <p className="text-sm text-slate-300">{question.student_answer}</p>
                </div>
              )}

              {/* Feedback */}
              {question.feedback && (
                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <p className="text-xs font-medium text-indigo-400 mb-1">Feedback:</p>
                  <p className="text-sm text-slate-300">{question.feedback}</p>
                </div>
              )}

              {/* Key Points Covered */}
              {question.key_points_covered && question.key_points_covered.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Points Covered:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {question.key_points_covered.map((point, i) => (
                      <li key={i} className="text-sm text-slate-300">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing Points */}
              {question.missing_points && question.missing_points.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Missing Points:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {question.missing_points.map((point, i) => (
                      <li key={i} className="text-sm text-slate-300">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rubric (if available) */}
              {question.rubric && (
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <p className="text-xs text-slate-400">Content Accuracy</p>
                    <p className="text-sm font-medium text-white">
                      {question.rubric.content_accuracy}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Clarity</p>
                    <p className="text-sm font-medium text-white">
                      {question.rubric.clarity}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Examples</p>
                    <p className="text-sm font-medium text-white">
                      {question.rubric.examples}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Depth</p>
                    <p className="text-sm font-medium text-white">
                      {question.rubric.depth}%
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default QuestionBreakdown;
