import argparse
import sys
from collections.abc import Sequence
from typing import Protocol


class PackageOperations(Protocol):
    def install(self, name: str) -> str: ...

    def list(self) -> tuple[str, ...]: ...


class AgentOperations(Protocol):
    def install(self, name: str) -> str: ...

    def list(self) -> tuple[str, ...]: ...


class AppDeps(Protocol):
    @property
    def packages(self) -> PackageOperations: ...

    @property
    def agents(self) -> AgentOperations: ...


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="admin")
    groups = parser.add_subparsers(dest="group", required=True)

    package = groups.add_parser("package")
    package_commands = package.add_subparsers(dest="command", required=True)
    package_install = package_commands.add_parser("install")
    package_install.add_argument("name")
    package_commands.add_parser("list")

    agent = groups.add_parser("agent")
    agent_commands = agent.add_subparsers(dest="command", required=True)
    agent_install = agent_commands.add_parser("install")
    agent_install.add_argument("name")
    agent_commands.add_parser("list")
    return parser


def main(argv: Sequence[str] | None = None, deps: AppDeps | None = None) -> int:
    if deps is None:
        raise RuntimeError("deps are required in this fixture")
    args = build_parser().parse_args(argv)
    try:
        if args.group == "package" and args.command == "install":
            print(deps.packages.install(args.name))
        elif args.group == "package" and args.command == "list":
            for name in deps.packages.list():
                print(name)
        elif args.group == "agent" and args.command == "install":
            print(deps.agents.install(args.name))
        elif args.group == "agent" and args.command == "list":
            for name in deps.agents.list():
                print(name)
        else:
            raise AssertionError("unreachable command")
        return 0
    except ValueError as exc:
        print(f"admin: {exc}", file=sys.stderr)
        return 1
