function spanText(span) {
  return `${span.name}\n${JSON.stringify(span.attributes ?? {})}`;
}

export default function assertTrajectory(_output, context) {
  const patterns = context.config?.orderedPatterns;
  if (!Array.isArray(patterns) || patterns.length === 0) {
    return { pass: false, score: 0, reason: "orderedPatterns are required" };
  }
  if (!context.trace?.spans?.length) {
    return { pass: false, score: 0, reason: "Trace data is required for this assertion" };
  }

  const spans = [...context.trace.spans].sort((left, right) => left.startTime - right.startTime);
  let cursor = 0;
  const matched = [];
  for (const pattern of patterns) {
    const expression = new RegExp(pattern.regex, pattern.flags ?? "i");
    const index = spans.findIndex(
      (span, spanIndex) => {
        expression.lastIndex = 0;
        return spanIndex >= cursor && expression.test(spanText(span));
      },
    );
    if (index < 0) {
      return {
        pass: false,
        score: 0,
        reason: `Missing ordered trajectory step: ${pattern.label ?? pattern.regex}`,
      };
    }
    matched.push(pattern.label ?? pattern.regex);
    cursor = index + 1;
  }
  return { pass: true, score: 1, reason: `Observed sequence: ${matched.join(" -> ")}` };
}
