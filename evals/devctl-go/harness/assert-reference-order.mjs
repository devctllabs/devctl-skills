function result(pass, reason) {
  return { pass, score: pass ? 1 : 0, reason };
}

function matches(value, regex) {
  return new RegExp(regex, "i").test(value ?? "");
}

function isCommand(span, regex) {
  return (
    span.attributes?.["codex.item.type"] === "command_execution" &&
    matches(span.attributes?.["codex.command"], regex)
  );
}

function isFileChange(span, regex) {
  return (
    span.attributes?.["codex.item.type"] === "file_change" &&
    matches(span.attributes?.["codex.files"], regex)
  );
}

function firstIndex(spans, predicate, start = 0) {
  for (let index = start; index < spans.length; index += 1) {
    if (predicate(spans[index])) {
      return index;
    }
  }
  return -1;
}

function referenceReads(spans) {
  const reads = new Map();
  const directExpression = /references[\\/]([a-z0-9-]+\.md)/gi;
  const bareExpression = /(?:^|[\s"'])((?:[a-z0-9-]+)\.md)(?=$|[\s"';&|)])/gi;
  spans.forEach((span, index) => {
    if (span.attributes?.["codex.item.type"] !== "command_execution") {
      return;
    }
    const command = span.attributes?.["codex.command"] ?? "";
    for (const match of command.matchAll(directExpression)) {
      if (!reads.has(match[1])) {
        reads.set(match[1], index);
      }
    }
    // A reader may first `cd` into the references directory and then pass bare filenames.
    // Count those reads without treating arbitrary Markdown mentions elsewhere as reference loads.
    if (/(?:^|[\\/])references(?:[\\/]|\b)/i.test(command)) {
      for (const match of command.matchAll(bareExpression)) {
        if (!reads.has(match[1])) {
          reads.set(match[1], index);
        }
      }
    }
  });
  return reads;
}

export default function assertReferenceOrder(_output, context) {
  const spans = [...(context.trace?.spans ?? [])].sort(
    (left, right) => left.startTime - right.startTime,
  );
  const config = context.config ?? {};
  if (spans.length === 0) {
    return result(false, "Trace data is required for reference-order checks");
  }

  const reads = referenceReads(spans);
  const allowed = new Set(config.allowedReferences ?? []);
  const unexpected = [...reads.keys()].filter((name) => !allowed.has(name));
  if (unexpected.length > 0) {
    return result(false, `Read unrelated references: ${unexpected.join(", ")}`);
  }

  const firstChange = firstIndex(spans, (span) =>
    isFileChange(span, config.anyChangeRegex ?? "."),
  );
  if (firstChange < 0) {
    return result(false, "No file change found for reference-order checks");
  }
  for (const name of config.initialReferences ?? []) {
    const readIndex = reads.get(name);
    if (readIndex === undefined || readIndex >= firstChange) {
      return result(false, `${name} must be read before the first file change`);
    }
  }

  for (const stage of config.stages ?? []) {
    const productionIndex = firstIndex(spans, (span) =>
      isFileChange(span, stage.unlockProductionPathRegex),
    );
    if (productionIndex < 0) {
      return result(false, `Missing ${stage.label} production needed to unlock references`);
    }
    const greenIndex = firstIndex(
      spans,
      (span) =>
        isCommand(span, stage.unlockCommandRegex) &&
        span.attributes?.["codex.exit_code"] === 0,
      productionIndex + 1,
    );
    if (greenIndex < 0) {
      return result(false, `Missing ${stage.label} GREEN needed to unlock references`);
    }
    const nextTestIndex = firstIndex(
      spans,
      (span) => isFileChange(span, stage.nextTestPathRegex),
      greenIndex + 1,
    );
    if (nextTestIndex < 0) {
      return result(false, `Missing ${stage.nextLabel} test after reference unlock`);
    }
    for (const name of stage.references) {
      const readIndex = reads.get(name);
      if (readIndex === undefined || readIndex <= greenIndex || readIndex >= nextTestIndex) {
        return result(
          false,
          `${name} must be read after ${stage.label} GREEN and before the ${stage.nextLabel} test`,
        );
      }
    }
  }

  return result(true, "References were loaded just in time from outside to inside");
}
