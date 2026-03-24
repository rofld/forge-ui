/** Shared Tailwind prose classes for rendered markdown. */
export const proseClasses = [
  'prose prose-invert max-w-none text-sm',
  // Text
  'prose-p:text-stone-200 prose-p:my-2.5 prose-p:leading-relaxed',
  'prose-li:text-stone-200 prose-li:my-1',
  'prose-strong:text-stone-50 prose-strong:font-semibold',
  'prose-em:text-stone-300',
  // Headings — visually distinct
  'prose-headings:text-stone-50 prose-headings:font-bold prose-headings:tracking-tight',
  'prose-h1:text-xl prose-h1:mt-8 prose-h1:mb-4 prose-h1:pb-2 prose-h1:border-b prose-h1:border-stone-800/50',
  'prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-1.5 prose-h2:border-b prose-h2:border-stone-800/30',
  'prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-amber-400/90',
  'prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-1.5 prose-h4:text-stone-300',
  // Inline code — tight highlight, no backticks needed
  'prose-code:text-amber-400 prose-code:bg-amber-500/[0.06] prose-code:px-1 prose-code:py-px prose-code:rounded prose-code:text-[13px] prose-code:font-normal prose-code:border prose-code:border-amber-500/[0.08]',
  // Code blocks — reset inline styles inside pre
  'prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/[0.06] prose-pre:rounded-xl prose-pre:text-[13px] prose-pre:my-4 prose-pre:p-4 prose-pre:shadow-lg prose-pre:shadow-black/10',
  '[&_pre_code]:bg-transparent [&_pre_code]:border-0 [&_pre_code]:p-0 [&_pre_code]:rounded-none [&_pre_code]:text-inherit',
  // Links
  'prose-a:text-amber-400 prose-a:no-underline hover:prose-a:underline prose-a:transition-colors',
  // Tables — same base font size
  'prose-table:text-sm',
  'prose-th:text-stone-300 prose-th:font-semibold prose-th:bg-white/[0.03] prose-th:px-3 prose-th:py-2',
  'prose-td:text-stone-300 prose-td:px-3 prose-td:py-1.5',
  'prose-th:border-stone-700/50 prose-td:border-stone-800/50',
  // Blockquotes — styled
  'prose-blockquote:border-amber-500/30 prose-blockquote:bg-amber-500/[0.03] prose-blockquote:rounded-r-lg prose-blockquote:text-stone-400 prose-blockquote:not-italic prose-blockquote:py-1 prose-blockquote:px-4',
  // Lists
  'prose-ul:my-2 prose-ol:my-2',
  // HR
  'prose-hr:border-stone-800/50 prose-hr:my-6',
  // Images
  'prose-img:rounded-xl prose-img:border prose-img:border-white/[0.06]',
].join(' ');
