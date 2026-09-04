function matches(value, pattern) {
  return new RegExp(pattern, "i").test(value ?? "");
}

function isFileChange(span, pattern) {
  return (
    span.attributes?.["codex.item.type"] === "file_change" &&
    matches(span.attributes?.["codex.files"], pattern)
  );
}

function isSuccessfulCommand(span, pattern) {
  return (
    span.attributes?.["codex.item.type"] === "command_execution" &&
    span.attributes?.["codex.exit_code"] === 0 &&
    matches(span.attributes?.["codex.command"], pattern)
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

export default function assertSkillUsed(_output, context) {
  const skillName = context.config?.skillName;
  if (!skillName) {
    return { pass: false, score: 0, reason: "skillName is required" };
  }
  const spans = [...(context.trace?.spans ?? [])].sort(
    (left, right) => left.startTime - right.startTime,
  );
  const suffix = `.agents/skills/${skillName}/SKILL.md`;
  const readIndices = spans.flatMap((span, index) => {
    const command = span.attributes?.["codex.command"];
    return typeof command === "string" && command.includes(suffix) ? [index] : [];
  });

  const beforeFileChangeRegex = context.config?.beforeFileChangeRegex;
  if (beforeFileChangeRegex) {
    const changeIndex = findIndex(spans, 0, (span) =>
      isFileChange(span, beforeFileChangeRegex),
    );
    if (changeIndex < 0) {
      return {
        pass: false,
        score: 0,
        reason: `Missing file change matching ${beforeFileChangeRegex}`,
      };
    }
    if (!readIndices.some((index) => index < changeIndex)) {
      return {
        pass: false,
        score: 0,
        reason: `${skillName} SKILL.md was not read before the first behavior change`,
      };
    }
  }

  const afterProductionPathRegex = context.config?.afterProductionPathRegex;
  const afterGreenCommandRegex = context.config?.afterGreenCommandRegex;
  if (afterProductionPathRegex || afterGreenCommandRegex) {
    if (!afterProductionPathRegex || !afterGreenCommandRegex) {
      return {
        pass: false,
        score: 0,
        reason: "afterProductionPathRegex and afterGreenCommandRegex must be configured together",
      };
    }
    const productionIndex = findIndex(spans, 0, (span) =>
      isFileChange(span, afterProductionPathRegex),
    );
    if (productionIndex < 0) {
      return {
        pass: false,
        score: 0,
        reason: `Missing production change matching ${afterProductionPathRegex}`,
      };
    }
    const greenIndex = findIndex(spans, productionIndex + 1, (span) =>
      isSuccessfulCommand(span, afterGreenCommandRegex),
    );
    if (greenIndex < 0) {
      return {
        pass: false,
        score: 0,
        reason: `Missing GREEN command matching ${afterGreenCommandRegex}`,
      };
    }
    const followingFileRegex = context.config?.beforeFollowingFileChangeRegex;
    const followingFileIndex = followingFileRegex
      ? findIndex(spans, greenIndex + 1, (span) => isFileChange(span, followingFileRegex))
      : -1;
    const readAfterGreen = readIndices.some(
      (index) => index > greenIndex && (followingFileIndex < 0 || index < followingFileIndex),
    );
    if (!readAfterGreen) {
      return {
        pass: false,
        score: 0,
        reason: followingFileIndex < 0
          ? `${skillName} SKILL.md was not read after the first scenario GREEN`
          : `${skillName} SKILL.md was not read after GREEN and before the next behavior change`,
      };
    }
  }

  const observed = readIndices.length > 0;
  return {
    pass: observed,
    score: observed ? 1 : 0,
    reason: observed
      ? `Observed ${skillName} SKILL.md read in command trace`
      : `Missing ${skillName} SKILL.md read in command trace`,
  };
}
