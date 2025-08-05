import { createSignal, createEffect, Show, For } from "solid-js";
import { createStore } from "solid-js/store";
import { open } from "@tauri-apps/plugin-dialog";
import { SurveyQuestion, createDropdownQuestion, createTextQuestion } from "../lib/survey-types";

interface EventFormProps {
  eventName: string;
  emailSubject: string;
  emailBody: string;
  smsMessage: string;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  disclaimerEnabled?: boolean;
  disclaimerMessage?: string;
  disclaimerMandatory?: boolean;
  surveyEnabled?: boolean;
  surveyQuestions?: SurveyQuestion[];
  watchPath?: string;
  onSave: (data: {
    eventName: string;
    emailSubject: string;
    emailBody: string;
    smsMessage: string;
    emailEnabled?: boolean;
    smsEnabled?: boolean;
    disclaimerEnabled?: boolean;
    disclaimerMessage?: string;
    disclaimerMandatory?: boolean;
    surveyEnabled?: boolean;
    surveyQuestions?: SurveyQuestion[];
    watchPath?: string;
  }) => void;
  isSaving?: boolean;
}

export function EventForm(props: EventFormProps) {
  const [eventName, setEventName] = createSignal(props.eventName);
  const [emailSubject, setEmailSubject] = createSignal(props.emailSubject);
  const [emailBody, setEmailBody] = createSignal(props.emailBody);
  const [smsMessage, setSmsMessage] = createSignal(props.smsMessage);
  const [emailEnabled, setEmailEnabled] = createSignal(props.emailEnabled ?? true);
  const [smsEnabled, setSmsEnabled] = createSignal(props.smsEnabled ?? true);
  const [watchPath, setWatchPath] = createSignal(props.watchPath || "");
  const [disclaimerEnabled, setDisclaimerEnabled] = createSignal(props.disclaimerEnabled ?? false);
  const [disclaimerMessage, setDisclaimerMessage] = createSignal(props.disclaimerMessage || "");
  const [disclaimerMandatory, setDisclaimerMandatory] = createSignal(props.disclaimerMandatory ?? false);
  const [surveyEnabled, setSurveyEnabled] = createSignal(props.surveyEnabled ?? false);
  const [surveyQuestions, setSurveyQuestions] = createStore<SurveyQuestion[]>(props.surveyQuestions || []);

  // Track the last loaded event to avoid overriding user input
  const [lastLoadedEventName, setLastLoadedEventName] = createSignal("");
  
  createEffect(() => {
    if (props.eventName !== lastLoadedEventName()) {
      // New event loaded, update all fields
      setLastLoadedEventName(props.eventName);
      setEventName(props.eventName);
      setEmailSubject(props.emailSubject);
      setEmailBody(props.emailBody);
      setSmsMessage(props.smsMessage);
      setEmailEnabled(props.emailEnabled ?? true);
      setSmsEnabled(props.smsEnabled ?? true);
      setWatchPath(props.watchPath || "");
      setDisclaimerEnabled(props.disclaimerEnabled ?? false);
      setDisclaimerMessage(props.disclaimerMessage || "");
      setDisclaimerMandatory(props.disclaimerMandatory ?? false);
      setSurveyEnabled(props.surveyEnabled ?? false);
      setSurveyQuestions([...(props.surveyQuestions || [])]);
    }
  });

  const selectFolder = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: "Select Watch Folder for Event"
      });
      
      if (result && typeof result === 'string') {
        setWatchPath(result);
      }
    } catch (error) {
      console.error("Error selecting folder:", error);
    }
  };

  // Survey management functions
  const addDropdownQuestion = () => {
    const newQuestion = createDropdownQuestion();
    setSurveyQuestions(surveyQuestions.length, newQuestion);
    
    // Focus the newly added question after a short delay
    setTimeout(() => {
      const questionInput = document.querySelector(`input[data-question-id="${newQuestion.id}"]`) as HTMLInputElement;
      if (questionInput) {
        questionInput.focus();
      }
    }, 100);
  };

  const addTextQuestion = () => {
    const newQuestion = createTextQuestion();
    setSurveyQuestions(surveyQuestions.length, newQuestion);
    
    // Focus the newly added question after a short delay
    setTimeout(() => {
      const questionInput = document.querySelector(`input[data-question-id="${newQuestion.id}"]`) as HTMLInputElement;
      if (questionInput) {
        questionInput.focus();
      }
    }, 100);
  };

  const removeQuestion = (questionId: string) => {
    const index = surveyQuestions.findIndex(q => q.id === questionId);
    if (index !== -1) {
      setSurveyQuestions(questions => questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (questionId: string, updates: Partial<SurveyQuestion>) => {
    const index = surveyQuestions.findIndex(q => q.id === questionId);
    if (index !== -1) {
      setSurveyQuestions(index, { ...surveyQuestions[index], ...updates });
    }
  };

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const index = surveyQuestions.findIndex(q => q.id === questionId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= surveyQuestions.length) return;
    
    const temp = surveyQuestions[index];
    setSurveyQuestions(index, surveyQuestions[newIndex]);
    setSurveyQuestions(newIndex, temp);
  };

  const addDropdownOption = (questionId: string) => {
    updateQuestion(questionId, {
      options: [...((surveyQuestions.find(q => q.id === questionId) as any)?.options || []), 'New Option']
    });
  };

  const updateDropdownOption = (questionId: string, optionIndex: number, value: string) => {
    const question = surveyQuestions.find(q => q.id === questionId) as any;
    if (question && question.options) {
      const newOptions = [...question.options];
      newOptions[optionIndex] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const removeDropdownOption = (questionId: string, optionIndex: number) => {
    const question = surveyQuestions.find(q => q.id === questionId) as any;
    if (question && question.options) {
      const newOptions = question.options.filter((_: any, i: number) => i !== optionIndex);
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const handleSave = () => {
    const name = eventName().trim();
    if (!name) {
      alert("Please enter an event name");
      return;
    }

    props.onSave({
      eventName: name,
      emailSubject: emailSubject(),
      emailBody: emailBody(),
      smsMessage: smsMessage(),
      emailEnabled: emailEnabled(),
      smsEnabled: smsEnabled(),
      disclaimerEnabled: disclaimerEnabled(),
      disclaimerMessage: disclaimerMessage(),
      disclaimerMandatory: disclaimerMandatory(),
      surveyEnabled: surveyEnabled(),
      surveyQuestions: [...surveyQuestions],
      watchPath: watchPath() || undefined,
    });
  };

  return (
    <div>
      {/* Event Name */}
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          Event Name:
        </label>
        <input
          type="text"
          placeholder="Enter event name..."
          value={eventName()}
          onInput={(e) => setEventName(e.currentTarget.value)}
          disabled={props.isSaving}
          style="width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px;"
        />
      </div>

      {/* Email Toggle and Subject */}
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              type="checkbox"
              checked={emailEnabled()}
              onChange={(e) => setEmailEnabled(e.currentTarget.checked)}
              disabled={props.isSaving}
              style="width: 16px; height: 16px;"
            />
            <span style="font-size: 14px; font-weight: 500; color: #333;">
              Enable Email
            </span>
          </label>
        </div>
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          Email Subject:
        </label>
        <input
          type="text"
          placeholder="Enter email subject..."
          value={emailSubject()}
          onInput={(e) => setEmailSubject(e.currentTarget.value)}
          disabled={props.isSaving || !emailEnabled()}
          style={`width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; ${!emailEnabled() ? 'background: #f3f4f6; color: #9ca3af;' : ''}`}
        />
      </div>

      {/* Email Body */}
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          Email Body:
        </label>
        <textarea
          placeholder="Enter email message..."
          value={emailBody()}
          onInput={(e) => setEmailBody(e.currentTarget.value)}
          disabled={props.isSaving || !emailEnabled()}
          rows={4}
          style={`width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 80px; ${!emailEnabled() ? 'background: #f3f4f6; color: #9ca3af;' : ''}`}
        />
      </div>

      {/* SMS Toggle and Message */}
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              type="checkbox"
              checked={smsEnabled()}
              onChange={(e) => setSmsEnabled(e.currentTarget.checked)}
              disabled={props.isSaving}
              style="width: 16px; height: 16px;"
            />
            <span style="font-size: 14px; font-weight: 500; color: #333;">
              Enable SMS
            </span>
          </label>
        </div>
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          SMS Message:
        </label>
        <textarea
          placeholder="Enter SMS message..."
          value={smsMessage()}
          onInput={(e) => setSmsMessage(e.currentTarget.value)}
          disabled={props.isSaving || !smsEnabled()}
          rows={3}
          style={`width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 60px; ${!smsEnabled() ? 'background: #f3f4f6; color: #9ca3af;' : ''}`}
        />
      </div>

      {/* Disclaimer */}
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              type="checkbox"
              checked={disclaimerEnabled()}
              onChange={(e) => setDisclaimerEnabled(e.currentTarget.checked)}
              disabled={props.isSaving}
              style="width: 16px; height: 16px;"
            />
            <span style="font-size: 14px; font-weight: 500; color: #333;">
              Enable Disclaimer
            </span>
          </label>
        </div>
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          Disclaimer Message:
        </label>
        <textarea
          placeholder="Enter disclaimer message..."
          value={disclaimerMessage()}
          onInput={(e) => setDisclaimerMessage(e.currentTarget.value)}
          disabled={props.isSaving || !disclaimerEnabled()}
          rows={3}
          style={`width: 100%; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; resize: vertical; min-height: 60px; ${!disclaimerEnabled() ? 'background: #f3f4f6; color: #9ca3af;' : ''}`}
        />
        
        {/* Mandatory Disclaimer Toggle */}
        {disclaimerEnabled() && (
          <div style="margin-top: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input
                type="checkbox"
                checked={disclaimerMandatory()}
                onChange={(e) => setDisclaimerMandatory(e.currentTarget.checked)}
                disabled={props.isSaving}
                style="width: 16px; height: 16px;"
              />
              <span style="font-size: 14px; font-weight: 500; color: #333;">
                Make disclaimer mandatory
              </span>
            </label>
            <div style="font-size: 12px; color: #6b7280; margin-top: 4px; margin-left: 24px;">
              When enabled, users must agree to proceed (no disagree option)
            </div>
          </div>
        )}
      </div>

      {/* Survey Section */}
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input
              type="checkbox"
              checked={surveyEnabled()}
              onChange={(e) => setSurveyEnabled(e.currentTarget.checked)}
              disabled={props.isSaving}
              style="width: 16px; height: 16px;"
            />
            <span style="font-size: 14px; font-weight: 500; color: #333;">
              Enable Survey
            </span>
          </label>
        </div>
        
        <Show when={surveyEnabled()}>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 12px;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 16px;">
              <h4 style="font-size: 14px; font-weight: 600; color: #374151; margin: 0;">
                Survey Questions
              </h4>
              <div style="display: flex; gap: 8px;">
                <button
                  type="button"
                  onClick={addDropdownQuestion}
                  disabled={props.isSaving}
                  style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 4px;"
                >
                  📋 Add Dropdown
                </button>
                <button
                  type="button"
                  onClick={addTextQuestion}
                  disabled={props.isSaving}
                  style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 4px;"
                >
                  ✏️ Add Text Input
                </button>
              </div>
            </div>

            <Show when={surveyQuestions.length === 0}>
              <div style="text-align: center; padding: 24px; color: #6b7280; font-size: 14px;">
                📝 No questions added yet. Click the buttons above to create survey questions.
              </div>
            </Show>

            <For each={surveyQuestions}>
              {(question, index) => (
                <div key={question.id} style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 12px;">
                  {/* Question Header */}
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 12px; font-weight: 600; color: #6b7280;">
                        {question.type === 'dropdown' ? '📋' : '✏️'} Question {index() + 1}
                      </span>
                      <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => updateQuestion(question.id, { required: e.currentTarget.checked })}
                          disabled={props.isSaving}
                          style="width: 14px; height: 14px;"
                        />
                        <span style="font-size: 12px; color: #6b7280;">Required</span>
                      </label>
                    </div>
                    
                    <div style="display: flex; gap: 4px;">
                      <button
                        type="button"
                        onClick={() => moveQuestion(question.id, 'up')}
                        disabled={props.isSaving || index() === 0}
                        style={`padding: 4px 6px; background: ${index() === 0 ? '#f3f4f6' : '#e5e7eb'}; color: ${index() === 0 ? '#9ca3af' : '#374151'}; border: none; border-radius: 3px; cursor: ${index() === 0 ? 'not-allowed' : 'pointer'}; font-size: 10px;`}
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(question.id, 'down')}
                        disabled={props.isSaving || index() === surveyQuestions.length - 1}
                        style={`padding: 4px 6px; background: ${index() === surveyQuestions.length - 1 ? '#f3f4f6' : '#e5e7eb'}; color: ${index() === surveyQuestions.length - 1 ? '#9ca3af' : '#374151'}; border: none; border-radius: 3px; cursor: ${index() === surveyQuestions.length - 1 ? 'not-allowed' : 'pointer'}; font-size: 10px;`}
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeQuestion(question.id)}
                        disabled={props.isSaving}
                        style="padding: 4px 6px; background: #ef4444; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;"
                        title="Delete question"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div style="margin-bottom: 12px;">
                    <label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">
                      Question Text:
                    </label>
                    <input
                      type="text"
                      value={question.question}
                      onInput={(e) => updateQuestion(question.id, { question: e.currentTarget.value })}
                      disabled={props.isSaving}
                      placeholder="Enter your question..."
                      data-question-id={question.id}
                      style="width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 13px;"
                    />
                  </div>

                  {/* Dropdown Options */}
                  <Show when={question.type === 'dropdown'}>
                    <div style="margin-bottom: 8px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <label style="font-size: 12px; font-weight: 500; color: #374151;">
                          Options:
                        </label>
                        <button
                          type="button"
                          onClick={() => addDropdownOption(question.id)}
                          disabled={props.isSaving}
                          style="padding: 4px 8px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 3px; cursor: pointer; font-size: 11px;"
                        >
                          + Add Option
                        </button>
                      </div>
                      <For each={(question as any).options || []}>
                        {(option, optionIndex) => (
                          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                            <input
                              type="text"
                              value={option}
                              onInput={(e) => updateDropdownOption(question.id, optionIndex(), e.currentTarget.value)}
                              disabled={props.isSaving}
                              placeholder="Option text..."
                              style="flex: 1; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 12px;"
                            />
                            <button
                              type="button"
                              onClick={() => removeDropdownOption(question.id, optionIndex())}
                              disabled={props.isSaving || (question as any).options.length <= 1}
                              style={`padding: 6px 8px; background: ${(question as any).options.length <= 1 ? '#f3f4f6' : '#ef4444'}; color: ${(question as any).options.length <= 1 ? '#9ca3af' : 'white'}; border: none; border-radius: 3px; cursor: ${(question as any).options.length <= 1 ? 'not-allowed' : 'pointer'}; font-size: 10px;`}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>

                  {/* Text Input Settings */}
                  <Show when={question.type === 'text'}>
                    <div style="display: flex; gap: 12px;">
                      <div style="flex: 1;">
                        <label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">
                          Placeholder:
                        </label>
                        <input
                          type="text"
                          value={(question as any).placeholder || ""}
                          onInput={(e) => updateQuestion(question.id, { placeholder: e.currentTarget.value })}
                          disabled={props.isSaving}
                          placeholder="Type here..."
                          style="width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 12px;"
                        />
                      </div>
                      <div style="flex: 0 0 100px;">
                        <label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">
                          Max Length:
                        </label>
                        <input
                          type="number"
                          value={(question as any).maxLength || ""}
                          onInput={(e) => updateQuestion(question.id, { maxLength: parseInt(e.currentTarget.value) || undefined })}
                          disabled={props.isSaving}
                          placeholder="No limit"
                          min="1"
                          style="width: 100%; padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 3px; font-size: 12px;"
                        />
                      </div>
                    </div>
                  </Show>
                </div>
              )}
            </For>
            
            <div style="font-size: 12px; color: #6b7280; margin-top: 12px;">
              💡 Surveys will appear after the disclaimer but before sharing options.
            </div>
          </div>
        </Show>
      </div>

      {/* Watch Folder */}
      <div style="margin-bottom: 20px;">
        <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 4px;">
          Watch Folder (Optional):
        </label>
        <div style="display: flex; gap: 8px;">
          <input
            type="text"
            placeholder="No folder selected"
            value={watchPath() ? watchPath().split('/').pop() || watchPath() : ""}
            disabled
            style="flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; background: #f9f9f9; color: #666;"
            title={watchPath()}
          />
          <button
            type="button"
            onClick={selectFolder}
            disabled={props.isSaving}
            style="padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;"
          >
            📁 Select
          </button>
          {watchPath() && (
            <button
              type="button"
              onClick={() => setWatchPath("")}
              disabled={props.isSaving}
              style="padding: 8px 12px; background: #dc2626; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
              title="Clear folder"
            >
              ✕
            </button>
          )}
        </div>
        {watchPath() && (
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            {watchPath()}
          </div>
        )}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={props.isSaving}
        style="width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 100px;"
      >
        {props.isSaving && (
          <div style="width: 16px; height: 16px; border: 2px solid white; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        )}
        {props.isSaving ? "Saving..." : "Save Event"}
      </button>
    </div>
  );
}