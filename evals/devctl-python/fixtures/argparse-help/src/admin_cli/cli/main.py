import argparse
import sys
from collections.abc import Sequence
from typing import Protocol

from admin_cli.cli.commands.agent import register_agent_commands
from admin_cli.cli.commands.package import register_package_commands


class _Handler(Protocol):
    def __call__(self, args: argparse.Namespace, deps: object) -> int: ...


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="admin")
    groups = parser.add_subparsers(required=True)
    register_package_commands(groups.add_parser("package"))
    register_agent_commands(groups.add_parser("agent"))
    return parser


def main(argv: Sequence[str] | None = None, deps: object | None = None) -> int:
    args = build_parser().parse_args(argv)
    if deps is None:
        raise RuntimeError("deps are required in this fixture")
    handler: _Handler = args.handler
    try:
        return handler(args, deps)
    except ValueError as error:
        print(f"admin: {error}", file=sys.stderr)
        return 1
