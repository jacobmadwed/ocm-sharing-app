export interface SurveyDropdownQuestion {
  id: string;
  type: 'dropdown';
  question: string;
  options: string[];
  required: boolean;
  defaultValue?: string;
}

export interface SurveyTextQuestion {
  id: string;
  type: 'text';
  question: string;
  placeholder?: string;
  required: boolean;
  maxLength?: number;
}

export type SurveyQuestion = SurveyDropdownQuestion | SurveyTextQuestion;

export interface SurveyConfig {
  enabled: boolean;
  questions: SurveyQuestion[];
}

export interface SurveyResponse {
  questionId: string;
  answer: string;
}

export interface CompletedSurvey {
  eventName: string;
  completedAt: Date;
  responses: SurveyResponse[];
}

// Helper functions for working with survey questions
export function createDropdownQuestion(question: string = "Select an option"): SurveyDropdownQuestion {
  return {
    id: `dropdown_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'dropdown',
    question,
    options: ['Option 1', 'Option 2'],
    required: false
  };
}

export function createTextQuestion(question: string = "Enter your answer"): SurveyTextQuestion {
  return {
    id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'text',
    question,
    placeholder: 'Type here...',
    required: false
  };
}

export function validateSurveyResponses(questions: SurveyQuestion[], responses: SurveyResponse[]): string[] {
  const errors: string[] = [];
  
  for (const question of questions) {
    if (question.required) {
      const response = responses.find(r => r.questionId === question.id);
      if (!response || !response.answer || response.answer.trim() === '') {
        errors.push(`"${question.question}" is required`);
      }
    }
  }
  
  return errors;
}

export function getQuestionById(questions: SurveyQuestion[], id: string): SurveyQuestion | undefined {
  return questions.find(q => q.id === id);
}