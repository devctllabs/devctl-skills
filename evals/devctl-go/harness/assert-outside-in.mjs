function result(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}

function matches(value, regex) {
  return new RegExp(regex, "i").test(value ?? "");
}

function isFileChange(span, regex) {
  return (
    span.attributes?.["codex.item.type"] === "file_change" &&
    matches(span.attributes?.["codex.files"], regex)
  );
}

function isCommand(span, regex) {
  return (
    span.attributes?.["codex.item.type"] === "command_execution" &&
    matches(span.attributes?.["codex.command"], regex)
  );
}

function firstIndex(spans, predicate, start = 0, end = spans.length) {
  for (let index = start; index < end; index += 1) {
    if (predicate(spans[index])) {
      return index;
    }
  }
  return -1;
}

export default function assertOutsideIn(_output, context) {
  const spans = [...(context.trace?.spans ?? [])].sort(
    (left, right) => left.startTime - right.startTime,
  );
  const phases = context.config?.phases;
  if (spans.length === 0 || !Array.isArray(phases) || phases.length === 0) {
    return result(false, "Trace data and outside-in phases are required");
  }

  const allProductionRegex = context.config?.allProductionRegex;
  let previousGreen = -1;
  const observed = [];

  for (const phase of phases) {
    const label = phase.label ?? phase.productionPathRegex;
    const testIndex = firstIndex(spans, (span) => isFileChange(span, phase.testPathRegex));
    const productionIndex = firstIndex(spans, (span) =>
      isFileChange(span, phase.productionPathRegex),
    );
    if (testIndex < 0) {
      return result(false, `Missing ${label} owner test change`);
    }
    if (productionIndex < 0) {
      return result(false, `Missing ${label} production change`);
    }
    if (testIndex <= previousGreen) {
      return result(false, `${label} test started before the previous outer boundary was GREEN`);
    }
    if (productionIndex <= testIndex) {
      return result(
        false,
        `${label} production changed before or together with its owner test`,
      );
    }

    const redIndex = firstIndex(
      spans,
      (span) => {
        if (!isCommand(span, phase.commandRegex)) {
          return false;
        }
        const exitCode = span.attributes?.["codex.exit_code"];
        const output = span.attributes?.["codex.output"] ?? "";
        return (
          typeof exitCode === "number" &&
          exitCode !== 0 &&
          !matches(output, context.config?.forbiddenRedOutputRegex ?? "$a")
        );
      },
      testIndex + 1,
      productionIndex,
    );
    if (redIndex < 0) {
      return result(false, `Missing useful ${label} RED before production`);
    }

    if (previousGreen < 0 && allProductionRegex) {
      const firstProduction = firstIndex(spans, (span) =>
        isFileChange(span, allProductionRegex),
      );
      if (firstProduction >= 0 && firstProduction <= redIndex) {
        return result(false, "Production changed before the first caller-visible RED");
      }
    }

    const greenIndex = firstIndex(
      spans,
      (span) =>
        isCommand(span, phase.commandRegex) &&
        span.attributes?.["codex.exit_code"] === 0,
      productionIndex + 1,
    );
    if (greenIndex < 0) {
      return result(false, `Missing ${label} GREEN after production`);
    }
    observed.push(`${label}: test -> RED -> production -> GREEN`);
    previousGreen = greenIndex;
  }

  return result(true, `Observed outside-in trajectory: ${observed.join(" | ")}`);
}
