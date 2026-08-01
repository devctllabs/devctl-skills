function spanText(span) {
  return `${span.name}\n${JSON.stringify(span.attributes ?? {})}`;
}

function matches(value, regex, flags = "i") {
  const expression = new RegExp(regex, flags);
  expression.lastIndex = 0;
  return expression.test(value ?? "");
}

function isFileChange(span, regex) {
  const attributes = span.attributes ?? {};
  return (
    attributes["codex.item.type"] === "file_change" &&
    matches(attributes["codex.files"], regex)
  );
}

function isCommand(span, regex) {
  const attributes = span.attributes ?? {};
  return (
    attributes["codex.item.type"] === "command_execution" &&
    matches(attributes["codex.command"], regex)
  );
}

function findIndex(spans, start, predicate) {
  for (let index = start; index < spans.length; index += 1) {
    if (predicate(spans[index])) {
      return index;
    }
  }
  return -1;
}

function findIndexBefore(spans, start, end, predicate) {
  for (let index = start; index < end; index += 1) {
    if (predicate(spans[index])) {
      return index;
    }
  }
  return -1;
}

function findLastIndexBefore(spans, start, end, predicate) {
  for (let index = end - 1; index >= start; index -= 1) {
    if (predicate(spans[index])) {
      return index;
    }
  }
  return -1;
}

function assertPhases(spans, phases, forbiddenRedOutputRegex) {
  let cursor = 0;
  const observed = [];

  for (let phaseIndex = 0; phaseIndex < phases.length; phaseIndex += 1) {
    const phase = phases[phaseIndex];
    const label = phase.label ?? phase.productionPathRegex;
    const mode = phase.mode ?? "tdd";
    if (!["tdd", "characterization"].includes(mode)) {
      return {
        pass: false,
        score: 0,
        reason: `Unsupported trajectory mode for ${label}: ${mode}`,
      };
    }

    const testIndex = findIndex(
      spans,
      cursor,
      (span) => isFileChange(span, phase.testPathRegex),
    );
    if (testIndex < 0) {
      return { pass: false, score: 0, reason: `Missing ${label} test change` };
    }

    const forbiddenProductionRegex =
      phase.forbiddenProductionPathRegex ?? phase.productionPathRegex;
    const earlyProductionIndex = findIndex(
      spans,
      cursor,
      (span) => isFileChange(span, forbiddenProductionRegex),
    );
    const commandSearchEnd =
      earlyProductionIndex >= 0 ? earlyProductionIndex : spans.length;

    let checkpointIndex = -1;
    for (let index = testIndex + 1; index < commandSearchEnd; index += 1) {
      const span = spans[index];
      if (!isCommand(span, phase.commandRegex)) {
        continue;
      }
      const attributes = span.attributes ?? {};
      const exitCode = attributes["codex.exit_code"];
      if (mode === "characterization" && exitCode === 0) {
        checkpointIndex = index;
        break;
      }
      if (mode === "tdd" && exitCode === 0) {
        return {
          pass: false,
          score: 0,
          reason: `${label} test was already GREEN before a useful RED`,
        };
      }
      if (
        mode === "tdd" &&
        typeof exitCode === "number" &&
        exitCode !== 0 &&
        !matches(
          attributes["codex.output"],
          phase.forbiddenRedOutputRegex ?? forbiddenRedOutputRegex,
        )
      ) {
        checkpointIndex = index;
        break;
      }
    }
    if (checkpointIndex < 0) {
      if (earlyProductionIndex >= 0) {
        return {
          pass: false,
          score: 0,
          reason: `${label} production changed before its required test checkpoint`,
        };
      }
      const expectedCheckpoint = mode === "tdd" ? "useful RED" : "GREEN characterization";
      return {
        pass: false,
        score: 0,
        reason: `Missing ${label} ${expectedCheckpoint} command`,
      };
    }

    if (earlyProductionIndex >= 0 && earlyProductionIndex < checkpointIndex) {
      return {
        pass: false,
        score: 0,
        reason: `${label} production changed before its required test checkpoint`,
      };
    }

    const expectedCheckpoint = mode === "tdd" ? "RED" : "GREEN characterization";
    const productionIndex = findIndex(
      spans,
      checkpointIndex + 1,
      (span) => isFileChange(span, phase.productionPathRegex),
    );
    if (productionIndex < 0) {
      return {
        pass: false,
        score: 0,
        reason: `Missing ${label} production change after ${expectedCheckpoint}`,
      };
    }

    const greenIndex = findIndex(
      spans,
      productionIndex + 1,
      (span) =>
        isCommand(span, phase.commandRegex) &&
        span.attributes?.["codex.exit_code"] === 0,
    );
    if (greenIndex < 0) {
      return {
        pass: false,
        score: 0,
        reason: `Missing ${label} GREEN command after production change`,
      };
    }

    const nextPhase = phases[phaseIndex + 1];
    const nextTestIndex = nextPhase
      ? findIndex(
          spans,
          greenIndex + 1,
          (span) => isFileChange(span, nextPhase.testPathRegex),
        )
      : spans.length;
    if (nextPhase && nextTestIndex < 0) {
      return {
        pass: false,
        score: 0,
        reason: `Missing ${nextPhase.label ?? nextPhase.productionPathRegex} test change`,
      };
    }

    const prematureLowerProduction = findIndexBefore(
      spans,
      checkpointIndex + 1,
      nextTestIndex,
      (span) =>
        isFileChange(span, forbiddenProductionRegex) &&
        !isFileChange(span, phase.productionPathRegex),
    );
    if (prematureLowerProduction >= 0) {
      return {
        pass: false,
        score: 0,
        reason: `${label} changed a lower production boundary before its test checkpoint`,
      };
    }

    const refactorChangeIndex = findLastIndexBefore(
      spans,
      greenIndex + 1,
      nextTestIndex,
      (span) =>
        isFileChange(span, phase.testPathRegex) ||
        isFileChange(span, phase.productionPathRegex),
    );
    let finalGreenIndex = greenIndex;
    if (refactorChangeIndex >= 0) {
      finalGreenIndex = findIndexBefore(
        spans,
        refactorChangeIndex + 1,
        nextTestIndex,
        (span) =>
          isCommand(span, phase.commandRegex) &&
          span.attributes?.["codex.exit_code"] === 0,
      );
      if (finalGreenIndex < 0) {
        return {
          pass: false,
          score: 0,
          reason: `${label} changed after GREEN without a confirming GREEN command`,
        };
      }
    }

    if (nextPhase) {
      const nextForbiddenRegex =
        nextPhase.forbiddenProductionPathRegex ?? nextPhase.productionPathRegex;
      const prematureNextProduction = findIndexBefore(
        spans,
        finalGreenIndex + 1,
        nextTestIndex,
        (span) =>
          isFileChange(span, nextForbiddenRegex) &&
          !isFileChange(span, phase.productionPathRegex),
      );
      if (prematureNextProduction >= 0) {
        return {
          pass: false,
          score: 0,
          reason: `${nextPhase.label ?? nextPhase.productionPathRegex} production changed before its required test checkpoint`,
        };
      }
    }

    const refactorEvidence =
      finalGreenIndex === greenIndex ? "" : " -> refactor -> GREEN";
    observed.push(
      `${label}: ${expectedCheckpoint} -> production -> GREEN${refactorEvidence}`,
    );
    cursor = nextPhase ? nextTestIndex : finalGreenIndex + 1;
  }

  return {
    pass: true,
    score: 1,
    reason: `Observed trajectory: ${observed.join(" | ")}`,
  };
}

export default function assertTrajectory(_output, context) {
  if (!context.trace?.spans?.length) {
    return { pass: false, score: 0, reason: "Trace data is required for this assertion" };
  }

  const spans = [...context.trace.spans].sort((left, right) => left.startTime - right.startTime);
  const phases = context.config?.phases;
  if (Array.isArray(phases) && phases.length > 0) {
    return assertPhases(
      spans,
      phases,
      context.config?.forbiddenRedOutputRegex ??
        "ImportError|ModuleNotFoundError|SyntaxError|IndentationError|collection error|broken fixture",
    );
  }

  const patterns = context.config?.orderedPatterns;
  if (!Array.isArray(patterns) || patterns.length === 0) {
    return { pass: false, score: 0, reason: "phases or orderedPatterns are required" };
  }
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
