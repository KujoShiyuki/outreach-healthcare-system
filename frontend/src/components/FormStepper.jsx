import React from 'react'

/**
 * Reusable Form Stepper component
 * แสดงขั้นตอน (Step 1, 2, 3...) และแจ้งเตือนสถานะ Session Draft
 */
export default function FormStepper({
  steps = [],
  currentStep = 1,
  onStepClick,
  hasDraft = false,
  onClearDraft
}) {
  return (
    <div className="mb-8">
      {/* Stepper Bar */}
      <div className="flex items-center justify-between relative max-w-xl mx-auto px-4">
        {/* Track Line behind steps */}
        <div className="absolute left-8 right-8 top-5 -translate-y-1/2 h-1 bg-gray-200/80 rounded-full -z-0">
          <div
            className="h-full bg-[#1456f0] rounded-full transition-all duration-300"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`
            }}
          />
        </div>

        {/* Step Circles */}
        {steps.map((st, idx) => {
          const stepNum = idx + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep
          const isClickable = onStepClick && stepNum <= currentStep

          return (
            <div
              key={st.title || idx}
              onClick={() => isClickable && onStepClick(stepNum)}
              className={`flex flex-col items-center relative z-10 select-none ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-[#1456f0] text-white ring-4 ring-[#1456f0]/20 scale-110 shadow-purple-sm'
                    : 'bg-white text-gray-400 border border-gray-200'
                }`}
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-base font-bold">check</span>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-xs mt-2 font-medium transition-colors text-center hidden sm:block ${
                  isCurrent
                    ? 'text-[#1456f0] font-bold'
                    : isCompleted
                    ? 'text-[#222222]'
                    : 'text-gray-400'
                }`}
              >
                {st.title}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile Step Title */}
      <div className="sm:hidden text-center mt-3 text-sm font-bold text-[#1456f0]">
        ขั้นตอนที่ {currentStep}/{steps.length}: {steps[currentStep - 1]?.title}
      </div>
    </div>
  )
}
