import { Show, For, createSignal, createEffect } from "solid-js";
import { SurveyQuestion, SurveyResponse, validateSurveyResponses } from "../lib/survey-types";

interface SurveyModalProps {
  isOpen: boolean;
  questions: SurveyQuestion[];
  onComplete: (responses: SurveyResponse[]) => void;
  onCancel: () => void;
}

export function SurveyModal(props: SurveyModalProps) {
  const [responses, setResponses] = createSignal<SurveyResponse[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = createSignal(0);
  const [errors, setErrors] = createSignal<string[]>([]);

  // Reset when modal opens
  createEffect(() => {
    if (props.isOpen) {
      setResponses([]);
      setCurrentQuestionIndex(0);
      setErrors([]);
    }
  });

  const currentQuestion = () => props.questions[currentQuestionIndex()];
  const isLastQuestion = () => currentQuestionIndex() === props.questions.length - 1;
  const isFirstQuestion = () => currentQuestionIndex() === 0;
  const progress = () => ((currentQuestionIndex() + 1) / props.questions.length) * 100;

  const getCurrentResponse = (questionId: string): string => {
    const response = responses().find(r => r.questionId === questionId);
    return response?.answer || "";
  };

  const updateResponse = (questionId: string, answer: string) => {
    setResponses(prev => {
      const existing = prev.find(r => r.questionId === questionId);
      if (existing) {
        return prev.map(r => r.questionId === questionId ? { ...r, answer } : r);
      } else {
        return [...prev, { questionId, answer }];
      }
    });
  };

  const handleNext = () => {
    if (isLastQuestion()) {
      handleComplete();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstQuestion()) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    const validationErrors = validateSurveyResponses(props.questions, responses());
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setErrors([]);
    props.onComplete(responses());
  };

  const handleSkip = () => {
    // Skip optional questions
    const question = currentQuestion();
    if (!question.required) {
      handleNext();
    }
  };

  return (
    <Show when={props.isOpen && props.questions.length > 0}>
      {/* Backdrop */}
      <div
        style="position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 60;"
        onClick={props.onCancel}
      />
      
      {/* Modal */}
      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0; width: 90%; max-width: 500px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); z-index: 70; overflow: hidden;">
        {/* Header */}
        <div style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0;">
              Survey
            </h2>
            <button
              onClick={props.onCancel}
              style="color: #6b7280; cursor: pointer; border: none; background: none; padding: 4px;"
            >
              <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div style="background: #f3f4f6; border-radius: 6px; height: 6px; overflow: hidden;">
            <div 
              style={`background: #3b82f6; height: 100%; transition: width 0.3s ease; width: ${progress()}%;`}
            />
          </div>
          <div style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 8px;">
            Question {currentQuestionIndex() + 1} of {props.questions.length}
          </div>
        </div>

        {/* Question Content */}
        <div style="padding: 24px;">
          <Show when={currentQuestion()}>
            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 16px; font-weight: 500; color: #111827; margin-bottom: 12px; line-height: 1.4;">
                {currentQuestion()?.question}
                {currentQuestion()?.required && (
                  <span style="color: #ef4444; margin-left: 4px;">*</span>
                )}
              </h3>

              {/* Dropdown Question */}
              <Show when={currentQuestion()?.type === 'dropdown'}>
                <select
                  value={getCurrentResponse(currentQuestion()!.id)}
                  onChange={(e) => updateResponse(currentQuestion()!.id, e.currentTarget.value)}
                  style="width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background: white;"
                >
                  <option value="">Select an option...</option>
                  <For each={(currentQuestion() as any)?.options || []}>
                    {(option) => (
                      <option value={option}>{option}</option>
                    )}
                  </For>
                </select>
              </Show>

              {/* Text Question */}
              <Show when={currentQuestion()?.type === 'text'}>
                <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
                  <textarea
                    placeholder={(currentQuestion() as any)?.placeholder || "Type your answer..."}
                    value={getCurrentResponse(currentQuestion()!.id)}
                    onInput={(e) => updateResponse(currentQuestion()!.id, e.currentTarget.value)}
                    maxLength={(currentQuestion() as any)?.maxLength}
                    rows={4}
                    style="width: 90%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 80px;"
                  />
                  <Show when={(currentQuestion() as any)?.maxLength}>
                    <div style="width: 90%; text-align: right; font-size: 12px; color: #6b7280; margin-top: 4px;">
                      {getCurrentResponse(currentQuestion()!.id).length} / {(currentQuestion() as any)?.maxLength}
                    </div>
                  </Show>
                </div>
              </Show>
            </div>
          </Show>

          {/* Error Messages */}
          <Show when={errors().length > 0}>
            <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
              <For each={errors()}>
                {(error) => (
                  <div style="font-size: 14px; color: #dc2626;">{error}</div>
                )}
              </For>
            </div>
          </Show>

          {/* Navigation Buttons */}
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="display: flex; gap: 8px;">
              <Show when={!isFirstQuestion()}>
                <button
                  onClick={handleBack}
                  style="padding: 8px 16px; background: #f3f4f6; color: #374151; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;"
                >
                  ← Back
                </button>
              </Show>
              
              <Show when={!currentQuestion()?.required}>
                <button
                  onClick={handleSkip}
                  style="padding: 8px 16px; background: #f9fafb; color: #6b7280; border: 1px solid #e5e7eb; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;"
                >
                  Skip
                </button>
              </Show>
            </div>

            <button
              onClick={handleNext}
              style="padding: 8px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;"
            >
              {isLastQuestion() ? 'Complete' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}