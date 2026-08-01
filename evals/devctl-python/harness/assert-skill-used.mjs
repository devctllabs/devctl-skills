export default function assertSkillUsed(_output, context) {
  const skillName = context.config?.skillName;
  if (!skillName) {
    return { pass: false, score: 0, reason: "skillName is required" };
  }
  const spans = context.trace?.spans ?? [];
  const suffix = `.agents/skills/${skillName}/SKILL.md`;
  const observed = spans.some((span) => {
    const command = span.attributes?.["codex.command"];
    return typeof command === "string" && command.includes(suffix);
  });
  return {
    pass: observed,
    score: observed ? 1 : 0,
    reason: observed
      ? `Observed ${skillName} SKILL.md read in command trace`
      : `Missing ${skillName} SKILL.md read in command trace`,
  };
}
