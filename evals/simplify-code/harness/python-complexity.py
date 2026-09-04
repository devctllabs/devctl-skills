#!/usr/bin/env python3
"""Measure conditional-node count and maximum conditional nesting in Python source."""

from __future__ import annotations

import ast
import json
import sys
from pathlib import Path


DECISION_NODES = (ast.If, ast.IfExp)


def measure(node: ast.AST, nesting: int = 0) -> tuple[int, int]:
    is_decision = isinstance(node, DECISION_NODES)
    current_nesting = nesting + 1 if is_decision else nesting
    count = 1 if is_decision else 0
    maximum = current_nesting if is_decision else 0
    for child in ast.iter_child_nodes(node):
        child_count, child_maximum = measure(child, current_nesting)
        count += child_count
        maximum = max(maximum, child_maximum)
    return count, maximum


def main() -> int:
    if len(sys.argv) != 2:
        raise SystemExit("usage: python-complexity.py <python-file>")
    source = Path(sys.argv[1]).read_text(encoding="utf-8")
    count, maximum = measure(ast.parse(source))
    print(json.dumps({"decision_nodes": count, "max_nesting": maximum}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
